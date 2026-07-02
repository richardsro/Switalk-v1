import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHANNEL_DOT_CLASS, CHANNEL_LABELS } from "@/components/channel-icon";
import { OnboardingCard } from "@/components/onboarding-card";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ConversationRow {
  id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  reminder_due: boolean;
  channels: { type: ChannelType; name: string } | null;
  contacts: { name: string } | null;
}

function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function InboxPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { count: channelCount }, { data: profile }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select(
          "id, last_message_at, last_message_preview, unread_count, reminder_due, channels(type, name), contacts(name)"
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100),
      supabase.from("channels").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
    ]);

  const conversations = (data ?? []) as unknown as ConversationRow[];
  const showOnboarding = (channelCount ?? 0) === 0 && !profile?.onboarded_at;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
          Inbox
        </h1>
        <p className="text-sm text-gray-500">
          Every conversation, every channel, one feed.
        </p>
      </header>

      {showOnboarding && <OnboardingCard />}

      {conversations.length === 0 ? (
        showOnboarding ? null : (
          <div className="px-4 py-16 text-center">
            <p className="font-semibold text-gray-900">No conversations yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Messages from your connected channels appear here in real time.
            </p>
            <Link href="/settings/channels" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Manage channels
              </Button>
            </Link>
          </div>
        )
      ) : (
        <ul className="divide-y divide-gray-100 bg-white md:my-4 md:rounded-2xl md:border md:border-gray-200 md:shadow-sm">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/inbox/${c.id}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {initials(c.contacts?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-gray-900",
                        c.unread_count > 0 ? "font-bold" : "font-semibold"
                      )}
                    >
                      {c.contacts?.name ?? "Unknown"}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {c.reminder_due && <Badge>Follow up</Badge>}
                      {c.unread_count > 0 && <Badge>{c.unread_count}</Badge>}
                    </span>
                  </div>
                  {c.channels && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          CHANNEL_DOT_CLASS[c.channels.type]
                        )}
                      />
                      <span className="font-semibold text-gray-500">
                        {CHANNEL_LABELS[c.channels.type]}
                      </span>
                      {c.last_message_at && (
                        <>
                          {" · "}
                          {formatDistanceToNow(new Date(c.last_message_at), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </p>
                  )}
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-sm",
                      c.unread_count > 0 ? "text-gray-700" : "text-gray-500"
                    )}
                  >
                    {c.last_message_preview ?? "—"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
