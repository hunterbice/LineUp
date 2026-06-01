create table if not exists public.confidence_sources (
  source_type text primary key,
  display_name text not null,
  public_label text not null,
  weight integer not null check (weight > 0 and weight <= 100),
  half_life_minutes integer not null check (half_life_minutes > 0 and half_life_minutes <= 1440),
  default_reliability numeric(4,3) not null check (default_reliability >= 0 and default_reliability <= 1),
  enabled boolean not null default true,
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  check (source_type = any (array[
    'venue_admin',
    'owner_override',
    'verified_scout',
    'user_report',
    'photo_report',
    'besttime_foot_traffic',
    'mapbox_geofence',
    'app_interest',
    'lineleap_interest',
    'event_schedule',
    'historical_baseline',
    'weather_calendar',
    'manual_seed'
  ]))
);

insert into public.confidence_sources
  (source_type, display_name, public_label, weight, half_life_minutes, default_reliability, enabled, public_visible)
values
  ('owner_override', 'Owner override', 'LineUp verified', 36, 240, 0.980, true, true),
  ('venue_admin', 'Venue admin update', 'Venue update', 30, 180, 0.950, true, true),
  ('verified_scout', 'Verified LineUp scout', 'LineUp scout', 28, 120, 0.900, true, true),
  ('photo_report', 'Verified photo report', 'Photo signal', 24, 90, 0.750, true, true),
  ('besttime_foot_traffic', 'BestTime foot traffic', 'Foot traffic model', 20, 120, 0.700, true, true),
  ('user_report', 'User crowd report', 'Recent reports', 18, 75, 0.650, true, true),
  ('mapbox_geofence', 'Geofence density cluster', 'Nearby activity', 16, 45, 0.650, true, true),
  ('lineleap_interest', 'LineLeap intent signal', 'Skip interest', 13, 60, 0.550, true, true),
  ('event_schedule', 'Event schedule boost', 'Tonight event', 12, 240, 0.500, true, true),
  ('app_interest', 'LineUp app interest', 'App activity', 10, 45, 0.450, true, true),
  ('historical_baseline', 'Historical baseline', 'Typical pattern', 8, 360, 0.350, true, true),
  ('weather_calendar', 'Weather and calendar context', 'Context model', 7, 240, 0.350, true, true),
  ('manual_seed', 'Prototype seed data', 'Prototype seed', 6, 120, 0.300, true, false)
on conflict (source_type) do update set
  display_name = excluded.display_name,
  public_label = excluded.public_label,
  weight = excluded.weight,
  half_life_minutes = excluded.half_life_minutes,
  default_reliability = excluded.default_reliability,
  enabled = excluded.enabled,
  public_visible = excluded.public_visible;

