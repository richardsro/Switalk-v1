-- Per-user, per-hour API call tracking (Meta Graph rate-limit protection).
-- One row per (user, provider, hour window); incremented atomically via RPC.

create table public.api_usage (
  user_id uuid not null references auth.users on delete cascade,
  provider text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, provider, window_start)
);

alter table public.api_usage enable row level security;

create policy "read own api usage" on public.api_usage
  for select using (auth.uid() = user_id);

-- Atomic increment-and-read. SECURITY DEFINER so both the RLS server client
-- (server actions) and the service-role client (Inngest jobs) can call it;
-- the auth.uid() guard stops an authenticated user from incrementing (and
-- thereby throttling) someone else's counter via direct PostgREST calls.
create or replace function public.increment_api_usage(p_user_id uuid, p_provider text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  insert into public.api_usage (user_id, provider, window_start, count)
  values (p_user_id, p_provider, date_trunc('hour', now()), 1)
  on conflict (user_id, provider, window_start)
  do update set count = api_usage.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

revoke all on function public.increment_api_usage(uuid, text) from public;
grant execute on function public.increment_api_usage(uuid, text) to authenticated, service_role;
