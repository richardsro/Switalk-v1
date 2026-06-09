"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendReply } from "../actions";
import type { Message } from "@/lib/types";

export function ConversationThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live updates: new inbound messages appear instantly via Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);

    const result = await sendReply({ conversationId, content });
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to send");
      return;
    }
    setDraft("");
    // Optimistic append; realtime INSERT is deduped by id
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user_id: "",
        channel_id: "",
        conversation_id: conversationId,
        contact_id: null,
        external_id: null,
        direction: "outbound",
        sender_name: null,
        sender_handle: null,
        content,
        is_read: true,
        received_at: new Date().toISOString(),
        raw: null,
      },
    ]);
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex",
              m.direction === "outbound" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                m.direction === "outbound"
                  ? "rounded-br-sm bg-indigo-600 text-white"
                  : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  m.direction === "outbound"
                    ? "text-indigo-200"
                    : "text-zinc-400"
                )}
              >
                {format(new Date(m.received_at), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-zinc-200 bg-white p-3"
      >
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a reply…"
            className="min-h-[44px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button type="submit" disabled={sending || !draft.trim()}>
            {sending ? "…" : "Send"}
          </Button>
        </div>
      </form>
    </>
  );
}
