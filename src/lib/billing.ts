import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/types";

export interface EffectivePlan {
  plan: Plan;
  /** True when the user has no live subscription and the trial window is over. */
  trialExpired: boolean;
  trialEndsAt: string | null;
}

const LIVE_STATUSES = ["active", "trialing"];

/**
 * Resolve what plan a user is actually entitled to right now.
 * Server-side only — call from server actions before any quota-gated write.
 */
export async function getEffectivePlan(
  supabase: SupabaseClient,
  userId: string
): Promise<EffectivePlan> {
  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (sub && LIVE_STATUSES.includes(sub.status)) {
    return {
      plan: sub.plan as Plan,
      trialExpired: false,
      trialEndsAt: profile?.trial_ends_at ?? null,
    };
  }

  const trialEndsAt = profile?.trial_ends_at ?? null;
  const trialExpired =
    trialEndsAt !== null && new Date(trialEndsAt).getTime() < Date.now();

  return { plan: "trial", trialExpired, trialEndsAt };
}

export const TRIAL_EXPIRED_ERROR =
  "Your 14-day trial has ended — pick a plan in Settings → Billing to continue.";