create table if not exists public.venue_confidence_signals (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  source_type text not null references public.confidence_sources(source_type),
  signal_label text,
  crowd_level text check (crowd_level is null or crowd_level = any (array['dead','slow','busy','packed'])),
  wait_minutes integer check (wait_minutes is null or (wait_minutes >= 0 and wait_minutes <= 180)),
  signal_strength numeric(5,2) not null default 100 check (signal_strength >= 0 and signal_strength <= 100),
  reliability numeric(4,3) not null check (reliability >= 0 and reliability <= 1),
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  public_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists venue_confidence_signals_venue_observed_idx
  on public.venue_confidence_signals (venue_id, observed_at desc);

create index if not exists venue_confidence_signals_active_idx
  on public.venue_confidence_signals (venue_id, source_type, expires_at)
  where public_visible = true;

alter table public.confidence_sources enable row level security;
alter table public.venue_confidence_signals enable row level security;

drop policy if exists "Confidence sources are readable" on public.confidence_sources;
create policy "Confidence sources are readable"
  on public.confidence_sources for select
  using (public_visible = true);

drop policy if exists "Public signals are readable" on public.venue_confidence_signals;
create policy "Public signals are readable"
  on public.venue_confidence_signals for select
  using (public_visible = true);

insert into public.venue_confidence_signals
  (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible)
select
  ls.venue_id,
  case ls.updated_by_role
    when 'venue_admin' then 'venue_admin'
    when 'owner' then 'owner_override'
    when 'report' then 'user_report'
    when 'system' then 'besttime_foot_traffic'
    else 'manual_seed'
  end,
  'Initial LineUp live status',
  ls.crowd_level,
  ls.wait_minutes,
  case ls.confidence when 'high' then 92 when 'medium' then 72 else 48 end,
  case ls.confidence when 'high' then 0.82 when 'medium' then 0.58 else 0.32 end,
  ls.fresh_at,
  ls.fresh_at + interval '3 hours',
  jsonb_build_object('seeded_from', 'live_status', 'previous_confidence', ls.confidence, 'previous_sources', ls.sources),
  ls.updated_by_role <> 'seed'
from public.live_status ls
where not exists (
  select 1 from public.venue_confidence_signals s
  where s.venue_id = ls.venue_id and s.metadata->>'seeded_from' = 'live_status'
);

create or replace view public.venue_confidence_summary as
with weighted as (
  select
    s.venue_id,
    c.public_label,
    c.weight,
    s.reliability,
    s.signal_strength,
    greatest(0::numeric, least(1::numeric, exp((-extract(epoch from (now() - s.observed_at)) / 60.0) / c.half_life_minutes)::numeric)) as freshness_factor,
    (c.weight::numeric * s.reliability * (s.signal_strength / 100.0) * greatest(0::numeric, least(1::numeric, exp((-extract(epoch from (now() - s.observed_at)) / 60.0) / c.half_life_minutes)::numeric))) as contribution
  from public.venue_confidence_signals s
  join public.confidence_sources c on c.source_type = s.source_type
  where c.enabled = true
    and s.public_visible = true
    and s.observed_at <= now()
    and (s.expires_at is null or s.expires_at > now())
), scored as (
  select
    venue_id,
    round((sum(contribution) / nullif(sum(weight), 0)) * 100)::integer as confidence_score,
    count(*)::integer as signal_count,
    max(freshness_factor) as newest_factor
  from weighted
  group by venue_id
), labels as (
  select venue_id, array_agg(public_label order by contribution desc, public_label) as ordered_labels
  from weighted
  group by venue_id
)
select
  v.id as venue_id,
  coalesce(sc.confidence_score, 25) as confidence_score,
  case
    when coalesce(sc.confidence_score, 25) >= 72 then 'high'
    when coalesce(sc.confidence_score, 25) >= 45 then 'medium'
    else 'low'
  end as confidence_band,
  coalesce(sc.signal_count, 0) as signal_count,
  coalesce((select array_agg(distinct_label) from (select distinct distinct_label from unnest(coalesce(l.ordered_labels, array[]::text[])) as distinct_label limit 3) d), array['Needs fresh reports']::text[]) as sources
from public.venues v
left join scored sc on sc.venue_id = v.id
left join labels l on l.venue_id = v.id;

create or replace view public.active_venue_status as
select
  v.id,
  v.name,
  v.area,
  v.status,
  v.deprecated,
  v.tag,
  v.address,
  v.map_query,
  v.lat,
  v.lng,
  v.scenes,
  v.logo_key,
  v.open_hour,
  v.close_hour,
  v.last_call,
  v.line_leap_url,
  coalesce(ls.event, v.default_event) as event,
  ls.crowd_level,
  ls.wait_minutes,
  coalesce(vcs.confidence_band, ls.confidence) as confidence,
  ls.momentum,
  ls.cover_amount,
  ls.cover_active,
  coalesce(vcs.sources, ls.sources) as sources,
  ls.fresh_at,
  ls.updated_at as status_updated_at,
  coalesce(vcs.confidence_score, case ls.confidence when 'high' then 82 when 'medium' then 58 else 28 end) as confidence_score,
  coalesce(vcs.signal_count, 0) as confidence_signal_count
from public.venues v
join public.live_status ls on ls.venue_id = v.id
left join public.venue_confidence_summary vcs on vcs.venue_id = v.id
where v.status = 'active' and v.deprecated = false;

create or replace function public.create_confidence_signal_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signal_kind text;
  base_reliability numeric(4,3);
begin
  signal_kind := case when new.photo_signal then 'photo_report' else 'user_report' end;
  base_reliability := case when new.photo_signal then 0.760 else 0.620 end;
  if new.note is not null and length(trim(new.note)) >= 8 then
    base_reliability := least(0.900, base_reliability + 0.050);
  end if;

  insert into public.venue_confidence_signals
    (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible)
  values
    (
      new.venue_id,
      signal_kind,
      case when new.photo_signal then 'User photo report' else 'User crowd report' end,
      new.crowd_level,
      new.wait_minutes,
      100,
      base_reliability,
      new.created_at,
      new.created_at + interval '90 minutes',
      jsonb_build_object(
        'report_id', new.id,
        'has_note', new.note is not null and length(trim(coalesce(new.note, ''))) > 0,
        'photo_signal', new.photo_signal,
        'cover_active', new.cover_active
      ),
      true
    );

  return new;
end;
$$;

drop trigger if exists reports_create_confidence_signal on public.reports;
create trigger reports_create_confidence_signal
after insert on public.reports
for each row execute function public.create_confidence_signal_from_report();;
