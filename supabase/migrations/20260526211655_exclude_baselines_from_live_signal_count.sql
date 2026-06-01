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
  select
    crowd_value,
    wait_minutes::numeric as wait_value,
    contribution,
    public_label,
    source_type = any (array['historical_baseline','besttime_forecast_prior','manual_seed','weather_calendar']) as is_prior,
    false as is_app
  from signals
  where crowd_value is not null and contribution > 0
  union all
  select p.crowd_prior, p.wait_prior::numeric, p.pseudo_count * 6, 'Typical pattern', true, false
  from prior p
  union all
  select a.crowd_value, null::numeric, a.contribution, 'App activity', false, true
  from app_signal a
  where a.contribution > 0
), scored as (
  select
    round(sum(crowd_value * contribution) / nullif(sum(contribution), 0))::integer as final_crowd_score,
    round(sum(wait_value * contribution) filter (where wait_value is not null) / nullif(sum(contribution) filter (where wait_value is not null), 0))::integer as final_wait,
    count(*) filter (where is_prior = false and is_app = false)::integer as live_count,
    coalesce(sum(contribution) filter (where is_prior = false and is_app = false), 0)::numeric as live_contribution,
    coalesce(sum(contribution) filter (where is_app = true), 0)::numeric as app_contribution
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
), final as (
  select
    coalesce(sc.final_crowd_score, p.crowd_prior::integer) as final_crowd_score,
    greatest(0, least(180, coalesce(sc.final_wait, p.wait_prior))) as final_wait,
    greatest(0, least(100,
      case
        when coalesce(sc.live_count, 0) = 0 then 24
        else round(least(70::numeric, (sc.live_contribution / 45.0) * 70))::integer
      end
      + case when coalesce(sc.live_count, 0) >= 3 then 18 when coalesce(sc.live_count, 0) = 2 then 11 when coalesce(sc.live_count, 0) = 1 then 5 else 0 end
      + case when coalesce(ai.events_60m, 0) >= 8 then 6 when coalesce(ai.events_60m, 0) >= 3 then 3 else 0 end
      + case when coalesce(sc.live_count, 0) = 0 and p.crowd_prior >= 55 then 6 else 0 end
    ))::integer as final_confidence_score,
    coalesce(sc.live_count, 0) as live_count,
    coalesce(ai.events_60m, 0) as events_60m,
    p.crowd_prior,
    p.wait_prior,
    labels.top_sources,
    prev.previous_score
  from prior p
  cross join scored sc
  cross join labels
  cross join app_interest ai
  left join previous prev on true
)
select
  target_venue_id,
  f.final_crowd_score,
  public.score_to_crowd_bucket(f.final_crowd_score),
  f.final_wait,
  f.final_confidence_score,
  public.score_to_confidence_band(f.final_confidence_score),
  case
    when f.previous_score is null then 'steady'
    when f.final_crowd_score >= f.previous_score + 10 then 'heating_up'
    when f.final_crowd_score <= f.previous_score - 10 then 'cooling_down'
    else 'steady'
  end,
  f.top_sources,
  f.live_count,
  f.events_60m,
  f.crowd_prior,
  f.wait_prior
from final f;
$$;;
