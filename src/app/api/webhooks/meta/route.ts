import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage } from "@/lib/channels/ingest";
import type { ChannelType } from "@/lib/types";

/**
 * One Meta webhook endpoint for all three products:
 *  - object: "page"      → Facebook Messenger
 *  - object: "instagram" → Instagram DM
 *  - object: "whatsapp_business_account" → WhatsApp Cloud API
 */

// Webhook verification handshake
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === process.env.META_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(req.headers.get("x-hub-signature-256"), rawBody)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  try {
    if (body.object === "page" || body.object === "instagram") {
      const channelType: ChannelType =
        body.object === "page" ? "facebook" : "instagram";
      for (const entry of body.entry ?? []) {
        for (const event of entry.messaging ?? []) {
          if (!event.message?.text || event.message.is_echo) continue;
          await ingestInboundMessage(channelType, {
            channelExternalId: String(entry.id),
            conversationExternalId: String(event.sender.id),
            messageExternalId: event.message.mid ?? null,
            senderName: null, // enriched later via Graph profile lookup
            senderHandle: String(event.sender.id),
            content: event.message.text,
            receivedAt: new Date(event.timestamp ?? Date.now()),
            raw: event,
          });
        }
      }
    } else if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (change.field !== "messages" || !value?.messages) continue;
          for (const message of value.messages) {
            if (message.type !== "text") continue; // media: phase 2
            const profileName =
              value.contacts?.find(
                (c: { wa_id: string }) => c.wa_id === message.from
              )?.profile?.name ?? null;
            await ingestInboundMessage("whatsapp", {
              channelExternalId: String(value.metadata.phone_number_id),
              conversationExternalId: String(message.from),
              messageExternalId: message.id ?? null,
              senderName: profileName,
              senderHandle: String(message.from),
              content: message.text.body,
              receivedAt: new Date(Number(message.timestamp) * 1000),
              raw: message,
            });
          }
        }
      }
    }
  } catch (err) {
    // Log but still 200 — Meta retries aggressively and disables failing
    // webhooks; our ingest is idempotent so a manual replay is safe.
    console.error("meta webhook ingest error", err);
  }

  return NextResponse.json({ received: true });
}

function verifySignature(header: string | null, rawBody: string): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const received = header.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    );
  } catch {
    return false;
  }
}
