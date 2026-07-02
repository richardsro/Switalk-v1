"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canAddChannel } from "@/lib/plans";
import { getEffectivePlan, TRIAL_EXPIRED_ERROR } from "@/lib/billing";
import { requireEnv } from "@/lib/env";

async function assertChannelQuota(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const [{ plan, trialExpired }, { count }] = await Promise.all([
    getEffectivePlan(supabase, user.id),
    supabase.from("channels").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (trialExpired) return { ok: false, error: TRIAL_EXPIRED_ERROR };

  if (!canAddChannel(plan, count ?? 0)) {
    return {
      ok: false,
      error: "Channel limit reached for your plan — upgrade to connect more.",
    };
  }
  return { ok: true, userId: user.id };
}

/**
 * Connect a Telegram bot: validate the token with getMe, register our
 * webhook, store the channel.
 */
export async function connectTelegram(
  botToken: string
): Promise<{ ok: boolean; error?: string }> {
  const quota = await assertChannelQuota();
  if (!quota.ok) return quota;

  const token = botToken.trim();
  if (!/^\d+:[\w-]+$/.test(token)) {
    return { ok: false, error: "That doesn't look like a bot token" };
  }

  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(
    (r) => r.json()
  );
  if (!me.ok) return { ok: false, error: "Telegram rejected this token" };

  const botId = String(me.result.id);
  // requireEnv: a missing app URL would register the Telegram webhook as
  // "undefined/api/..." and silently drop every message.
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const webhook = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${appUrl}/api/webhooks/telegram?bot=${botId}`,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message"],
      }),
    }
  ).then((r) => r.json());
  if (!webhook.ok) {
    return { ok: false, error: `Could not register webhook: ${webhook.description}` };
  }

  const supabase = createClient();
  const { error } = await supabase.from("channels").insert({
    user_id: quota.userId,
    type: "telegram",
    name: me.result.username ? `@${me.result.username}` : "Telegram bot",
    external_id: botId,
    access_token: token,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "This bot is already connected" : "Could not save channel",
    };
  }

  revalidatePath("/settings/channels");
  return { ok: true };
}

/**
 * Create a webchat widget: the channel's external_id IS the widget id used
 * by the embed snippet and the /api/webchat ingest endpoint.
 */
export async function createWebchat(
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const quota = await assertChannelQuota();
  if (!quota.ok) return quota;

  const label = name.trim().slice(0, 60) || "Website chat";
  const supabase = createClient();
  const { error } = await supabase.from("channels").insert({
    user_id: quota.userId,
    type: "webchat",
    name: label,
    external_id: crypto.randomUUID(),
  });
  if (error) return { ok: false, error: "Could not create widget" };

  revalidatePath("/settings/channels");
  return { ok: true };
}

/**
 * Connect an email address. The address (lowercased) becomes the channel's
 * external_id — exactly what the inbound webhook matches on via the `to`
 * field, so mail auto-forwarded from this address lands in the right inbox.
 */
export async function connectEmail(
  address: string
): Promise<{ ok: boolean; error?: string }> {
  const quota = await assertChannelQuota();
  if (!quota.ok) return quota;

  const parsed = z.string().trim().toLowerCase().email().safeParse(address);
  if (!parsed.success) {
    return { ok: false, error: "That doesn't look like an email address" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("channels").insert({
    user_id: quota.userId,
    type: "email",
    name: parsed.data,
    external_id: parsed.data,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "This address is already connected"
          : "Could not save channel",
    };
  }

  revalidatePath("/settings/channels");
  return { ok: true };
}

export async function removeChannel(channelId: string) {
  const supabase = createClient();

  // Best effort: deregister the Telegram webhook so the bot doesn't keep
  // POSTing updates that we then drop as "unconnected".
  const { data: channel } = await supabase
    .from("channels")
    .select("type, access_token")
    .eq("id", channelId)
    .maybeSingle();
  if (channel?.type === "telegram" && channel.access_token) {
    await fetch(
      `https://api.telegram.org/bot${channel.access_token}/deleteWebhook`,
      { method: "POST" }
    ).catch((err) => console.error("removeChannel: deleteWebhook failed", err));
  }

  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", channelId);
  if (error) console.error("removeChannel: delete failed", error);
  revalidatePath("/settings/channels");
}
