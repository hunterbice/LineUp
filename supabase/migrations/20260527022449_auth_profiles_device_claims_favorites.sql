create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_area text,
  trust_tier text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (device_id),
  unique (user_id, device_id)
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, venue_id)
);

alter table public.user_profiles enable row level security;
alter table public.user_devices enable row level security;
alter table public.user_favorites enable row level security;

alter table public.reports add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.venue_checkins add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.presence_snapshots add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.app_signal_events add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc) where user_id is not null;
create index if not exists venue_checkins_user_created_idx on public.venue_checkins (user_id, created_at desc) where user_id is not null;
create index if not exists presence_snapshots_user_created_idx on public.presence_snapshots (user_id, created_at desc) where user_id is not null;
create index if not exists app_signal_events_user_created_idx on public.app_signal_events (user_id, created_at desc) where user_id is not null;
create index if not exists user_devices_user_idx on public.user_devices (user_id, last_seen_at desc);
create index if not exists user_favorites_venue_idx on public.user_favorites (venue_id);

create policy "Users can read own profile" on public.user_profiles for select to authenticated using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));
create policy "Users can update own profile" on public.user_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can insert own profile" on public.user_profiles for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Users can read own devices" on public.user_devices for select to authenticated using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));
create policy "Users can read own favorites" on public.user_favorites for select to authenticated using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));
create policy "Users can manage own favorites" on public.user_favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
;
