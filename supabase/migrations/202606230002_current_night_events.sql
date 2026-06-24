-- Priority 17A: only explicit owner/staff events from the current Tucson
-- nightlife window are exposed to student clients. Historical/default seed
-- event text remains available in source tables but is not presented as tonight.

alter table public.live_status
  add column if not exists event_updated_at timestamptz;

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
  case
    when ls.event is not null
      and ls.event_updated_at >= (
        (
          case
            when extract(hour from timezone('America/Phoenix', now())) < 5
              then date_trunc('day', timezone('America/Phoenix', now())) - interval '1 day'
            else date_trunc('day', timezone('America/Phoenix', now()))
          end
          + interval '5 hours'
        ) at time zone 'America/Phoenix'
      )
    then ls.event
    else null
  end as event,
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
  coalesce(vcs.signal_count, 0) as confidence_signal_count,
  ls.event_updated_at
from public.venues v
join public.live_status ls on ls.venue_id = v.id
left join public.venue_confidence_summary vcs on vcs.venue_id = v.id
where v.status = 'active' and v.deprecated = false;

comment on column public.live_status.event_updated_at is
  'Timestamp of the explicit owner/staff event update; used to prevent stale events from appearing as tonight.';
