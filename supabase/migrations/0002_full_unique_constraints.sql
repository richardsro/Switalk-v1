-- Replace partial unique indexes with full unique constraints.
--
-- ON CONFLICT (cols) cannot infer a partial unique index, so the PostgREST
-- upserts (e.g. the Meta OAuth callback's on_conflict=type,external_id)
-- failed with "no unique or exclusion constraint matching the ON CONFLICT
-- specification". Full constraints are safe here: Postgres treats NULLs as
-- distinct, so rows without an external_id are unconstrained, same as before.

drop index if exists public.channels_external_idx;
alter table public.channels
  add constraint channels_type_external_id_key unique (type, external_id);

drop index if exists public.conversations_external_idx;
alter table public.conversations
  add constraint conversations_channel_external_id_key unique (channel_id, external_id);

drop index if exists public.messages_external_idx;
alter table public.messages
  add constraint messages_channel_external_id_key unique (channel_id, external_id);
