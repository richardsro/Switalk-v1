import { Resend } from "resend";
import type { ChannelAdapter } from "./types";

/**
 * Outbound email via Resend (free tier: 3k emails/mo).
 * Inbound email lands via the Resend inbound webhook
 * (src/app/api/webhooks/email) — full IMAP polling is a phase-2 upgrade.
 */
export const emailAdapter: ChannelAdapter = {
  async sendMessage(channel, recipientExternalId, text) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from =
      (channel.metadata?.from_address as string | undefined) ??
      channel.external_id;
    if (!from) throw new Error(`Channel ${channel.id} has no from address`);

    const { data, error } = await resend.emails.send({
      from,
      to: recipientExternalId,
      subject:
        (channel.metadata?.default_subject as string | undefined) ??
        "Re: your message",
      text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    return { externalId: data?.id ?? null };
  },
};
