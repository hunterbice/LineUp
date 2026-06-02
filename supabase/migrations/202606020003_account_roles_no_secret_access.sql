alter table public.venue_admins
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.venue_admins
  drop constraint if exists venue_admins_pkey;

alter table public.venue_admins
  alter column venue_id drop not null,
  add constraint venue_admins_pkey primary key (id);

alter table public.venue_admins
  drop constraint if exists venue_admins_role_check,
  drop constraint if exists owner_has_no_venue;

alter table public.venue_admins
  add constraint venue_admins_role_check
    check (role in ('owner', 'admin', 'venue_owner', 'venue_staff', 'venue_admin')),
  add constraint venue_admins_role_scope
    check (
      (role in ('owner', 'admin') and venue_id is null)
      or
      (role in ('venue_owner', 'venue_staff', 'venue_admin') and venue_id is not null)
    );

create unique index if not exists venue_admins_one_owner_role_per_user_idx
  on public.venue_admins (user_id, role)
  where role in ('owner', 'admin');

create unique index if not exists venue_admins_one_venue_role_per_user_idx
  on public.venue_admins (user_id, venue_id, role)
  where venue_id is not null;

insert into public.venue_admins (user_id, venue_id, role)
select id, null, 'owner'
from auth.users
where lower(email) = lower('hunterbice0@gmail.com')
on conflict do nothing;
