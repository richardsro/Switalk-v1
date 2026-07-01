import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { GRAPH } from "@/lib/channels/meta";

/**
 * Meta OAuth callback: exchange the code for a long-lived token, pull the
 * user's Pages, and connect each Page (+ linked Instagram account) and each
 * WhatsApp Business number the user granted access to as a channel.
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

    let connected = 0;
    for (const page of pages.data ?? []) {
      const { error: fbError } = await supabase.from("channels").upsert(
        {
          user_id: user.id,
          type: "facebook",
          name: page.name,
          external_id: page.id,
          access_token: page.access_token,
        },
        { onConflict: "type,external_id", ignoreDuplicates: false }
      );
      if (fbError) {
        // e.g. the page is already connected by a different Switalk account
        console.error(`meta callback: failed to save page ${page.id}`, fbError);
        continue;
      }
      connected++;

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
        const { error: igError } = await supabase.from("channels").upsert(
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
        if (igError) {
          console.error(`meta callback: failed to save IG for page ${page.id}`, igError);
        }
      }
    }

    // WhatsApp discovery must not sink the whole callback — pages may have
    // connected fine even if the WABA lookup fails.
    let whatsapp = { found: 0, connected: 0 };
    try {
      whatsapp = await connectWhatsApp(supabase, user.id, userToken);
    } catch (err) {
      console.error("meta callback: whatsapp connect failed", err);
    }

    const found = (pages.data ?? []).length + whatsapp.found;
    if (found > 0 && connected + whatsapp.connected === 0) {
      return fail(
        "These channels are already connected to another account"
      );
    }

    return NextResponse.redirect(
      `${appUrl}/settings/channels?connected=${
        connected > 0 ? "facebook" : "whatsapp"
      }`
    );
  } catch (err) {
    console.error("meta oauth callback error", err);
    return fail("Could not connect Meta account");
  }
}

/**
 * Find the WhatsApp Business Accounts the user granted during OAuth (via the
 * token's granular scopes), subscribe our app to their webhooks, and save
 * each phone number as a `whatsapp` channel. `external_id` is the phone
 * number id — the key both the webhook ingest and the send adapter use.
 */
async function connectWhatsApp(
  supabase: SupabaseClient,
  userId: string,
  userToken: string
): Promise<{ found: number; connected: number }> {
  const appToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const debug = await fetch(
    `${GRAPH}/debug_token?` +
      new URLSearchParams({ input_token: userToken, access_token: appToken })
  ).then((r) => r.json());

  const wabaIds: string[] =
    debug.data?.granular_scopes?.find(
      (s: { scope: string; target_ids?: string[] }) =>
        s.scope === "whatsapp_business_management"
    )?.target_ids ?? [];
  if (wabaIds.length === 0) return { found: 0, connected: 0 };

  let found = 0;
  let connected = 0;
  for (const wabaId of wabaIds) {
    // Without this subscription Meta never delivers the WABA's messages to
    // our webhook, so treat failure as fatal for this WABA.
    const sub = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    if (!sub.success) {
      console.error(`meta callback: waba ${wabaId} subscribe failed`, sub);
      continue;
    }

    const numbers = await fetch(
      `${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${userToken}`
    ).then((r) => r.json());

    for (const phone of numbers.data ?? []) {
      found++;
      const { error } = await supabase.from("channels").upsert(
        {
          user_id: userId,
          type: "whatsapp",
          name: phone.verified_name
            ? `${phone.verified_name} (${phone.display_phone_number})`
            : phone.display_phone_number,
          external_id: String(phone.id),
          access_token: userToken,
          metadata: { waba_id: wabaId },
        },
        { onConflict: "type,external_id", ignoreDuplicates: false }
      );
      if (error) {
        // e.g. the number is already connected by a different Switalk account
        console.error(`meta callback: failed to save number ${phone.id}`, error);
        continue;
      }
      connected++;
    }
  }
  return { found, connected };
}
