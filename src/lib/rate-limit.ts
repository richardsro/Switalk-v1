import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelType } from "@/lib/types";

/**
 * Meta Graph API rate-limit protection. Meta allows roughly 200 calls per
 * user per hour; we count every outbound call (Instagram, Facebook,
 * WhatsApp share the budget) and stop firing at 180, queueing the request
 * for the next window instead of burning the real limit.
 */
export const META_HOURLY_LIMIT = 200;
export const META_QUEUE_THRESHOLD = 180;

export const META_CHANNELS: ChannelType[] = [
  "instagram",
  "facebook",
  "whatsapp",
];

export function isMetaChannel(type: ChannelType): boolean {
  return META_CHANNELS.includes(type);
}

/** Start of the next hourly window — when a queued call may fire. */
export function nextWindowStart(now: Date = new Date()): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export interface UsageDecision {
  allowed: boolean;
  count: number;
  resetAt: Date;
}

/**
 * Record one Meta API call for this user and decide whether to fire it now.
 * Fails OPEN: if the counter itself errors we allow the call rather than
 * silently dropping user messages — Meta's own limiter is the backstop.
 */
export async function trackMetaCall(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageDecision> {
  const { data, error } = await supabase.rpc("increment_api_usage", {
    p_user_id: userId,
    p_provider: "meta",
  });

  const resetAt = nextWindowStart();

  if (error || typeof data !== "number") {
    console.error("rate-limit: increment_api_usage failed", error);
    return { allowed: true, count: 0, resetAt };
  }

  return { allowed: data <= META_QUEUE_THRESHOLD, count: data, resetAt };
}
