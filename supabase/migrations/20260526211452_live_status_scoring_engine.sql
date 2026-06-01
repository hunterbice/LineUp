create or replace function public.crowd_bucket_to_score(bucket text)
returns numeric
language sql
immutable
as $$
  select case bucket
    when 'dead' then 8::numeric
    when 'slow' then 32::numeric
    when 'busy' then 67::numeric
    when 'packed' then 92::numeric
    else null::numeric
  end;
$$;

create or replace function public.score_to_crowd_bucket(score numeric)
returns text
language sql
immutable
as $$
  select case
    when coalesce(score, 0) >= 80 then 'packed'
    when coalesce(score, 0) >= 55 then 'busy'
    when coalesce(score, 0) >= 22 then 'slow'
    else 'dead'
  end;
$$;

create or replace function public.score_to_confidence_band(score integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(score, 0) >= 72 then 'high'
    when coalesce(score, 0) >= 45 then 'medium'
    else 'low'
  end;
$$;

create or replace function public.preview_venue_live_score(target_venue_id text, as_of timestamptz default now())
returns table (
  venue_id text,
  crowd_score integer,
  crowd_level text,
  wait_minutes integer,
  confidence_score integer,
  confidence text,
  momentum text,
  sources text[],
  live_signal_count integer,
  app_events_60m integer,
  prior_crowd numeric,
  prior_wait integer
)
language sql
stable
as $$
with venue as (
  select v.*
  from public.venues v
  where v.id = target_venue_id
), prior as (
  select coalesce(vhp.crowd_prior, 20)::numeric as crowd_prior,
         coalesce(vhp.wait_prior_minutes, 0)::integer as wait_prior,
         coalesce(vhp.pseudo_count, 3)::numeric as pseudo_count
  from venue v
  left join public.venue_hourly_priors vhp
    on vhp.venue_id = v.id
   and vhp.day_of_week = extract(dow from (as_of at time zone 'America/Phoenix'))::integer
   and vhp.hour_of_day = extract(hour from (as_of at time zone 'America/Phoenix'))::integer
), signals as (
  select
    s.venue_id,
    s.source_type,
    c.public_label,
    public.crowd_bucket_to_score(s.crowd_level) as crowd_value,
    s.wait_minutes,
    c.weight::numeric as source_weight,
    s.reliability,
    s.signal_strength,
    greatest(0::numeric, least(1::numeric, exp((-extract(epoch from (as_of - s.observed_at)) / 60.0) / c.half_life_minutes)::numeric)) as freshness_factor,
    (c.weight::numeric * s.reliability * (s.signal_strength / 100.0) * greatest(0::numeric, least(1::numeric, exp((-extract(epoch from (as_of - s.observed_at)) / 60.0) / c.half_life_minutes)::numeric))) as contribution
  from public.venue_confidence_signals s
  join public.confidence_sources c on c.source_type = s.source_type
  where s.venue_id = target_venue_id
    and c.enabled = true
    and s.public_visible = true
    and s.observed_at <= as_of
    and (s.expires_at is null or s.expires_at > as_of)
), app_interest as (
  select
    count(*) filter (where created_at > as_of - interval '15 minutes')::integer as events_15m,
    count(*) filter (where created_at > as_of - interval '60 minutes')::integer as events_60m,
    count(*) filter (where event_type = 'directions_tap' and created_at > as_of - interval '60 minutes')::integer as directions_60m,
    count(*) filter (where event_type = 'lineleap_tap' and created_at > as_of - interval '60 minutes')::integer as lineleap_60m
  from public.app_signal_events
  where venue_id = target_venue_id
    and created_at <= as_of
    and created_at > as_of - interval '6 hours'
), app_signal as (
  select
    greatest(0, least(100, 12 + (events_15m * 5) + (directions_60m * 8) + (lineleap_60m * 9)))::numeric as crowd_value,
    (least(12, greatest(0, events_60m))::numeric * 0.7) as contribution,
    events_60m
  from app_interest
), weighted as (
  select crowd_value, wait_minutes::numeric as wait_value, contribution, public_label
  from signals
  where crowd_value is not null and contribution > 0
  union all
  select p.crowd_prior, p.wait_prior::numeric, p.pseudo_count * 6, 'Typical pattern'
  from prior p
  union all
  select a.crowd_value, null::numeric, a.contribution, 'App activity'
  from app_signal a
  where a.contribution > 0
), scored as (
  select
    round(sum(crowd_value * contribution) / nullif(sum(contribution), 0))::integer as final_crowd_score,
    round(sum(wait_value * contribution) filter (where wait_value is not null) / nullif(sum(contribution) filter (where wait_value is not null), 0))::integer as final_wait,
    round(least(100::numeric, greatest(0::numeric, (sum(contribution) / 42.0) * 100)))::integer as base_confidence,
    count(*) filter (where public_label <> 'Typical pattern')::integer as live_count
  from weighted
), labels as (
  select coalesce(array_agg(label order by max_contribution desc), array['Typical pattern']::text[]) as top_sources
  from (
    select public_label as label, max(contribution) as max_contribution
    from weighted
    group by public_label
    order by max(contribution) desc
    limit 3
  ) x
), previous as (
  select public.crowd_bucket_to_score(ls.crowd_level) as previous_score
  from public.live_status ls
  where ls.venue_id = target_venue_id
)
select
  target_venue_id,
  coalesce(sc.final_crowd_score, p.crowd_prior::integer) as crowd_score,
  public.score_to_crowd_bucket(coalesce(sc.final_crowd_score, p.crowd_prior)) as crowd_level,
  greatest(0, least(180, coalesce(sc.final_wait, p.wait_prior))) as wait_minutes,
  greatest(0, least(100,
    coalesce(sc.base_confidence, 20)
    + case when coalesce(sc.live_count, 0) >= 3 then 12 when coalesce(sc.live_count, 0) >= 1 then 5 else -8 end
    + case when coalesce(ai.events_60m, 0) >= 6 then 5 else 0 end
  )) as confidence_score,
  public.score_to_confidence_band(greatest(0, least(100,
    coalesce(sc.base_confidence, 20)
    + case when coalesce(sc.live_count, 0) >= 3 then 12 when coalesce(sc.live_count, 0) >= 1 then 5 else -8 end
    + case when coalesce(ai.events_60m, 0) >= 6 then 5 else 0 end
  ))) as confidence,
  case
    when prev.previous_score is null then 'steady'
    when coalesce(sc.final_crowd_score, p.crowd_prior) >= prev.previous_score + 10 then 'heating_up'
    when coalesce(sc.final_crowd_score, p.crowd_prior) <= prev.previous_score - 10 then 'cooling_down'
    else 'steady'
  end as momentum,
  labels.top_sources,
  coalesce(sc.live_count, 0) as live_signal_count,
  coalesce(ai.events_60m, 0) as app_events_60m,
  p.crowd_prior,
  p.wait_prior
from prior p
cross join scored sc
cross join labels
cross join app_interest ai
left join previous prev on true;
$$;

create or replace function public.recompute_venue_live_status(target_venue_id text, as_of timestamptz default now())
returns public.live_status
language plpgsql
security definer
set search_path = public
as $$
declare
  computed record;
  result public.live_status;
begin
  select * into computed
  from public.preview_venue_live_score(target_venue_id, as_of)
  limit 1;

  if computed.venue_id is null then
    raise exception 'Unknown venue id: %', target_venue_id;
  end if;

  update public.live_status ls
  set
    crowd_level = computed.crowd_level,
    wait_minutes = computed.wait_minutes,
    confidence = computed.confidence,
    momentum = computed.momentum,
    sources = computed.sources,
    fresh_at = as_of,
    updated_by_role = 'system',
    updated_at = now()
  where ls.venue_id = target_venue_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.recompute_all_live_status(as_of timestamptz default now())
returns table (venue_id text, crowd_level text, wait_minutes integer, confidence text, momentum text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  updated public.live_status;
begin
  for v in select id from public.venues where status = 'active' and deprecated = false loop
    updated := public.recompute_venue_live_status(v.id, as_of);
    venue_id := updated.venue_id;
    crowd_level := updated.crowd_level;
    wait_minutes := updated.wait_minutes;
    confidence := updated.confidence;
    momentum := updated.momentum;
    return next;
  end loop;
end;
$$;

create or replace function public.recompute_live_status_after_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_venue_live_status(new.venue_id, new.created_at);
  return new;
end;
$$;

drop trigger if exists reports_recompute_live_status on public.reports;
create trigger reports_recompute_live_status
after insert on public.reports
for each row execute function public.recompute_live_status_after_report();

revoke execute on function public.recompute_venue_live_status(text, timestamptz) from anon, authenticated, public;
revoke execute on function public.recompute_all_live_status(timestamptz) from anon, authenticated, public;
revoke execute on function public.recompute_live_status_after_report() from anon, authenticated, public;
grant execute on function public.preview_venue_live_score(text, timestamptz) to anon, authenticated;;
