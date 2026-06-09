export type ChannelType =
  | "email"
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "telegram"
  | "webchat"
  | "linkedin"
  | "tiktok";

export type Plan = "trial" | "lite" | "pro" | "business";

export interface Channel {
  id: string;
  user_id: string;
  type: ChannelType;
  name: string;
  external_id: string | null;
  access_token: string | null;
  status: "active" | "disconnected" | "error";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  handles: Record<string, string>;
  notes: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  channel_id: string;
  contact_id: string | null;
  external_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  status: "open" | "closed";
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  channel_id: string;
  conversation_id: string;
  contact_id: string | null;
  external_id: string | null;
  direction: "inbound" | "outbound";
  sender_name: string | null;
  sender_handle: string | null;
  content: string;
  is_read: boolean;
  received_at: string;
  raw: unknown;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  channel_ids: string[];
  content: string;
  media_urls: string[];
  scheduled_for: string;
  status: "pending" | "publishing" | "published" | "failed" | "cancelled";
  error: string | null;
  published_at: string | null;
  inngest_job_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: string;
  current_period_end: string | null;
  created_at: string;
}
