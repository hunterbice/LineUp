-- Priority 16: review-safe early access membership and launch-deal interest.
-- All mutations flow through the authenticated, signed-device Edge Function.

alter table public.user_profiles
  add column if not exists early_access_joined_at timestamptz,
  add column if not exists campus_slug text;

alter table public.user_profiles
  drop constraint if exists user_profiles_campus_slug_check;

alter table public.user_profiles
  add constraint user_profiles_campus_slug_check
  check (campus_slug is null or campus_slug in ('university_of_arizona'));

create table if not exists public.launch_deal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.venues(id) on delete cascade,
  campus_slug text not null default 'university_of_arizona'
    check (campus_slug in ('university_of_arizona')),
  created_at timestamptz not null default now(),
  unique (user_id, venue_id)
);

create index if not exists launch_deal_requests_venue_created_idx
  on public.launch_deal_requests (venue_id, created_at desc);

alter table public.launch_deal_requests enable row level security;

revoke all on public.launch_deal_requests from public, anon, authenticated;

create or replace function public.launch_deal_interest(target_venue_id text)
returns table (venue_id text, request_count bigint, latest_request_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.venue_id,
    count(*)::bigint as request_count,
    max(r.created_at) as latest_request_at
  from public.launch_deal_requests r
  where r.venue_id = target_venue_id
    and (select private.can_manage_venue(target_venue_id))
  group by r.venue_id;
$$;

revoke execute on function public.launch_deal_interest(text) from public, anon;
grant execute on function public.launch_deal_interest(text) to authenticated;

comment on table public.launch_deal_requests is
  'Authenticated early-access requests for a venue launch deal. Venue operators receive aggregate counts only.';
