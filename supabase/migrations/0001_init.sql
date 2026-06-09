-- Switalk initial schema
-- Users are managed by Supabase Auth (auth.users)

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- channels: a connected account on some platform
-- ---------------------------------------------------------------------------
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('email','instagram','whatsapp','facebook','telegram','webchat','linkedin','tiktok')),
  name text not null default '',
  external_id text,            -- platform-side id (page id, phone number id, bot id...)
  access_token text,           -- encrypted at rest by Supabase; never exposed to the client
  status text not null default 'active' check (status in ('active','disconnected','error')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index channels_user_idx on public.channels (user_id);
create unique index channels_external_idx on public.channels (type, external_id) where external_id is not null;

-- ---------------------------------------------------------------------------
-- contacts: one person across all platforms (core CRM promise)
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Unknown',
  avatar_url text,
  handles jsonb not null default '{}',   -- { "instagram": "@jane", "email": "jane@x.com", ... }
  notes text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index contacts_user_idx on public.contacts (user_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- conversations: a thread with a contact on one channel
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  external_id text,            -- platform-side thread/sender id
  last_message_at timestamptz,
  last_message_preview text,
  unread_count int not null default 0,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create index conversations_user_idx on public.conversations (user_id, last_message_at desc);
create unique index conversations_external_idx on public.conversations (channel_id, external_id) where external_id is not null;

-- ---------------------------------------------------------------------------
-- messages: every message in/out across every channel
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  channel_id uuid not null references public.channels on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  external_id text,
  direction text not null default 'inbound' check (direction in ('inbound','outbound')),
  sender_name text,
  sender_handle text,
  content text not null default '',
  is_read boolean not null default false,
  received_at timestamptz not null default now(),
  raw jsonb
);

create index messages_conversation_idx on public.messages (conversation_id, received_at);
create index messages_user_unread_idx on public.messages (user_id) where is_read = false;
create unique index messages_external_idx on public.messages (channel_id, external_id) where external_id is not null;

-- ---------------------------------------------------------------------------
-- scheduled_posts: the auto-poster queue
-- ---------------------------------------------------------------------------
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  channel_ids uuid[] not null default '{}',
  content text not null,
  media_urls text[] not null default '{}',
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','publishing','published','failed','cancelled')),
  error text,
  published_at timestamptz,
  inngest_job_id text,
  created_at timestamptz not null default now()
);

create index scheduled_posts_user_idx on public.scheduled_posts (user_id, scheduled_for desc);
create index scheduled_posts_pending_idx on public.scheduled_posts (scheduled_for) where status = 'pending';

-- ---------------------------------------------------------------------------
-- subscriptions: mirror of Stripe state (written only by the Stripe webhook)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial' check (plan in ('trial','lite','pro','business')),
  status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: users only ever see their own rows.
-- The service-role key (webhooks, Inngest jobs) bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own channels" on public.channels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own contacts" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scheduled_posts" on public.scheduled_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: stream new messages + conversation updates to the inbox UI
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
