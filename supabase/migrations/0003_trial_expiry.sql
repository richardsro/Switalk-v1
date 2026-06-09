-- 14-day trial expiry. New profiles get trial_ends_at automatically via the
-- column default (the handle_new_user trigger inserts without specifying it).
-- Enforced server-side in src/lib/billing.ts: an expired trial with no
-- active subscription blocks channel connects and post scheduling.

alter table public.profiles
  add column trial_ends_at timestamptz not null default (now() + interval '14 days');
