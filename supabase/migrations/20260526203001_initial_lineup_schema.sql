create extension if not exists pgcrypto;

create table public.venues (
  id text primary key,
  name text not null,
  area text not null check (area in ('university', 'downtown')),
  status text not null default 'active' check (status in ('active', 'closed')),
  deprecated boolean not null default false,
  tag text,
  address text not null,
  map_query text,
  lat numeric(9,6),
  lng numeric(9,6),
  scenes text[] not null default '{}',
  logo_key text,
  open_hour integer check (open_hour between 0 and 23),
  close_hour integer check (close_hour between 0 and 23),
  last_call text,
  line_leap_url text,
  default_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.live_status (
  venue_id text primary key references public.venues(id) on delete cascade,
  crowd_level text not null default 'dead' check (crowd_level in ('dead', 'slow', 'busy', 'packed')),
  wait_minutes integer not null default 0 check (wait_minutes between 0 and 180),
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  momentum text not null default 'steady' check (momentum in ('cooling_down', 'steady', 'heating_up')),
  cover_amount text,
  cover_active boolean not null default false,
  event text,
  sources text[] not null default '{}',
  fresh_at timestamptz not null default now(),
  updated_by_role text not null default 'seed' check (updated_by_role in ('seed', 'report', 'venue_admin', 'owner', 'system')),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  crowd_level text not null check (crowd_level in ('dead', 'slow', 'busy', 'packed')),
  wait_minutes integer not null default 0 check (wait_minutes between 0 and 180),
  cover_amount text,
  cover_active boolean not null default false,
  note text,
  photo_signal boolean not null default false,
  source text not null default 'user_report' check (source in ('user_report', 'venue_admin', 'owner', 'system')),
  device_id text,
  created_at timestamptz not null default now()
);

create table public.venue_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text references public.venues(id) on delete cascade,
  role text not null check (role in ('owner', 'venue_admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id, role),
  constraint owner_has_no_venue check ((role = 'owner' and venue_id is null) or (role = 'venue_admin' and venue_id is not null))
);

create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  report_id uuid references public.reports(id) on delete set null,
  points integer not null check (points > 0 and points <= 100),
  reason text not null,
  created_at timestamptz not null default now()
);

create index reports_venue_created_idx on public.reports (venue_id, created_at desc);
create index live_status_updated_idx on public.live_status (updated_at desc);
create index venue_admins_user_idx on public.venue_admins (user_id);
create index venue_admins_venue_idx on public.venue_admins (venue_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger venues_touch_updated_at
before update on public.venues
for each row execute function public.touch_updated_at();

create trigger live_status_touch_updated_at
before update on public.live_status
for each row execute function public.touch_updated_at();

create or replace function public.is_lineup_owner()
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
      and va.role = 'owner'
  );
$$;

create or replace function public.can_manage_venue(target_venue_id text)
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
      and (va.role = 'owner' or (va.role = 'venue_admin' and va.venue_id = target_venue_id))
  );
$$;

alter table public.venues enable row level security;
alter table public.live_status enable row level security;
alter table public.reports enable row level security;
alter table public.venue_admins enable row level security;
alter table public.reward_events enable row level security;

create policy "Venues are publicly readable"
on public.venues for select
to anon, authenticated
using (true);

create policy "Live status is publicly readable"
on public.live_status for select
to anon, authenticated
using (true);

create policy "Reports are publicly readable"
on public.reports for select
to anon, authenticated
using (true);

create policy "Anyone can submit venue reports"
on public.reports for insert
to anon, authenticated
with check (
  exists (select 1 from public.venues v where v.id = venue_id and v.status = 'active' and v.deprecated = false)
);

create policy "Venue admins can update their live status"
on public.live_status for update
to authenticated
using ((select public.can_manage_venue(venue_id)))
with check ((select public.can_manage_venue(venue_id)));

create policy "Owners can insert live status"
on public.live_status for insert
to authenticated
with check ((select public.is_lineup_owner()));

create policy "Admins can read their access grants"
on public.venue_admins for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_lineup_owner()));

create policy "Owners can manage access grants"
on public.venue_admins for all
to authenticated
using ((select public.is_lineup_owner()))
with check ((select public.is_lineup_owner()));

create policy "Users can read their own rewards"
on public.reward_events for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_lineup_owner()));

create policy "Anyone can create anonymous reward events"
on public.reward_events for insert
to anon, authenticated
with check (points <= 30);

