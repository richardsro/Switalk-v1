import type { Channel } from "@/lib/types";
import type { ChannelAdapter } from "./types";

// Single source of truth for the Graph API version (also used by the
// OAuth connect/callback routes).
export const META_GRAPH_VERSION = "v21.0";
export const GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

async function graphPost(path: string, token: string, body: unknown) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Meta API error (${res.status}): ${JSON.stringify(json.error ?? json)}`
    );
  }
  return json;
}

function requireToken(channel: Channel): string {
  if (!channel.access_token) {
    throw new Error(`Channel ${channel.id} has no access token`);
  }
  return channel.access_token;
}

/**
 * Facebook Messenger + Instagram DM share the Send API shape.
 * `channel.external_id` is the Facebook Page id (Messenger) or the
 * Instagram-linked Page id (Instagram messaging).
 */
export const messengerAdapter: ChannelAdapter = {
  async sendMessage(channel, recipientExternalId, text) {
    const token = requireToken(channel);
    const json = await graphPost(`${channel.external_id}/messages`, token, {
      recipient: { id: recipientExternalId },
      message: { text },
      messaging_type: "RESPONSE",
    });
    return { externalId: json.message_id ?? null };
  },

  async publishPost(channel, content, mediaUrls) {
    const token = requireToken(channel);
    if (mediaUrls.length > 0) {
      // Photo post: Facebook fetches the image from the public URL
      const json = await graphPost(`${channel.external_id}/photos`, token, {
        url: mediaUrls[0],
        message: content,
      });
      return { externalId: json.post_id ?? json.id ?? null };
    }
    const json = await graphPost(`${channel.external_id}/feed`, token, {
      message: content,
    });
    return { externalId: json.id ?? null };
  },
};

export const instagramAdapter: ChannelAdapter = {
  async sendMessage(channel, recipientExternalId, text) {
    const token = requireToken(channel);
    const json = await graphPost(`${channel.external_id}/messages`, token, {
      recipient: { id: recipientExternalId },
      message: { text },
    });
    return { externalId: json.message_id ?? null };
  },

  async publishPost(channel, content, mediaUrls) {
    const token = requireToken(channel);
    const igUserId = channel.metadata?.ig_user_id as string | undefined;
    if (!igUserId) throw new Error("Channel missing metadata.ig_user_id");
    if (mediaUrls.length === 0) {
      throw new Error("Instagram posts require at least one image");
    }
    // Two-step container flow: create media container, then publish it
    const container = await graphPost(`${igUserId}/media`, token, {
      image_url: mediaUrls[0],
      caption: content,
    });
    const published = await graphPost(`${igUserId}/media_publish`, token, {
      creation_id: container.id,
    });
    return { externalId: published.id ?? null };
  },
};

/**
 * WhatsApp Cloud API. `channel.external_id` is the phone number id.
 */
export const whatsappAdapter: ChannelAdapter = {
  async sendMessage(channel, recipientExternalId, text) {
    const token = requireToken(channel);
    const json = await graphPost(`${channel.external_id}/messages`, token, {
      messaging_product: "whatsapp",
      to: recipientExternalId,
      type: "text",
      text: { body: text },
    });
    return { externalId: json.messages?.[0]?.id ?? null };
  },
};
