import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/lib/channels";
import type { Channel, ScheduledPost } from "@/lib/types";

/**
 * Fired when a user schedules a post. Sleeps until the scheduled time,
 * then publishes to every selected channel. Cancellable via `post/cancel`.
 */
export const publishPost = inngest.createFunction(
  {
    id: "publish-post",
    retries: 3,
    cancelOn: [
      { event: "post/cancel", if: "event.data.postId == async.data.postId" },
    ],
    triggers: [{ event: "post/schedule" }],
  },
  async ({ event, step }) => {
    const { postId, scheduledFor } = event.data as {
      postId: string;
      scheduledFor: string;
    };

    await step.sleepUntil("wait-until-scheduled", scheduledFor);

    const post = await step.run("load-post", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("id", postId)
        .single();
      return data as ScheduledPost | null;
    });

    if (!post || post.status !== "pending") {
      return { skipped: true, reason: "post missing or no longer pending" };
    }

    await step.run("mark-publishing", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("scheduled_posts")
        .update({ status: "publishing" })
        .eq("id", postId);
    });

    const errors: string[] = [];

    for (const channelId of post.channel_ids) {
      await step.run(`publish-to-${channelId}`, async () => {
        const supabase = createAdminClient();
        const { data: channel } = await supabase
          .from("channels")
          .select("*")
          .eq("id", channelId)
          .single();
        if (!channel) {
          errors.push(`channel ${channelId} not found`);
          return;
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
        } catch (err) {
          errors.push(
            `${(channel as Channel).type}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      });
    }

    await step.run("finalize", async () => {
      const supabase = createAdminClient();
      await supabase
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
    });

    return { published: post.channel_ids.length - errors.length, errors };
  }
);
