import type { ChannelType } from "@/lib/types";
import type { ChannelAdapter } from "./types";
import { messengerAdapter, instagramAdapter, whatsappAdapter } from "./meta";
import { telegramAdapter } from "./telegram";
import { emailAdapter } from "./email";

const ADAPTERS: Partial<Record<ChannelType, ChannelAdapter>> = {
  facebook: messengerAdapter,
  instagram: instagramAdapter,
  whatsapp: whatsappAdapter,
  telegram: telegramAdapter,
  email: emailAdapter,
  // webchat replies are delivered via Supabase Realtime, not an adapter
  // linkedin / tiktok: auto-poster phase 2
};

export function getAdapter(type: ChannelType): ChannelAdapter {
  const adapter = ADAPTERS[type];
  if (!adapter) throw new Error(`No adapter for channel type "${type}"`);
  return adapter;
}
