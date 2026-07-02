-- Follow-up reminders + onboarding dismissal.

-- ---------------------------------------------------------------------------
-- reminders: "remind me about this conversation at <time>"
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','fired','cancelled')),
  created_at timestamptz not null default now()
);

create index reminders_user_idx on public.reminders (user_id, remind_at);
create index reminders_conversation_pending_idx
  on public.reminders (conversation_id) where status = 'pending';

alter table public.reminders enable row level security;
create policy "own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Durable inbox signal set by the reminder job; cleared when the thread is
-- opened (markConversationRead). unread_count alone is not reliable because
-- ingest recomputes it from unread messages.
alter table public.conversations
  add column reminder_due boolean not null default false;

-- ---------------------------------------------------------------------------
-- onboarding: dismissal marker. Backfill users who already have a channel so
-- existing accounts never see the first-run checklist.
-- ---------------------------------------------------------------------------
alter table public.profiles add column onboarded_at timestamptz;

update public.profiles p
set onboarded_at = now()
where exists (select 1 from public.channels c where c.user_id = p.id);