create or replace view public.active_venue_status
with (security_invoker = true)
as
select
  v.id,
  v.name,
  v.area,
  v.status,
  v.deprecated,
  v.tag,
  v.address,
  v.map_query,
  v.lat,
  v.lng,
  v.scenes,
  v.logo_key,
  v.open_hour,
  v.close_hour,
  v.last_call,
  v.line_leap_url,
  coalesce(ls.event, v.default_event) as event,
  ls.crowd_level,
  ls.wait_minutes,
  ls.confidence,
  ls.momentum,
  ls.cover_amount,
  ls.cover_active,
  ls.sources,
  ls.fresh_at,
  ls.updated_at as status_updated_at
from public.venues v
join public.live_status ls on ls.venue_id = v.id
where v.status = 'active' and v.deprecated = false;

insert into public.venues (id, name, area, status, deprecated, tag, address, map_query, lat, lng, scenes, logo_key, open_hour, close_hour, last_call, line_leap_url, default_event) values
('bens', 'Gentle Ben’s', 'university', 'active', false, 'Brewpub · upstairs deck', '865 E University Blvd, Tucson, AZ 85719', 'Gentle Ben''s 865 E University Blvd Tucson AZ 85719', 32.231872, -110.958031, array['patio','friends','beer','classic'], 'gentlebens', 20, 2, '1:45 AM', 'https://tickets.lineleap.com/venues/x8A6Qq18onI9LuD9iTvJ', 'Bear Down DJ set'),
('noanch', 'No Anchovies', 'university', 'active', false, 'Pizza · upstairs club', '870 E University Blvd, Tucson, AZ 85719', 'No Anchovies 870 E University Blvd Tucson AZ 85719', 32.231270, -110.958466, array['dance','friends','late','pizza'], 'noanch', 20, 2, '1:45 AM', null, 'Upstairs DJ'),
('frog', 'Frog & Firkin', 'university', 'active', false, 'Pub · upstairs patio', '874 E University Blvd, Tucson, AZ 85719', 'Frog & Firkin 874 E University Blvd Tucson AZ 85719', 32.231310, -110.958307, array['chill','friends','patio','pub'], 'frogfirkin', 15, 2, '1:45 AM', null, 'Patio crowd'),
('saddle', 'The Saddle', 'university', 'active', false, 'Country · EDM mix', '820 E University Blvd, Tucson, AZ 85719', 'The Saddle 820 E University Blvd Tucson AZ 85719', 32.231490, -110.958630, array['dance','country','edm','lively'], 'saddle', 20, 2, '1:45 AM', null, 'Country night'),
('fuku', 'Fuku Sushi', 'university', 'active', false, 'Sake bombs · DJ nights', '940 E University Blvd, Tucson, AZ 85719', 'Fuku Sushi 940 E University Blvd Tucson AZ 85719', 32.231345, -110.957386, array['no_cover','food','sake','friends'], 'fuku', 19, 2, '1:45 AM', 'https://tickets.lineleap.com/venues/YFkL5bY30v4tP9bjs6ic', 'Sake special'),
('agave', 'Agave House', 'university', 'active', false, 'Cocina · 100 agaves', '943 E University Blvd, Tucson, AZ 85719', 'Agave House 943 E University Blvd Tucson AZ 85719', 32.232003, -110.957055, array['cocktails','food','tequila','chill'], 'agave', 18, 2, '1:45 AM', null, 'College night'),
('pig', 'The Blind Pig', 'university', 'active', false, 'BBQ · speakeasy bar', '943 E University Blvd #115, Tucson, AZ 85719', 'The Blind Pig 943 E University Blvd #115 Tucson AZ 85719', 32.231950, -110.956980, array['chill','friends','bbq','speakeasy'], 'blindpig', 20, 2, '1:45 AM', 'https://tickets.lineleap.com/venues/68qkdDCFpSfoYYohyZtx', 'Late-night patio'),
('omal', 'O’Malley’s Bar & Grill', 'downtown', 'active', false, '4th Ave · dance floor', '247 N 4th Ave, Tucson, AZ 85705', 'O''Malley''s Bar & Grill 247 N 4th Ave Tucson AZ 85705', 32.224868, -110.965798, array['dance','lively','sports','late'], 'OM', 20, 2, '1:45 AM', null, 'Thursday special'),
('hut', 'The Hut', 'downtown', 'active', false, '4th Ave · tiki patio', '305 N 4th Ave, Tucson, AZ 85705', 'The Hut 305 N 4th Ave Tucson AZ 85705', 32.225439, -110.965791, array['patio','tiki','friends','lively'], 'HT', 20, 2, '1:45 AM', null, 'Closing soon deal'),
('dirt', 'Dirtbag’s', 'downtown', 'active', false, 'Speedway · college crowd', '1800 E Speedway Blvd, Tucson, AZ 85719', 'Dirtbag''s 1800 E Speedway Blvd Tucson AZ 85719', 32.235728, -110.945127, array['college','sports','casual','no_cover'], 'DB', 20, 2, '1:45 AM', null, 'College crowd'),
('sky', 'Sky Bar', 'downtown', 'active', false, '4th Ave · rooftop', '536 N 4th Ave, Tucson, AZ 85705', 'Sky Bar 536 N 4th Ave Tucson AZ 85705', 32.228706, -110.965304, array['rooftop','dance','cocktails','lively'], 'SK', 19, 2, '1:45 AM', null, 'DJ Night · 10PM-2AM'),
('ibt', 'IBT’s Bar + Food', 'downtown', 'active', false, '4th Ave · drag + dance', '616 N 4th Ave, Tucson, AZ 85705', 'IBT''s Bar + Food 616 N 4th Ave Tucson AZ 85705', 32.229551, -110.965380, array['dance','drag','late','lively'], 'IB', 20, 2, '1:45 AM', null, 'Drag show'),
('play', 'Playground Bar & Lounge', 'downtown', 'active', false, 'Downtown · rooftop', '278 E Congress St, Tucson, AZ 85701', 'Playground Bar & Lounge 278 E Congress St Tucson AZ 85701', 32.221969, -110.967320, array['rooftop','dance','downtown','cocktails'], 'PG', 20, 2, '1:45 AM', null, 'Rooftop DJ'),
('hifi', 'Hi Fi Kitchen & Cocktails', 'downtown', 'closed', true, 'Downtown · music + bar', '345 E Congress St, Tucson, AZ 85701', 'Hi Fi Kitchen & Cocktails 345 E Congress St Tucson AZ 85701', 32.221968, -110.965555, array['historical'], 'HI', 20, 2, '1:45 AM', null, 'Closed venue');

