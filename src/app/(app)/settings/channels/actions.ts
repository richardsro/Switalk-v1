"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canAddChannel } from "@/lib/plans";
import { getEffectivePlan, TRIAL_EXPIRED_ERROR } from "@/lib/billing";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
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

export async function removeChannel(channelId: string) {
  const supabase = createClient();
  await supabase.from("channels").delete().eq("id", channelId);
  revalidatePath("/settings/channels");
}
