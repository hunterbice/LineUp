insert into public.venue_hourly_priors
  (venue_id, day_of_week, hour_of_day, crowd_prior, wait_prior_minutes, pseudo_count, source_type, sample_count, last_calibrated_at)
select
  v.id,
  d.dow,
  h.hour,
  least(100, greatest(0,
    case
      when h.hour between 20 and 23 then 45
      when h.hour in (0,1) then 55
      when h.hour between 17 and 19 then 25
      else 8
    end
    + case when d.dow in (5,6) then 22 when d.dow = 4 then 12 else 0 end
    + case ls.crowd_level when 'packed' then 12 when 'busy' then 7 when 'slow' then -3 else -8 end
  ))::numeric(5,2) as crowd_prior,
  least(180, greatest(0,
    case
      when h.hour between 20 and 23 then 8
      when h.hour in (0,1) then 12
      else 2
    end
    + case when d.dow in (5,6) then 8 when d.dow = 4 then 4 else 0 end
    + case ls.crowd_level when 'packed' then 12 when 'busy' then 5 when 'slow' then -1 else -3 end
  ))::integer as wait_prior_minutes,
  3,
  'historical_baseline',
  0,
  null
from public.venues v
join public.live_status ls on ls.venue_id = v.id
cross join generate_series(0,6) as d(dow)
cross join generate_series(0,23) as h(hour)
where v.status = 'active' and v.deprecated = false
on conflict (venue_id, day_of_week, hour_of_day) do nothing;;
