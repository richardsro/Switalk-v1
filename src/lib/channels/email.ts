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
    // Resend only accepts senders on domains we've verified, so send from
    // our own identity and set Reply-To to the user's real address — the
    // recipient's reply then forwards back into Switalk.
    const from =
      (channel.metadata?.from_address as string | undefined) ??
      process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM is not configured");
    const replyTo = channel.external_id ?? undefined;

    const { data, error } = await resend.emails.send({
      from,
      to: recipientExternalId,
      replyTo,
      subject:
        (channel.metadata?.default_subject as string | undefined) ??
        "Re: your message",
      text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    return { externalId: data?.id ?? null };
  },
};
