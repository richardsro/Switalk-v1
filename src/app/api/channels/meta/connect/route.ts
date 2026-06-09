import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Kick off the Meta OAuth flow. Scopes cover Messenger, Instagram DM and
 * WhatsApp Business in one consent screen.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?next=/settings/channels`
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/channels/meta/callback`,
    state: user.id,
    scope: [
      "pages_show_list",
      "pages_messaging",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_manage_messages",
      "instagram_content_publish",
      "whatsapp_business_messaging",
      "whatsapp_business_management",
      "business_management",
    ].join(","),
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params}`
  );
}
