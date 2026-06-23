-- Priority 13: all mutable signal/analytics writes must pass through the
-- validated Edge Function boundary. Service-role clients used by those
-- functions bypass RLS; browsers must not write these tables directly.

drop policy if exists "Anyone can submit venue reports" on public.reports;
drop policy if exists "Anyone can submit app signal events" on public.app_signal_events;
drop policy if exists "Clients can insert venue analytics events" on public.venue_analytics_events;
drop policy if exists "Venue admins can update their live status" on public.live_status;
drop policy if exists "Owners can insert live status" on public.live_status;

revoke insert, update, delete, truncate, references, trigger on
  public.venues,
  public.live_status,
  public.reports,
  public.venue_admins,
  public.reward_events,
  public.confidence_sources,
  public.venue_confidence_signals,
  public.reporter_reliability,
  public.venue_hourly_priors,
  public.app_signal_events,
  public.ground_truth_observations,
  public.besttime_venue_map,
  public.source_import_runs,
  public.presence_snapshots,
  public.venue_checkins,
  public.reward_redemptions,
  public.user_profiles,
  public.user_devices,
  public.user_favorites,
  public.owner_audit_logs,
  public.venue_staff_codes,
  public.venue_subscriptions,
  public.venue_analytics_events
from public, anon, authenticated;

-- Venue deal creation/editing is the one intentional authenticated browser
-- mutation path. RLS binds it to an assigned venue and subscription plan.
revoke delete, truncate, references, trigger on public.venue_deals from public, anon, authenticated;

-- Preserve the intentionally supported read and venue-marketing surfaces.
grant select on public.venues, public.live_status to anon, authenticated;
grant select on public.venue_deals to anon, authenticated;
grant select on public.venue_subscriptions, public.venue_analytics_events to authenticated;
grant insert, update on public.venue_deals to authenticated;
