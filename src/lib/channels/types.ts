import type { Channel } from "@/lib/types";

/**
 * Every platform integration implements this adapter interface.
 * Inbound messages arrive via webhooks (src/app/api/webhooks/*) and are
 * normalised into the `messages` table; these adapters cover outbound.
 */
export interface ChannelAdapter {
  /** Send a reply within an existing conversation. */
  sendMessage(
    channel: Channel,
    recipientExternalId: string,
    text: string
  ): Promise<{ externalId: string | null }>;

  /** Publish a feed post (auto-poster). Not all channels support this. */
  publishPost?(
    channel: Channel,
    content: string,
    mediaUrls: string[]
  ): Promise<{ externalId: string | null }>;
}

export interface NormalizedInboundMessage {
  channelExternalId: string; // which connected channel this belongs to
  conversationExternalId: string; // platform thread / sender id
  messageExternalId: string | null;
  senderName: string | null;
  senderHandle: string | null;
  content: string;
  receivedAt: Date;
  raw: unknown;
}
