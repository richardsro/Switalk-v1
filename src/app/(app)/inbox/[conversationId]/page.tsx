import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ChannelIcon,
  CHANNEL_DOT_CLASS,
  CHANNEL_LABELS,
} from "@/components/channel-icon";
import { ConversationThread } from "./thread";
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

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col md:h-screen">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/inbox" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white">
          <ChannelIcon type={channel.type} />
        </div>
        <div>
          <p className="font-bold leading-tight text-gray-900">
            {contact?.name ?? "Unknown"}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className={`h-2 w-2 rounded-full ${CHANNEL_DOT_CLASS[channel.type]}`}
            />
            <span className="font-semibold">{CHANNEL_LABELS[channel.type]}</span>
            {" · "}
            {channel.name}
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
