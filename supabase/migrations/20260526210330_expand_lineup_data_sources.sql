alter table public.confidence_sources
  drop constraint if exists confidence_sources_source_type_check;

alter table public.confidence_sources
  add constraint confidence_sources_source_type_check check (source_type = any (array[
    'venue_admin',
    'owner_override',
    'verified_scout',
    'trusted_reporter',
    'gps_verified_report',
    'user_report',
    'photo_report',
    'besttime_forecast_prior',
    'besttime_live_if_validated',
    'besttime_foot_traffic',
    'mapbox_geofence',
    'app_interest',
    'lineleap_interest',
    'event_schedule',
    'historical_baseline',
    'ground_truth_calibration',
    'weather_calendar',
    'manual_seed'
  ]));

insert into public.confidence_sources
  (source_type, display_name, public_label, weight, half_life_minutes, default_reliability, enabled, public_visible)
values
  ('trusted_reporter', 'Trusted reporter', 'Trusted reports', 24, 90, 0.800, true, true),
  ('gps_verified_report', 'GPS verified user report', 'Nearby reports', 21, 75, 0.720, true, true),
  ('besttime_forecast_prior', 'BestTime forecast prior', 'Typical pattern', 9, 360, 0.380, true, true),
  ('besttime_live_if_validated', 'BestTime live signal after validation', 'Foot traffic model', 14, 90, 0.520, false, true),
  ('ground_truth_calibration', 'Manual ground-truth calibration', 'LineUp calibration', 18, 720, 0.850, true, false)
on conflict (source_type) do update set
  display_name = excluded.display_name,
  public_label = excluded.public_label,
  weight = excluded.weight,
  half_life_minutes = excluded.half_life_minutes,
  default_reliability = excluded.default_reliability,
  enabled = excluded.enabled,
  public_visible = excluded.public_visible;

alter table public.reports
  add column if not exists location_verified boolean not null default false,
  add column if not exists distance_m numeric(7,2),
  add column if not exists reporter_reliability_snapshot numeric(4,3),
  add column if not exists report_context jsonb not null default '{}'::jsonb;

create table if not exists public.reporter_reliability (
  device_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  trust_tier text not null default 'new' check (trust_tier = any (array['new','normal','trusted','venue_staff','owner','flagged'])),
  reliability_score numeric(4,3) not null default 0.500 check (reliability_score >= 0 and reliability_score <= 1),
  report_count integer not null default 0 check (report_count >= 0),
  agreement_count integer not null default 0 check (agreement_count >= 0),
  disagreement_count integer not null default 0 check (disagreement_count >= 0),
  last_report_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venue_hourly_priors (
  venue_id text not null references public.venues(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  hour_of_day integer not null check (hour_of_day between 0 and 23),
  crowd_prior numeric(5,2) not null check (crowd_prior >= 0 and crowd_prior <= 100),
  wait_prior_minutes integer not null default 0 check (wait_prior_minutes >= 0 and wait_prior_minutes <= 180),
  pseudo_count numeric(5,2) not null default 3 check (pseudo_count >= 0 and pseudo_count <= 25),
  source_type text not null default 'historical_baseline' references public.confidence_sources(source_type),
  sample_count integer not null default 0 check (sample_count >= 0),
  last_calibrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (venue_id, day_of_week, hour_of_day)
);

create table if not exists public.app_signal_events (
  id uuid primary key default gen_random_uuid(),
  venue_id text references public.venues(id) on delete cascade,
  event_type text not null check (event_type = any (array[
    'venue_card_open',
    'detail_view',
    'directions_tap',
    'map_pin_tap',
    'favorite_add',
    'favorite_remove',
    'lineleap_tap',
    'pulse_recommendation_view',
    'report_open',
    'share_tap'
  ])),
  device_id text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ground_truth_observations (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  observed_at timestamptz not null default now(),
  observer_label text,
  line_count integer check (line_count is null or (line_count >= 0 and line_count <= 500)),
  wait_minutes integer check (wait_minutes is null or (wait_minutes >= 0 and wait_minutes <= 180)),
  crowd_bucket text check (crowd_bucket is null or crowd_bucket = any (array['dead','slow','busy','packed'])),
  inside_count integer check (inside_count is null or (inside_count >= 0 and inside_count <= 2000)),
  photo_count integer not null default 0 check (photo_count >= 0 and photo_count <= 20),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reporter_reliability_user_idx on public.reporter_reliability(user_id);
create index if not exists venue_hourly_priors_source_idx on public.venue_hourly_priors(source_type);
create index if not exists app_signal_events_venue_created_idx on public.app_signal_events(venue_id, created_at desc);
create index if not exists app_signal_events_device_created_idx on public.app_signal_events(device_id, created_at desc);
create index if not exists ground_truth_observations_venue_observed_idx on public.ground_truth_observations(venue_id, observed_at desc);

alter table public.reporter_reliability enable row level security;
alter table public.venue_hourly_priors enable row level security;
alter table public.app_signal_events enable row level security;
alter table public.ground_truth_observations enable row level security;

drop policy if exists "Users can read their own reporter reliability" on public.reporter_reliability;
create policy "Users can read their own reporter reliability"
  on public.reporter_reliability for select
  using ((user_id = (select auth.uid())) or (select private.is_lineup_owner()));

drop policy if exists "Owners can manage reporter reliability" on public.reporter_reliability;
create policy "Owners can manage reporter reliability"
  on public.reporter_reliability for all
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));

drop policy if exists "Venue priors are publicly readable" on public.venue_hourly_priors;
create policy "Venue priors are publicly readable"
  on public.venue_hourly_priors for select
  using (true);

drop policy if exists "Owners can manage venue priors" on public.venue_hourly_priors;
create policy "Owners can manage venue priors"
  on public.venue_hourly_priors for all
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));

