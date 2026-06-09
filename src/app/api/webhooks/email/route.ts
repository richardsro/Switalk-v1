import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage } from "@/lib/channels/ingest";

/**
 * Inbound email webhook (Resend inbound / any forwarder that POSTs JSON:
 * { to, from, fromName?, subject?, text, messageId? }).
 * The `to` address must match a connected email channel's external_id.
 *
 * Authenticated via a shared secret header — without this, anyone who
 * found the URL could inject fake messages into any user's inbox.
 * Configure the forwarder to send: x-webhook-secret: EMAIL_WEBHOOK_SECRET
 */
export async function POST(req: NextRequest) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: an unauthenticated inbox-injection endpoint is worse
    // than a down one.
    console.error("email webhook: EMAIL_WEBHOOK_SECRET is not set");
    return new NextResponse("Not configured", { status: 503 });
  }
  if (req.headers.get("x-webhook-secret") !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

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
