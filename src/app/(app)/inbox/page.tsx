import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channel-icon";
import type { ChannelType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ConversationRow {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  channels: { type: ChannelType; name: string } | null;
  contacts: { name: string } | null;
}

export default async function InboxPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, last_message_preview, unread_count, channels(type, name), contacts(name)"
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const conversations = (data ?? []) as unknown as ConversationRow[];

  return (
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Inbox</h1>
        <p className="text-sm text-zinc-500">
          Every conversation, every channel, one feed.
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <p className="font-medium text-zinc-700">No conversations yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Connect a channel in{" "}
            <Link href="/settings/channels" className="text-indigo-600 underline">
              Settings → Channels
            </Link>{" "}
            and messages will appear here in real time.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/inbox/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  {c.channels && <ChannelIcon type={c.channels.type} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">
                      {c.contacts?.name ?? "Unknown"}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {c.last_message_at &&
                        formatDistanceToNow(new Date(c.last_message_at), {
                          addSuffix: true,
                        })}
                    </span>
                  </div>
                  <p className="truncate text-sm text-zinc-500">
                    {c.last_message_preview ?? "—"}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <Badge>{c.unread_count}</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
