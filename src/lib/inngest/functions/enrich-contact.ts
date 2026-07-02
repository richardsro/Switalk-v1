import { RetryAfterError } from "inngest";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { graphGet } from "@/lib/channels/meta";
import { trackMetaCall } from "@/lib/rate-limit";
import type { StepTools } from "./publish-post";

export interface EnrichContactEvent {
  data: {
    /** "facebook" (Messenger PSID) or "instagram" (IGSID). */
    channelType: "facebook" | "instagram";
    channelExternalId: string;
    senderId: string;
    contactId: string;
  };
}

/**
 * Fills in the real sender name for Messenger/IG contacts (webhooks only
 * carry a numeric id). Deferred to a job so the webhook returns 200 fast
 * and the Graph call goes through the shared hourly budget.
 *
 * Meta withholds profile fields for many European users — a lookup that
 * returns nothing is normal and must end the run gracefully.
 */
export async function enrichContactHandler({
  event,
  step,
}: {
  event: EnrichContactEvent;
  step: StepTools;
}) {
  const { channelType, channelExternalId, senderId, contactId } = event.data;

  return step.run("enrich", async () => {
    const supabase = createAdminClient();

    const [{ data: channel }, { data: contact }] = await Promise.all([
      supabase
        .from("channels")
        .select("user_id, access_token")
        .eq("type", channelType)
        .eq("external_id", channelExternalId)
        .single(),
      supabase.from("contacts").select("name, handles").eq("id", contactId).single(),
    ]);
    if (!channel?.access_token || !contact) {
      return { enriched: false, reason: "channel or contact missing" };
    }

    // Idempotency: only touch contacts that still carry the placeholder
    // name (ingest falls back to the numeric sender handle).
    if (contact.name !== "Unknown" && contact.name !== senderId) {
      return { enriched: false, reason: "already named" };
    }

    const usage = await trackMetaCall(supabase, channel.user_id);
    if (!usage.allowed) {
      throw new RetryAfterError(
        `Meta API budget reached (${usage.count} calls this hour) — queued`,
        usage.resetAt
      );
    }

    let name: string | null = null;
    let handle: string | null = null;
    try {
      if (channelType === "facebook") {
        const profile = await graphGet(
          `${senderId}?fields=first_name,last_name`,
          channel.access_token
        );
        name =
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          null;
      } else {
        const profile = await graphGet(
          `${senderId}?fields=name,username`,
          channel.access_token
        );
        name = profile.name ?? (profile.username ? `@${profile.username}` : null);
        handle = profile.username ? `@${profile.username}` : null;
      }
    } catch (err) {
      // 4xx = profile unavailable (privacy/EU restrictions) — not an error
      // worth retry-looping on.
      console.warn("enrich-contact: profile lookup failed", err);
      return { enriched: false, reason: "profile unavailable" };
    }

    if (!name) return { enriched: false, reason: "no profile fields returned" };

    const { error } = await supabase
      .from("contacts")
      .update({
        name,
        handles: {
          ...((contact.handles as Record<string, string>) ?? {}),
          ...(handle ? { [channelType]: handle } : {}),
        },
      })
      .eq("id", contactId);
    if (error) throw new Error(`enrich update failed: ${error.message}`);

    return { enriched: true, name };
  });
}

export const enrichContact = inngest.createFunction(
  { id: "enrich-contact", retries: 3, triggers: [{ event: "contact/enrich" }] },
  async ({ event, step }) =>
    enrichContactHandler({
      event: event as unknown as EnrichContactEvent,
      step: step as unknown as StepTools,
    })
);
