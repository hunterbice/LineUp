-- SECURITY DEFINER RPCs must not inherit PostgreSQL's default PUBLIC execute
-- privilege. Only explicitly supported roles may invoke them.

revoke execute on function public.venue_deal_performance(text) from public, anon;
grant execute on function public.venue_deal_performance(text) to authenticated;

revoke execute on function public.preview_venue_live_score(text, timestamptz) from public;
grant execute on function public.preview_venue_live_score(text, timestamptz) to anon, authenticated;

revoke execute on function private.is_lineup_owner() from public;
revoke execute on function private.can_manage_venue(text) from public;
revoke execute on function private.venue_has_deal_plan(text) from public;
revoke execute on function private.can_promote_venue_deal(text, text) from public;
revoke execute on function private.analytics_deal_matches_venue(uuid, text) from public;