drop policy if exists "Anyone can submit app signal events" on public.app_signal_events;
create policy "Anyone can submit app signal events"
  on public.app_signal_events for insert
  with check (event_type = any (array['venue_card_open','detail_view','directions_tap','map_pin_tap','favorite_add','favorite_remove','lineleap_tap','pulse_recommendation_view','report_open','share_tap']));

drop policy if exists "Owners can read app signal events" on public.app_signal_events;
create policy "Owners can read app signal events"
  on public.app_signal_events for select
  using ((select private.is_lineup_owner()));

drop policy if exists "Owners can manage ground truth observations" on public.ground_truth_observations;
create policy "Owners can manage ground truth observations"
  on public.ground_truth_observations for all
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));

create or replace view public.venue_recent_app_interest
with (security_invoker = true) as
select
  venue_id,
  count(*) filter (where created_at > now() - interval '15 minutes')::integer as events_15m,
  count(*) filter (where created_at > now() - interval '60 minutes')::integer as events_60m,
  count(*) filter (where event_type = 'directions_tap' and created_at > now() - interval '60 minutes')::integer as directions_60m,
  count(*) filter (where event_type = 'lineleap_tap' and created_at > now() - interval '60 minutes')::integer as lineleap_60m,
  max(created_at) as last_event_at
from public.app_signal_events
where venue_id is not null
  and created_at > now() - interval '6 hours'
group by venue_id;

create or replace function public.create_confidence_signal_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signal_kind text;
  base_reliability numeric(4,3);
  reporter_score numeric(4,3);
begin
  select rr.reliability_score into reporter_score
  from public.reporter_reliability rr
  where rr.device_id = new.device_id;

  reporter_score := coalesce(reporter_score, 0.500);
  signal_kind := case
    when new.photo_signal then 'photo_report'
    when new.location_verified then 'gps_verified_report'
    else 'user_report'
  end;

  base_reliability := case
    when new.photo_signal then 0.760
    when new.location_verified then 0.720
    else 0.620
  end;

  base_reliability := least(0.950, greatest(0.300, (base_reliability * 0.70) + (reporter_score * 0.30)));

  if new.note is not null and length(trim(new.note)) >= 8 then
    base_reliability := least(0.950, base_reliability + 0.050);
  end if;

  insert into public.reporter_reliability(device_id, user_id, report_count, last_report_at, reliability_score)
  values (coalesce(new.device_id, 'anonymous'), auth.uid(), 1, new.created_at, reporter_score)
  on conflict (device_id) do update set
    report_count = public.reporter_reliability.report_count + 1,
    last_report_at = excluded.last_report_at,
    updated_at = now();

  insert into public.venue_confidence_signals
    (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible)
  values
    (
      new.venue_id,
      signal_kind,
      case
        when new.photo_signal then 'User photo report'
        when new.location_verified then 'Nearby user report'
        else 'User crowd report'
      end,
      new.crowd_level,
      new.wait_minutes,
      100,
      base_reliability,
      new.created_at,
      new.created_at + case when new.photo_signal then interval '90 minutes' else interval '75 minutes' end,
      jsonb_build_object(
        'report_id', new.id,
        'has_note', new.note is not null and length(trim(coalesce(new.note, ''))) > 0,
        'photo_signal', new.photo_signal,
        'location_verified', new.location_verified,
        'distance_m', new.distance_m,
        'reporter_reliability', reporter_score,
        'cover_active', new.cover_active
      ),
      true
    );

  return new;
end;
$$;

revoke execute on function public.create_confidence_signal_from_report() from anon;
revoke execute on function public.create_confidence_signal_from_report() from authenticated;
revoke execute on function public.create_confidence_signal_from_report() from public;;
