-- Rewards must be attached to a server-confirmed source row so the frontend
-- cannot mint points just by choosing an event kind.

alter table public.reward_events
  add column if not exists source_table text;

alter table public.reward_events
  add column if not exists source_id text;

create unique index if not exists rewards_source_unique_idx
  on public.reward_events (source_table, source_id, device_id)
  where source_id is not null;
