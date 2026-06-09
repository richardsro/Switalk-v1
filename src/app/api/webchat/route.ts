import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage } from "@/lib/channels/ingest";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Receives messages from the embeddable webchat widget (public/widget.js).
 * `widgetId` is the webchat channel's external_id, generated when the user
 * creates a widget; `visitorId` is a random id stored in the visitor's
 * localStorage so their thread persists.
 */
export async function POST(req: NextRequest) {
  const { widgetId, visitorId, name, text } = await req.json().catch(() => ({}));

  if (!widgetId || !visitorId || !text) {
    return NextResponse.json(
      { error: "widgetId, visitorId and text are required" },
      { status: 400, headers: CORS }
    );
  }

  try {
    await ingestInboundMessage("webchat", {
      channelExternalId: String(widgetId),
      conversationExternalId: String(visitorId),
      messageExternalId: null,
      senderName: name ?? "Website visitor",
      senderHandle: String(visitorId).slice(0, 8),
      content: String(text).slice(0, 4000),
      receivedAt: new Date(),
      raw: { widgetId, visitorId },
    });
  } catch (err) {
    console.error("webchat ingest error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
