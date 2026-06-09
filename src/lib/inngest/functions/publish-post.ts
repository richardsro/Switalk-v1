import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/lib/channels";
import type { Channel, ScheduledPost } from "@/lib/types";

/**
 * Minimal step-tools surface the handler needs. Lets tests drive the
 * handler with a fake `step` without pulling in the Inngest runtime.
 */
export interface StepTools {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleepUntil(id: string, time: string | Date): Promise<void>;
}

export interface PublishPostEvent {
  data: { postId: string; scheduledFor: string };
}

/**
 * Sleeps until the scheduled time, then publishes to every selected channel.
 *
 * IMPORTANT: Inngest replays this function from the top after each step, so
 * no state may live in closure variables across steps — per-channel outcomes
 * are collected via step.run return values, which are memoized.
 */
export async function publishPostHandler({
  event,
  step,
}: {
  event: PublishPostEvent;
  step: StepTools;
}) {
  const { postId, scheduledFor } = event.data;

  await step.sleepUntil("wait-until-scheduled", scheduledFor);

  const post = await step.run("load-post", async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("id", postId)
      .single();
    if (error) throw new Error(`load-post failed: ${error.message}`);
    return data as ScheduledPost;
  });

  if (!post || post.status !== "pending") {
    return { skipped: true, reason: "post missing or no longer pending" };
  }

  await step.run("mark-publishing", async () => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", postId);
    if (error) throw new Error(`mark-publishing failed: ${error.message}`);
  });

  const results: Array<{ channelId: string; error: string | null }> = [];

  for (const channelId of post.channel_ids) {
    const result = await step.run(`publish-to-${channelId}`, async () => {
      const supabase = createAdminClient();
      const { data: channel } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();
      if (!channel) {
        return { channelId, error: "channel not found" };
      }
      try {
        const adapter = getAdapter((channel as Channel).type);
        if (!adapter.publishPost) {
          throw new Error(
            `${(channel as Channel).type} does not support feed posts`
          );
        }
        await adapter.publishPost(
          channel as Channel,
          post.content,
          post.media_urls
        );
        return { channelId, error: null };
      } catch (err) {
        return {
          channelId,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
    results.push(result);
  }

  const errors = results
    .filter((r) => r.error)
    .map((r) => `${r.channelId}: ${r.error}`);

  await step.run("finalize", async () => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("scheduled_posts")
      .update(
        errors.length === post.channel_ids.length
          ? { status: "failed", error: errors.join("; ") }
          : {
              status: "published",
              published_at: new Date().toISOString(),
              error: errors.length ? errors.join("; ") : null,
            }
      )
      .eq("id", postId);
    if (error) throw new Error(`finalize failed: ${error.message}`);
  });

  return { published: post.channel_ids.length - errors.length, errors };
}

export const publishPost = inngest.createFunction(
  {
    id: "publish-post",
    retries: 3,
    cancelOn: [
      { event: "post/cancel", if: "event.data.postId == async.data.postId" },
    ],
    triggers: [{ event: "post/schedule" }],
  },
  async ({ event, step }) =>
    publishPostHandler({
      event: event as unknown as PublishPostEvent,
      step: step as unknown as StepTools,
    })
);
