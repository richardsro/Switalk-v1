"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChannelIcon, CHANNEL_LABELS } from "@/components/channel-icon";
import {
  connectEmail,
  connectTelegram,
  createWebchat,
  removeChannel,
} from "./actions";
import type { Channel } from "@/lib/types";

function embedSnippet(appUrl: string, widgetId: string) {
  return `<script src="${appUrl}/widget.js" data-widget-id="${widgetId}" async></script>`;
}

export function ChannelManager({
  channels,
  flashError,
  flashConnected,
}: {
  channels: Channel[];
  flashError?: string;
  flashConnected?: string;
}) {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [webchatName, setWebchatName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(flashError ?? null);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webchatChannels = channels.filter((c) => c.type === "webchat");
  // Operator-configured inbound address that forwards to /api/webhooks/email.
  const forwardAddress = process.env.NEXT_PUBLIC_EMAIL_FORWARD_ADDRESS;

  async function handleWebchat(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createWebchat(webchatName);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to create widget");
      return;
    }
    setWebchatName("");
    router.refresh();
  }

  async function copySnippet(widgetId: string) {
    await navigator.clipboard.writeText(embedSnippet(appUrl, widgetId));
    setCopiedId(widgetId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await connectEmail(emailAddress);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to connect");
      return;
    }
    setEmailAddress("");
    router.refresh();
  }

  async function handleTelegram(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await connectTelegram(botToken);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to connect");
      return;
    }
    setBotToken("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {flashConnected && (
        <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
          {CHANNEL_LABELS[flashConnected as Channel["type"]] ?? flashConnected}{" "}
          connected 🎉
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <ChannelIcon type={ch.type} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {ch.name || CHANNEL_LABELS[ch.type]}
                  </p>
                  <p className="text-xs text-gray-500">{CHANNEL_LABELS[ch.type]}</p>
                </div>
                <Badge color={ch.status === "active" ? "green" : "red"}>
                  {ch.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await removeChannel(ch.id);
                    router.refresh();
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meta — Facebook, Instagram & WhatsApp</CardTitle>
          <CardDescription>
            One login connects your Facebook Page, linked Instagram account and
            WhatsApp Business number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => (window.location.href = "/api/channels/meta/connect")}>
            Connect with Facebook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Telegram</CardTitle>
          <CardDescription>
            Create a bot with @BotFather, then paste the token here. Takes ~2
            minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTelegram} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABC-DEF…"
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webchat widget</CardTitle>
          <CardDescription>
            Live chat on your own website — create a widget, paste one line of
            HTML, and visitor messages land in your inbox. Replies appear in
            their chat instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleWebchat} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={webchatName}
              onChange={(e) => setWebchatName(e.target.value)}
              placeholder="Widget name (e.g. My website)"
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create widget"}
            </Button>
          </form>

          {webchatChannels.map((ch) => (
            <div key={ch.id} className="rounded-lg bg-gray-50 p-3">
              <p className="mb-1 text-sm font-medium">{ch.name}</p>
              <code className="block overflow-x-auto whitespace-nowrap rounded bg-gray-950 p-2 text-xs text-gray-100">
                {embedSnippet(appUrl, ch.external_id ?? "")}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => copySnippet(ch.external_id ?? "")}
              >
                {copiedId === ch.external_id ? "Copied!" : "Copy embed code"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Connect your own address: messages forwarded from it appear in
            your inbox, and your replies go out by email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form onSubmit={handleEmail} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="you@yourbusiness.com"
              required
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
          </form>
          {forwardAddress && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-500">
              <li>
                Set up auto-forwarding from your mailbox (Gmail: Settings →
                Forwarding) to{" "}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-900">
                  {forwardAddress}
                </code>
                .
              </li>
              <li>
                The forwarding-confirmation email will show up in your Switalk
                inbox — open it and confirm.
              </li>
              <li>Done — new mail lands here from then on.</li>
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
