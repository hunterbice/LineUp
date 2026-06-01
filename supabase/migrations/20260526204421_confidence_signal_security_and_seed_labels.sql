insert into public.venue_confidence_signals
  (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible)
select
  ls.venue_id,
  mapped.source_type,
  mapped.signal_label,
  ls.crowd_level,
  ls.wait_minutes,
  case ls.confidence when 'high' then 95 when 'medium' then 78 else 55 end,
  mapped.reliability,
  ls.fresh_at,
  ls.fresh_at + mapped.life,
  jsonb_build_object('seeded_from', 'live_status_sources', 'source_label', mapped.signal_label),
  true
from public.live_status ls
cross join lateral (
  select * from (values
    ('Venue update', 'venue_admin', 'Venue update', 0.95::numeric, interval '3 hours'),
    ('Staff update', 'venue_admin', 'Venue update', 0.94::numeric, interval '3 hours'),
    ('Trusted scout', 'verified_scout', 'LineUp scout', 0.90::numeric, interval '2 hours'),
    ('Scout report', 'verified_scout', 'LineUp scout', 0.88::numeric, interval '2 hours'),
    ('Reports', 'user_report', 'Recent reports', 0.68::numeric, interval '90 minutes'),
    ('Recent reports', 'user_report', 'Recent reports', 0.70::numeric, interval '90 minutes'),
    ('LineLeap taps', 'lineleap_interest', 'Skip interest', 0.58::numeric, interval '1 hour'),
    ('App interest', 'app_interest', 'App activity', 0.50::numeric, interval '1 hour'),
    ('Event boost', 'event_schedule', 'Tonight event', 0.55::numeric, interval '4 hours'),
    ('Historical baseline', 'historical_baseline', 'Typical pattern', 0.42::numeric, interval '6 hours'),
    ('Historical', 'historical_baseline', 'Typical pattern', 0.40::numeric, interval '6 hours'),
    ('Historical only', 'historical_baseline', 'Typical pattern', 0.30::numeric, interval '6 hours'),
    ('Typical traffic', 'historical_baseline', 'Typical pattern', 0.45::numeric, interval '6 hours'),
    ('Heavy entry volume', 'mapbox_geofence', 'Nearby activity', 0.72::numeric, interval '1 hour'),
    ('Local prototype signal', 'manual_seed', 'Prototype seed', 0.35::numeric, interval '2 hours')
  ) as m(source_label, source_type, signal_label, reliability, life)
  where m.source_label = any(ls.sources)
) mapped
where not exists (
  select 1 from public.venue_confidence_signals s
  where s.venue_id = ls.venue_id
    and s.metadata->>'seeded_from' = 'live_status_sources'
    and s.metadata->>'source_label' = mapped.signal_label
);

create or replace view public.venue_confidence_summary
with (security_invoker = true) as
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

create or replace view public.active_venue_status
with (security_invoker = true) as
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

revoke execute on function public.create_confidence_signal_from_report() from anon;
revoke execute on function public.create_confidence_signal_from_report() from authenticated;
revoke execute on function public.create_confidence_signal_from_report() from public;;
