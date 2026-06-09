import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage } from "@/lib/channels/ingest";

/**
 * Inbound email webhook (Resend inbound / any forwarder that POSTs JSON:
 * { to, from, fromName?, subject?, text, messageId? }).
 * The `to` address must match a connected email channel's external_id.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { to, from, fromName, subject, text, messageId } = body ?? {};

  if (!to || !from || !text) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  try {
    await ingestInboundMessage("email", {
      channelExternalId: String(to).toLowerCase(),
      conversationExternalId: String(from).toLowerCase(),
      messageExternalId: messageId ?? null,
      senderName: fromName ?? null,
      senderHandle: String(from).toLowerCase(),
      content: subject ? `${subject}\n\n${text}` : text,
      receivedAt: new Date(),
      raw: body,
    });
  } catch (err) {
    console.error("email webhook ingest error", err);
  }

  return NextResponse.json({ received: true });
}
