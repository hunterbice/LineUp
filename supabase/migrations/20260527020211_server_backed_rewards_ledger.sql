alter table if exists public.reward_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text not null,
  reward_type text not null default 'lineup_skip',
  points_spent integer not null check (points_spent > 0 and points_spent <= 5000),
  status text not null default 'issued' check (status in ('issued','redeemed','cancelled')),
  code text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reward_redemptions enable row level security;

create index if not exists reward_events_device_created_idx on public.reward_events (device_id, created_at desc);
create index if not exists reward_events_user_created_idx on public.reward_events (user_id, created_at desc) where user_id is not null;
create index if not exists reward_redemptions_device_created_idx on public.reward_redemptions (device_id, created_at desc);
create index if not exists reward_redemptions_user_created_idx on public.reward_redemptions (user_id, created_at desc) where user_id is not null;

create policy "Users can read their own reward redemptions"
  on public.reward_redemptions
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));

drop policy if exists "Anyone can create anonymous reward events" on public.reward_events;
;
