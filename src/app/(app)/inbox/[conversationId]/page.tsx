import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChannelIcon, CHANNEL_LABELS } from "@/components/channel-icon";
import { ConversationThread } from "./thread";
import { markConversationRead } from "../actions";
import type { Channel, Contact, Message } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const supabase = createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, channels(*), contacts(*)")
    .eq("id", params.conversationId)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .order("received_at", { ascending: true })
    .limit(200);

  const channel = conversation.channels as Channel;
  const contact = conversation.contacts as Contact | null;

  if (conversation.unread_count > 0) {
    await markConversationRead(conversation.id);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col md:h-screen">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/inbox" className="text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <ChannelIcon type={channel.type} />
        </div>
        <div>
          <p className="font-semibold leading-tight">
            {contact?.name ?? "Unknown"}
          </p>
          <p className="text-xs text-zinc-500">
            {CHANNEL_LABELS[channel.type]} · {channel.name}
          </p>
        </div>
      </header>

      <ConversationThread
        conversationId={conversation.id}
        initialMessages={(messages ?? []) as Message[]}
      />
    </div>
  );
}
