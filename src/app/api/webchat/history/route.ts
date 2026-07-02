import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Thread history for the embeddable widget, so reopening it replays the
 * conversation (Realtime broadcasts are lost while the widget is closed).
 *
 * Public by necessity — the visitor has no account. The unguessable
 * widget-minted `visitorId` acts as a bearer scoped to exactly one thread,
 * and the response is stripped to the three fields the widget renders.
 */
export async function GET(req: NextRequest) {
  const widgetId = req.nextUrl.searchParams.get("widgetId");
  const visitorId = req.nextUrl.searchParams.get("visitorId");

  if (!widgetId || !visitorId || visitorId.length > 64) {
    return NextResponse.json(
      { error: "widgetId and visitorId are required" },
      { status: 400, headers: CORS }
    );
  }

  const supabase = createAdminClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("type", "webchat")
    .eq("external_id", widgetId)
    .eq("status", "active")
    .maybeSingle();
  if (!channel) {
    return NextResponse.json(
      { error: "Unknown widget" },
      { status: 404, headers: CORS }
    );
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("external_id", visitorId)
    .maybeSingle();
  if (!conversation) {
    return NextResponse.json(
      { messages: [] },
      { headers: { ...CORS, "Cache-Control": "no-store" } }
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("direction, content, received_at")
    .eq("conversation_id", conversation.id)
    .order("received_at", { ascending: false })
    .limit(50);

  return NextResponse.json(
    { messages: (messages ?? []).reverse() },
    { headers: { ...CORS, "Cache-Control": "no-store" } }
  );
}
