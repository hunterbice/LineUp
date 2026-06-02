alter table public.venues
  drop constraint if exists venues_status_check;

alter table public.venues
  add constraint venues_status_check
  check (status in ('active', 'closed', 'hidden'));
