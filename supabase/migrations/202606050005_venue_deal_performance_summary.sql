-- Priority 10: aggregate-only deal performance summary for venue owners/staff.
-- This exposes counts only, never individual users, device rows, or locations.

create or replace function public.venue_deal_performance(target_venue_id text)
returns table (
  venue_id text,
  deal_id uuid,
  deal_title text,
  deal_type text,
  is_active boolean,
  is_promoted boolean,
  promotion_tier text,
  starts_at timestamptz,
  ends_at timestamptz,
  impressions_today bigint,
  taps_today bigint,
  detail_opens_today bigint,
  report_opens_today bigint,
  report_submits_today bigint,
  favorite_adds_today bigint,
  impressions_7d bigint,
  taps_7d bigint,
  detail_opens_7d bigint,
  tap_rate_7d numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed as (
    select private.can_manage_venue(target_venue_id) as can_read
  ),
  recent_deals as (
    select vd.*
    from public.venue_deals vd
    cross join allowed a
    where a.can_read = true
      and vd.venue_id = target_venue_id
      and (
        vd.ends_at >= now() - interval '30 days'
        or vd.starts_at >= now() - interval '30 days'
      )
  ),
  event_counts as (
    select
      vae.venue_id,
      vae.deal_id,
      count(*) filter (where vae.event_type = 'deal_impression' and vae.created_at >= current_date) as impressions_today,
      count(*) filter (where vae.event_type = 'deal_tap' and vae.created_at >= current_date) as taps_today,
      count(*) filter (where vae.event_type = 'venue_detail_open' and vae.created_at >= current_date) as detail_opens_today,
      count(*) filter (where vae.event_type = 'report_open' and vae.created_at >= current_date) as report_opens_today,
      count(*) filter (where vae.event_type = 'report_submit' and vae.created_at >= current_date) as report_submits_today,
      count(*) filter (where vae.event_type = 'favorite_add' and vae.created_at >= current_date) as favorite_adds_today,
      count(*) filter (where vae.event_type = 'deal_impression' and vae.created_at >= now() - interval '7 days') as impressions_7d,
      count(*) filter (where vae.event_type = 'deal_tap' and vae.created_at >= now() - interval '7 days') as taps_7d,
      count(*) filter (where vae.event_type = 'venue_detail_open' and vae.created_at >= now() - interval '7 days') as detail_opens_7d
    from public.venue_analytics_events vae
    join recent_deals rd on rd.id = vae.deal_id and rd.venue_id = vae.venue_id
    where vae.created_at >= now() - interval '7 days'
    group by vae.venue_id, vae.deal_id
  )
  select
    rd.venue_id,
    rd.id as deal_id,
    rd.title as deal_title,
    rd.deal_type,
    rd.is_active,
    rd.is_promoted,
    rd.promotion_tier,
    rd.starts_at,
    rd.ends_at,
    coalesce(ec.impressions_today, 0) as impressions_today,
    coalesce(ec.taps_today, 0) as taps_today,
    coalesce(ec.detail_opens_today, 0) as detail_opens_today,
    coalesce(ec.report_opens_today, 0) as report_opens_today,
    coalesce(ec.report_submits_today, 0) as report_submits_today,
    coalesce(ec.favorite_adds_today, 0) as favorite_adds_today,
    coalesce(ec.impressions_7d, 0) as impressions_7d,
    coalesce(ec.taps_7d, 0) as taps_7d,
    coalesce(ec.detail_opens_7d, 0) as detail_opens_7d,
    case
      when coalesce(ec.impressions_7d, 0) = 0 then 0
      else round((coalesce(ec.taps_7d, 0)::numeric / nullif(ec.impressions_7d, 0)::numeric) * 100, 1)
    end as tap_rate_7d
  from recent_deals rd
  left join event_counts ec on ec.deal_id = rd.id and ec.venue_id = rd.venue_id
  order by
    case when rd.is_active and rd.starts_at <= now() and rd.ends_at > now() then 0 else 1 end,
    rd.ends_at desc
  limit 12;
$$;

grant execute on function public.venue_deal_performance(text) to authenticated;
