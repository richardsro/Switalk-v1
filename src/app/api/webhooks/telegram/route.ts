import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage } from "@/lib/channels/ingest";

/**
 * Telegram bot webhook. Registered per-bot via setWebhook with
 * ?secret_token=TELEGRAM_WEBHOOK_SECRET and ?bot=<bot_id> in the URL so a
 * single route serves every connected bot.
 */
export async function POST(req: NextRequest) {
  if (
    req.headers.get("x-telegram-bot-api-secret-token") !==
    process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const botId = req.nextUrl.searchParams.get("bot");
  if (!botId) return new NextResponse("Missing bot id", { status: 400 });

  const update = await req.json();
  const message = update.message;

  if (message?.text) {
    try {
      const from = message.from ?? {};
      await ingestInboundMessage("telegram", {
        channelExternalId: botId,
        conversationExternalId: String(message.chat.id),
        messageExternalId: `${message.chat.id}:${message.message_id}`,
        senderName:
          [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
        senderHandle: from.username ? `@${from.username}` : null,
        content: message.text,
        receivedAt: new Date(message.date * 1000),
        raw: update,
      });
    } catch (err) {
      console.error("telegram webhook ingest error", err);
    }
  }

  return NextResponse.json({ ok: true });
}
