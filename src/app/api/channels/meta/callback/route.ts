import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Meta OAuth callback: exchange the code for a long-lived token, pull the
 * user's Pages, and connect each Page (+ linked Instagram account) as a
 * channel. WhatsApp number connection is finished in settings (phase 1.5).
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const fail = (reason: string) =>
    NextResponse.redirect(
      `${appUrl}/settings/channels?error=${encodeURIComponent(reason)}`
    );

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Session expired — please sign in again");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || state !== user.id) return fail("OAuth was cancelled");

  try {
    // 1. code → short-lived user token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: `${appUrl}/api/channels/meta/callback`,
          code,
        })
    ).then((r) => r.json());
    if (!tokenRes.access_token) throw new Error("No access token returned");

    // 2. short-lived → long-lived user token (~60 days)
    const longLived = await fetch(
      `${GRAPH}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          fb_exchange_token: tokenRes.access_token,
        })
    ).then((r) => r.json());
    const userToken = longLived.access_token ?? tokenRes.access_token;

    // 3. fetch Pages (page tokens from a long-lived user token don't expire)
    const pages = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
    ).then((r) => r.json());

    for (const page of pages.data ?? []) {
      await supabase.from("channels").upsert(
        {
          user_id: user.id,
          type: "facebook",
          name: page.name,
          external_id: page.id,
          access_token: page.access_token,
        },
        { onConflict: "type,external_id", ignoreDuplicates: false }
      );

      // Subscribe the page to our webhook events
      await fetch(`${GRAPH}/${page.id}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: ["messages", "messaging_postbacks"],
          access_token: page.access_token,
        }),
      });

      if (page.instagram_business_account?.id) {
        await supabase.from("channels").upsert(
          {
            user_id: user.id,
            type: "instagram",
            name: `${page.name} (Instagram)`,
            external_id: page.id, // IG webhooks arrive keyed by page id
            access_token: page.access_token,
            metadata: { ig_user_id: page.instagram_business_account.id },
          },
          { onConflict: "type,external_id", ignoreDuplicates: false }
        );
      }
    }

    return NextResponse.redirect(
      `${appUrl}/settings/channels?connected=facebook`
    );
  } catch (err) {
    console.error("meta oauth callback error", err);
    return fail("Could not connect Meta account");
  }
}
