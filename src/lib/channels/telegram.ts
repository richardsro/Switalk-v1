import type { ChannelAdapter } from "./types";

/**
 * Telegram Bot API. The user connects by creating a bot via @BotFather and
 * pasting the bot token; `channel.access_token` is that token and
 * `channel.external_id` is the bot id.
 */
export const telegramAdapter: ChannelAdapter = {
  async sendMessage(channel, recipientExternalId, text) {
    if (!channel.access_token) {
      throw new Error(`Channel ${channel.id} has no bot token`);
    }
    const res = await fetch(
      `https://api.telegram.org/bot${channel.access_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: recipientExternalId, text }),
      }
    );
    const json = await res.json();
    if (!json.ok) {
      throw new Error(`Telegram API error: ${json.description}`);
    }
    return { externalId: String(json.result?.message_id ?? "") || null };
  },
};
