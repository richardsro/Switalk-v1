import { createAdminClient } from "@/lib/supabase/admin";
import type { ChannelType } from "@/lib/types";
import type { NormalizedInboundMessage } from "./types";

/**
 * Persist a normalised inbound message: resolve the channel, upsert the
 * contact and conversation, insert the message. Called from webhook routes
 * with the service-role client (webhooks carry no user session).
 *
 * Idempotent on (channel_id, external_id) so webhook retries are safe.
 */
export async function ingestInboundMessage(
  channelType: ChannelType,
  msg: NormalizedInboundMessage
): Promise<void> {
  const supabase = createAdminClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("id, user_id")
    .eq("type", channelType)
    .eq("external_id", msg.channelExternalId)
    .single();

  if (!channel) {
    // Webhook for a channel nobody has connected — ack and drop.
    console.warn(
      `ingest: no ${channelType} channel for external_id=${msg.channelExternalId}`
    );
    return;
  }

  // Find or create the conversation for this sender on this channel
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("channel_id", channel.id)
    .eq("external_id", msg.conversationExternalId)
    .maybeSingle();

  if (!conversation) {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: channel.user_id,
        name: msg.senderName ?? msg.senderHandle ?? "Unknown",
        handles: msg.senderHandle ? { [channelType]: msg.senderHandle } : {},
        last_seen_at: msg.receivedAt.toISOString(),
      })
      .select("id")
      .single();
    // Throw so the platform retries the webhook — ingest is idempotent.
    if (contactError) throw contactError;

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        user_id: channel.user_id,
        channel_id: channel.id,
        contact_id: contact?.id ?? null,
        external_id: msg.conversationExternalId,
      })
      .select("id, contact_id")
      .single();
    if (error) throw error;
    conversation = created;
  }

  const { error: msgError } = await supabase.from("messages").insert({
    user_id: channel.user_id,
    channel_id: channel.id,
    conversation_id: conversation.id,
    contact_id: conversation.contact_id,
    external_id: msg.messageExternalId,
    direction: "inbound",
    sender_name: msg.senderName,
    sender_handle: msg.senderHandle,
    content: msg.content,
    received_at: msg.receivedAt.toISOString(),
    raw: msg.raw,
  });

  // 23505 = duplicate external_id (webhook retry) — already ingested
  if (msgError && msgError.code !== "23505") throw msgError;
  if (msgError?.code === "23505") return;

  // The message is stored at this point; denormalised metadata failures are
  // logged (not thrown) so the platform doesn't redeliver a stored message.
  const { error: convUpdateError } = await supabase
    .from("conversations")
    .update({
      last_message_at: msg.receivedAt.toISOString(),
      last_message_preview: msg.content.slice(0, 140),
      unread_count: (await unreadCount(supabase, conversation.id)) ?? 1,
      status: "open",
    })
    .eq("id", conversation.id);
  if (convUpdateError) {
    console.error("ingest: conversation metadata update failed", convUpdateError);
  }

  if (conversation.contact_id) {
    const { error: contactUpdateError } = await supabase
      .from("contacts")
      .update({ last_seen_at: msg.receivedAt.toISOString() })
      .eq("id", conversation.contact_id);
    if (contactUpdateError) {
      console.error("ingest: contact last_seen update failed", contactUpdateError);
    }
  }
}

async function unreadCount(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string
) {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .eq("direction", "inbound");
  return count;
}
