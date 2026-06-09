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
 * Hands the widget what it needs to subscribe to Realtime broadcasts:
 * the Supabase URL and anon key (both public by design — the anon key is
 * shipped to every browser client anyway). Validates the widget id so we
 * don't hand config to garbage requests.
 */
export async function GET(req: NextRequest) {
  const widgetId = req.nextUrl.searchParams.get("widgetId");
  if (!widgetId) {
    return NextResponse.json({ error: "widgetId required" }, { status: 400, headers: CORS });
  }

  const supabase = createAdminClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, status")
    .eq("type", "webchat")
    .eq("external_id", widgetId)
    .maybeSingle();

  if (!channel || channel.status !== "active") {
    return NextResponse.json({ error: "Unknown widget" }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    {
      name: channel.name,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    { headers: CORS }
  );
}
