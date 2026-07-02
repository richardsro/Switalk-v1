"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addHours, format, isToday, setHours, setMinutes } from "date-fns";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setReminder, cancelReminder } from "../actions";

interface PendingReminder {
  id: string;
  remind_at: string;
}

export function ReminderMenu({
  conversationId,
  pending,
}: {
  conversationId: string;
  pending: PendingReminder | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function schedule(when: Date) {
    setBusy(true);
    setError(null);
    const result = await setReminder({
      conversationId,
      remindAt: when.toISOString(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not set reminder");
      return;
    }
    setOpen(false);
    setCustom("");
    router.refresh();
  }

  async function handleCancel() {
    if (!pending) return;
    setBusy(true);
    await cancelReminder(pending.id);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  const tomorrow9 = setMinutes(setHours(addHours(new Date(), 24), 9), 0);
  const remindDate = pending ? new Date(pending.remind_at) : null;

  return (
    <div className="relative ml-auto">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={pending ? "Reminder set" : "Remind me"}
        onClick={() => setOpen((v) => !v)}
      >
        {pending ? (
          <BellRing className="h-5 w-5 text-brand-500" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
          {pending && remindDate ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-600">
                Reminds{" "}
                <span className="font-semibold text-gray-900">
                  {isToday(remindDate)
                    ? format(remindDate, "HH:mm 'today'")
                    : format(remindDate, "d MMM, HH:mm")}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={handleCancel}
              >
                Cancel reminder
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Remind me
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => schedule(addHours(new Date(), 3))}
              >
                In 3 hours
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => schedule(tomorrow9)}
              >
                Tomorrow 9am
              </Button>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom) schedule(new Date(custom));
                }}
              >
                <Input
                  type="datetime-local"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" disabled={busy || !custom}>
                  Set custom time
                </Button>
              </form>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