insert into public.live_status (venue_id, crowd_level, wait_minutes, confidence, momentum, cover_amount, cover_active, event, sources, fresh_at, updated_by_role) values
('bens', 'packed', 25, 'high', 'heating_up', '$5', false, 'Bear Down DJ set', array['Venue update','Heavy entry volume','Trusted scout'], now() - interval '4 minutes', 'seed'),
('noanch', 'busy', 15, 'medium', 'steady', '$0', false, 'Upstairs DJ', array['Historical baseline','App interest'], now() - interval '11 minutes', 'seed'),
('frog', 'slow', 5, 'medium', 'cooling_down', '$0', false, 'Patio crowd', array['Scout report','Typical traffic'], now() - interval '6 minutes', 'seed'),
('saddle', 'busy', 20, 'medium', 'heating_up', '$5', false, 'Country night', array['Event boost','Reports'], now() - interval '9 minutes', 'seed'),
('fuku', 'slow', 0, 'medium', 'steady', '$0', false, 'Sake special', array['Historical baseline','LineLeap taps'], now() - interval '14 minutes', 'seed'),
('agave', 'dead', 0, 'low', 'steady', '$0', false, 'College night', array['Historical only'], now() - interval '22 minutes', 'seed'),
('pig', 'busy', 35, 'high', 'steady', '$5', false, 'Late-night patio', array['LineLeap taps','Recent reports'], now() - interval '7 minutes', 'seed'),
('omal', 'packed', 30, 'high', 'heating_up', '$5', false, 'Thursday special', array['Staff update','Reports'], now() - interval '5 minutes', 'seed'),
('hut', 'busy', 10, 'medium', 'steady', '$0', false, 'Closing soon deal', array['Historical','App interest'], now() - interval '8 minutes', 'seed'),
('dirt', 'slow', 0, 'medium', 'steady', '$0', false, 'College crowd', array['Reports'], now() - interval '13 minutes', 'seed'),
('sky', 'slow', 0, 'medium', 'heating_up', '$5', false, 'DJ Night · 10PM-2AM', array['Event boost','Historical'], now() - interval '17 minutes', 'seed'),
('ibt', 'busy', 15, 'medium', 'steady', '$5', false, 'Drag show', array['Event boost','Reports'], now() - interval '6 minutes', 'seed'),
('play', 'busy', 20, 'medium', 'steady', '$5', false, 'Rooftop DJ', array['Historical','App interest'], now() - interval '10 minutes', 'seed'),
('hifi', 'dead', 0, 'low', 'cooling_down', '$0', false, 'Closed venue', array['Deprecated venue record'], now() - interval '19 minutes', 'seed');;
