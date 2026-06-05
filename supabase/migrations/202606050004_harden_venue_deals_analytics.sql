-- Priority 9 hardening for venue deals and analytics.
-- Keep analytics insert-only and ensure deal analytics cannot be attributed to
-- the wrong venue.

create or replace function private.analytics_deal_matches_venue(target_deal_id uuid, target_venue_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_deal_id is null
    or exists (
      select 1
      from public.venue_deals vd
      where vd.id = target_deal_id
        and vd.venue_id = target_venue_id
    );
$$;

grant execute on function private.analytics_deal_matches_venue(uuid, text) to anon, authenticated;
grant execute on function private.can_manage_venue(text) to anon, authenticated;

drop policy if exists "Clients can insert venue analytics events" on public.venue_analytics_events;
create policy "Clients can insert venue analytics events"
on public.venue_analytics_events for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.venues v
    where v.id = venue_id
      and v.status = 'active'
      and v.deprecated = false
  )
  and (select private.analytics_deal_matches_venue(deal_id, venue_id))
  and jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 2048
);
