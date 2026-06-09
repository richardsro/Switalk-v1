"use server";

import { revalidatePath } from "next/cache";
import { startOfMonth } from "date-fns";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { canSchedulePost } from "@/lib/plans";
import type { Plan } from "@/lib/types";

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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Plan gating: Lite = 10 posts/month
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  const plan: Plan = (sub?.plan as Plan) ?? "trial";

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

  await supabase
    .from("scheduled_posts")
    .update({ inngest_job_id: ids[0] ?? null })
    .eq("id", post.id);

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

  await supabase
    .from("scheduled_posts")
    .update({ status: "cancelled" })
    .eq("id", postId);
  await inngest.send({ name: "post/cancel", data: { postId } });
  revalidatePath("/posts");
}
