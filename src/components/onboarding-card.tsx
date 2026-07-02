"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { dismissOnboarding } from "@/app/(app)/inbox/actions";

const STEPS = [
  {
    title: "Connect your first channel",
    body: "Telegram takes ~2 minutes; webchat is one line of HTML.",
  },
  {
    title: "Send yourself a test message",
    body: "Message your bot, or open a page with your webchat widget.",
  },
  {
    title: "Reply from your inbox",
    body: "That's it — every channel, one feed, nothing missed.",
  },
];

/** First-run checklist shown in the inbox until a channel is connected. */
export function OnboardingCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDismiss() {
    setBusy(true);
    await dismissOnboarding();
    router.refresh();
  }

  return (
    <div className="m-4 rounded-2xl border-2 border-brand-500 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
        Get set up in 5 minutes
      </p>
      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map(({ title, body }, i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-center gap-3">
        <Link href="/settings/channels">
          <Button>Connect a channel</Button>
        </Link>
        <Button variant="ghost" size="sm" disabled={busy} onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
