-- LineUp venue marketing layer.
-- Deals and paid placement are intentionally separate from live crowd truth.

create table if not exists public.venue_subscriptions (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade unique,
  plan text not null default 'free',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_subscriptions_plan_check
    check (plan in ('free', 'pro', 'boost', 'premier')),
  constraint venue_subscriptions_status_check
    check (status in ('active', 'trialing', 'past_due', 'canceled'))
);

create table if not exists public.venue_deals (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  title text not null,
  description text,
  deal_type text not null default 'deal',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  is_promoted boolean not null default false,
  promotion_tier text not null default 'standard',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_deals_title_len
    check (char_length(title) between 3 and 80),
  constraint venue_deals_description_len
    check (description is null or char_length(description) <= 240),
  constraint venue_deals_valid_window
    check (ends_at > starts_at),
  constraint venue_deals_deal_type_check
    check (deal_type in ('deal', 'event', 'cover', 'happy_hour', 'special')),
  constraint venue_deals_promotion_tier_check
    check (promotion_tier in ('standard', 'boost', 'premier')),
  constraint venue_deals_promoted_tier_check
    check ((is_promoted = false and promotion_tier = 'standard') or is_promoted = true)
);

create table if not exists public.venue_analytics_events (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  deal_id uuid references public.venue_deals(id) on delete set null,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  device_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint venue_analytics_event_type_check
    check (
      event_type in (
        'deal_impression',
        'deal_tap',
        'venue_detail_open',
        'report_open',
        'report_submit',
        'favorite_add'
      )
    )
);

create index if not exists venue_deals_active_window_idx
  on public.venue_deals (is_active, starts_at, ends_at);
create index if not exists venue_deals_venue_id_idx
  on public.venue_deals (venue_id);
create index if not exists venue_deals_promoted_idx
  on public.venue_deals (is_promoted, promotion_tier);
create index if not exists venue_subscriptions_venue_idx
  on public.venue_subscriptions (venue_id, status, plan);
create index if not exists venue_analytics_events_venue_created_idx
  on public.venue_analytics_events (venue_id, created_at desc);
create index if not exists venue_analytics_events_deal_created_idx
  on public.venue_analytics_events (deal_id, created_at desc);
create index if not exists venue_analytics_events_type_created_idx
  on public.venue_analytics_events (event_type, created_at desc);

create or replace function private.is_lineup_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_admins va
    where va.user_id = (select auth.uid())
      and va.role in ('owner', 'admin')
  );
$$;

create or replace function private.can_manage_venue(target_venue_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_admins va
    where va.user_id = (select auth.uid())
      and (
        va.role in ('owner', 'admin')
        or (va.role in ('venue_owner', 'venue_staff', 'venue_admin') and va.venue_id = target_venue_id)
      )
  );
$$;

create or replace function private.venue_has_deal_plan(target_venue_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_subscriptions vs
    where vs.venue_id = target_venue_id
      and vs.status in ('active', 'trialing')
      and (vs.ends_at is null or vs.ends_at > now())
      and vs.plan in ('pro', 'boost', 'premier')
  );
$$;

create or replace function private.can_promote_venue_deal(target_venue_id text, target_tier text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select private.is_lineup_owner())
    or exists (
      select 1
      from public.venue_subscriptions vs
      where vs.venue_id = target_venue_id
        and vs.status in ('active', 'trialing')
        and (vs.ends_at is null or vs.ends_at > now())
        and (
          (target_tier = 'boost' and vs.plan in ('boost', 'premier'))
          or (target_tier = 'premier' and vs.plan = 'premier')
        )
    );
$$;

alter table public.venue_deals enable row level security;
alter table public.venue_subscriptions enable row level security;
alter table public.venue_analytics_events enable row level security;

drop policy if exists "Active current venue deals are publicly readable" on public.venue_deals;
create policy "Active current venue deals are publicly readable"
on public.venue_deals for select
to anon, authenticated
using (
  (is_active = true and starts_at <= now() and ends_at > now())
  or ((select auth.role()) = 'authenticated' and (select private.can_manage_venue(venue_id)))
);

drop policy if exists "Venue staff can create plan-gated deals" on public.venue_deals;
create policy "Venue staff can create plan-gated deals"
on public.venue_deals for insert
to authenticated
with check (
  (select private.can_manage_venue(venue_id))
  and (
    (select private.is_lineup_owner())
    or (select private.venue_has_deal_plan(venue_id))
  )
  and (
    is_promoted = false
    or (select private.can_promote_venue_deal(venue_id, promotion_tier))
  )
);

drop policy if exists "Venue staff can update plan-gated deals" on public.venue_deals;
create policy "Venue staff can update plan-gated deals"
on public.venue_deals for update
to authenticated
using ((select private.can_manage_venue(venue_id)))
with check (
  (select private.can_manage_venue(venue_id))
  and (
    (select private.is_lineup_owner())
    or (select private.venue_has_deal_plan(venue_id))
  )
  and (
    is_promoted = false
    or (select private.can_promote_venue_deal(venue_id, promotion_tier))
  )
);

drop policy if exists "Venue staff can deactivate deals" on public.venue_deals;
create policy "Venue staff can deactivate deals"
on public.venue_deals for delete
to authenticated
using ((select private.is_lineup_owner()));

drop policy if exists "Venue subscriptions readable by assigned venue roles" on public.venue_subscriptions;
create policy "Venue subscriptions readable by assigned venue roles"
on public.venue_subscriptions for select
to authenticated
using ((select private.can_manage_venue(venue_id)));

drop policy if exists "Owners manage venue subscriptions" on public.venue_subscriptions;
create policy "Owners manage venue subscriptions"
on public.venue_subscriptions for all
to authenticated
using ((select private.is_lineup_owner()))
with check ((select private.is_lineup_owner()));

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
  and jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 2048
);

drop policy if exists "Venue staff can read own analytics" on public.venue_analytics_events;
create policy "Venue staff can read own analytics"
on public.venue_analytics_events for select
to authenticated
using ((select private.can_manage_venue(venue_id)));

drop trigger if exists venue_deals_touch_updated_at on public.venue_deals;
create trigger venue_deals_touch_updated_at
before update on public.venue_deals
for each row execute function public.touch_updated_at();

drop trigger if exists venue_subscriptions_touch_updated_at on public.venue_subscriptions;
create trigger venue_subscriptions_touch_updated_at
before update on public.venue_subscriptions
for each row execute function public.touch_updated_at();

insert into public.venue_subscriptions (venue_id, plan, status)
select id, 'free', 'active'
from public.venues
where status = 'active' and deprecated = false
on conflict (venue_id) do nothing;
