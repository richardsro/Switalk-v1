"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/channels";
import { broadcast, webchatTopic } from "@/lib/realtime";
import { inngest } from "@/lib/inngest/client";
import { isMetaChannel, trackMetaCall } from "@/lib/rate-limit";
import type { Channel, Conversation, Message } from "@/lib/types";

const replySchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export async function sendReply(input: {
  conversationId: string;
  content: string;
}): Promise<{ ok: boolean; error?: string; message?: Message }> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid message" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, channels(*)")
    .eq("id", parsed.data.conversationId)
    .single();
  if (!conversation) return { ok: false, error: "Conversation not found" };

  const channel = (conversation as Conversation & { channels: Channel })
    .channels;

  if (!conversation.external_id) {
    // Without a platform-side recipient id there is nowhere to send this.
    return { ok: false, error: "This conversation has no reply address" };
  }

  let externalId: string | null = null;
  let queuedUntil: Date | null = null;
  try {
    // Approaching Meta's hourly API budget → save the reply now, deliver
    // it via the send-queued-message job when the next window opens.
    if (isMetaChannel(channel.type)) {
      const usage = await trackMetaCall(supabase, user.id);
      if (!usage.allowed) queuedUntil = usage.resetAt;
    }

    if (queuedUntil) {
      // external send deferred — handled after the row is inserted below
    } else if (channel.type === "webchat") {
      // Delivered to the visitor's open widget via Realtime broadcast
      await broadcast(
        webchatTopic(channel.external_id!, conversation.external_id!),
        "reply",
        { content: parsed.data.content, at: new Date().toISOString() }
      );
    } else {
      const adapter = getAdapter(channel.type);
      const result = await adapter.sendMessage(
        channel,
        conversation.external_id,
        parsed.data.content
      );
      externalId = result.externalId;
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      channel_id: channel.id,
      conversation_id: conversation.id,
      contact_id: conversation.contact_id,
      external_id: externalId,
      direction: "outbound",
      content: parsed.data.content,
      is_read: true,
      raw: queuedUntil
        ? { queued: true, send_after: queuedUntil.toISOString() }
        : null,
    })
    .select("*")
    .single();
  if (insertError || !inserted) {
    return { ok: false, error: "Sent, but failed to save locally" };
  }

  if (queuedUntil) {
    await inngest.send({
      name: "message/send.queued",
      data: {
        messageId: inserted.id,
        channelId: channel.id,
        recipient: conversation.external_id,
        content: parsed.data.content,
        sendAfter: queuedUntil.toISOString(),
      },
    });
  }

  const { error: convError } = await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: parsed.data.content.slice(0, 140),
    })
    .eq("id", conversation.id);
  if (convError) {
    // Message already sent + stored; stale preview is cosmetic. Log only.
    console.error("sendReply: conversation preview update failed", convError);
  }

  revalidatePath("/inbox");
  return { ok: true, message: inserted as Message };
}

export async function markConversationRead(conversationId: string) {
  const supabase = createClient();
  const { error: msgError } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false);
  const { error: convError } = await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);
  if (msgError || convError) {
    console.error("markConversationRead failed", msgError ?? convError);
  }
  revalidatePath("/inbox");
}
