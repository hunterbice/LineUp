-- PostgREST API grants for the venue marketing layer.
-- RLS policies still decide which rows each role can see or mutate.

grant select on public.venue_deals to anon, authenticated;
grant insert, update on public.venue_deals to authenticated;

grant select on public.venue_subscriptions to authenticated;
grant insert, update, delete on public.venue_subscriptions to authenticated;

grant insert on public.venue_analytics_events to anon, authenticated;
grant select on public.venue_analytics_events to authenticated;
