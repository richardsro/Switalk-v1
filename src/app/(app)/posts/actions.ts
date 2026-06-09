"use server";

import { revalidatePath } from "next/cache";
import { startOfMonth } from "date-fns";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { canSchedulePost } from "@/lib/plans";
import { getEffectivePlan, TRIAL_EXPIRED_ERROR } from "@/lib/billing";

const postSchema = z.object({
  content: z.string().min(1).max(5000),
  channelIds: z.array(z.string().uuid()).min(1),
  scheduledFor: z.string().datetime(),
  mediaUrls: z.array(z.string().url()).default([]),
});

export async function schedulePost(input: {
  content: string;
  channelIds: string[];
  scheduledFor: string;
  mediaUrls?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid post" };

  // Allow small clock skew, but reject genuinely past schedules — Inngest
  // would otherwise fire them immediately, surprising the user.
  if (new Date(parsed.data.scheduledFor).getTime() < Date.now() - 2 * 60_000) {
    return { ok: false, error: "That time is in the past — pick a future time" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Plan gating: Lite = 10 posts/month; expired trial = blocked
  const { plan, trialExpired } = await getEffectivePlan(supabase, user.id);
  if (trialExpired) return { ok: false, error: TRIAL_EXPIRED_ERROR };

  const { count } = await supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .gte("created_at", startOfMonth(new Date()).toISOString());

  if (!canSchedulePost(plan, count ?? 0)) {
    return {
      ok: false,
      error: "You've reached this month's post limit — upgrade to Pro for unlimited posts.",
    };
  }

  // Validate the selected channels: RLS scopes this to the user's own
  // channels, so a count mismatch means a forged/foreign channel id.
  const { data: channels, error: channelsError } = await supabase
    .from("channels")
    .select("id, type")
    .in("id", parsed.data.channelIds);
  if (channelsError || (channels ?? []).length !== parsed.data.channelIds.length) {
    return { ok: false, error: "One of the selected channels isn't available" };
  }
  if (
    (channels ?? []).some((c) => c.type === "instagram") &&
    parsed.data.mediaUrls.length === 0
  ) {
    return { ok: false, error: "Instagram posts need at least one image" };
  }

  const { data: post, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      content: parsed.data.content,
      channel_ids: parsed.data.channelIds,
      media_urls: parsed.data.mediaUrls,
      scheduled_for: parsed.data.scheduledFor,
    })
    .select("id")
    .single();

  if (error || !post) return { ok: false, error: "Could not save post" };

  const { ids } = await inngest.send({
    name: "post/schedule",
    data: { postId: post.id, scheduledFor: parsed.data.scheduledFor },
  });

  const { error: jobIdError } = await supabase
    .from("scheduled_posts")
    .update({ inngest_job_id: ids[0] ?? null })
    .eq("id", post.id);
  if (jobIdError) {
    // Job is queued and will run; only the audit reference is missing.
    console.error("schedulePost: failed to store inngest_job_id", jobIdError);
  }

  revalidatePath("/posts");
  return { ok: true };
}

export async function cancelPost(postId: string) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("scheduled_posts")
    .select("id, status")
    .eq("id", postId)
    .single();
  if (!post || post.status !== "pending") return;

  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "cancelled" })
    .eq("id", postId);
  if (error) {
    console.error("cancelPost: status update failed", error);
    return;
  }
  await inngest.send({ name: "post/cancel", data: { postId } });
  revalidatePath("/posts");
}
