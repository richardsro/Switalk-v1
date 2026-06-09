import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapter } from "@/lib/channels";
import type { Channel } from "@/lib/types";

/**
 * Delivers an inbox reply that was queued because the user was approaching
 * Meta's hourly API budget. The message row already exists (the sender saw
 * it appear in the thread instantly); this job only does the external send
 * once the next rate-limit window opens.
 */
export const sendQueuedMessage = inngest.createFunction(
  {
    id: "send-queued-message",
    retries: 3,
    triggers: [{ event: "message/send.queued" }],
  },
  async ({ event, step }) => {
    const { messageId, channelId, recipient, content, sendAfter } =
      event.data as {
        messageId: string;
        channelId: string;
        recipient: string;
        content: string;
        sendAfter: string;
      };

    await step.sleepUntil("wait-for-rate-limit-window", sendAfter);

    const externalId = await step.run("deliver", async () => {
      const supabase = createAdminClient();
      const { data: channel, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();
      if (error || !channel) {
        throw new Error(`queued send: channel ${channelId} not found`);
      }
      const adapter = getAdapter((channel as Channel).type);
      const result = await adapter.sendMessage(
        channel as Channel,
        recipient,
        content
      );
      return result.externalId;
    });

    await step.run("mark-delivered", async () => {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("messages")
        .update({ external_id: externalId, raw: { queued: false } })
        .eq("id", messageId);
      if (error) {
        throw new Error(`queued send: failed to mark delivered: ${error.message}`);
      }
    });

    return { delivered: true, externalId };
  }
);
