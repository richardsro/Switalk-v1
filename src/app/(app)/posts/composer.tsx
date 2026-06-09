"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMinutes, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelIcon, CHANNEL_LABELS } from "@/components/channel-icon";
import { cn } from "@/lib/utils";
import { schedulePost } from "./actions";
import type { Channel } from "@/lib/types";

export function Composer({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [when, setWhen] = useState(
    format(addMinutes(new Date(), 60), "yyyy-MM-dd'T'HH:mm")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await schedulePost({
      content: content.trim(),
      channelIds: selected,
      scheduledFor: new Date(when).toISOString(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    setContent("");
    setSelected([]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New post</CardTitle>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Connect a posting channel (Facebook or Instagram) in Settings →
            Channels to start scheduling.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              rows={4}
              required
            />
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggle(ch.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                    selected.includes(ch.id)
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <ChannelIcon type={ch.type} className="h-3.5 w-3.5" />
                  {ch.name || CHANNEL_LABELS[ch.type]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="sm:max-w-[220px]"
                required
              />
              <Button
                type="submit"
                disabled={busy || !content.trim() || selected.length === 0}
              >
                {busy ? "Scheduling…" : "Schedule post"}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
