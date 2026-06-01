create table if not exists public.besttime_venue_map (
  venue_id text primary key references public.venues(id) on delete cascade,
  besttime_venue_id text,
  besttime_name text,
  besttime_address text,
  coverage_status text not null default 'unverified' check (coverage_status = any (array['unverified','forecast_ready','live_validated','unavailable'])),
  last_forecast_import_at timestamptz,
  last_live_check_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null references public.confidence_sources(source_type),
  status text not null default 'started' check (status = any (array['started','success','partial','failed'])),
  venue_id text references public.venues(id) on delete set null,
  records_processed integer not null default 0 check (records_processed >= 0),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists besttime_venue_map_besttime_idx on public.besttime_venue_map(besttime_venue_id);
create index if not exists source_import_runs_source_started_idx on public.source_import_runs(source_type, started_at desc);

alter table public.besttime_venue_map enable row level security;
alter table public.source_import_runs enable row level security;

drop policy if exists "BestTime mappings readable by owners" on public.besttime_venue_map;
create policy "BestTime mappings readable by owners"
  on public.besttime_venue_map for select
  using ((select private.is_lineup_owner()));

drop policy if exists "Owners can manage BestTime mappings" on public.besttime_venue_map;
create policy "Owners can manage BestTime mappings"
  on public.besttime_venue_map for all
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));

drop policy if exists "Source import runs readable by owners" on public.source_import_runs;
create policy "Source import runs readable by owners"
  on public.source_import_runs for select
  using ((select private.is_lineup_owner()));

drop policy if exists "Owners can manage source import runs" on public.source_import_runs;
create policy "Owners can manage source import runs"
  on public.source_import_runs for all
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));

insert into public.besttime_venue_map (venue_id)
select id from public.venues
where status = 'active' and deprecated = false
on conflict (venue_id) do nothing;;
