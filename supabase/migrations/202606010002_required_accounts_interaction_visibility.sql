alter table public.user_profiles
  add column if not exists interaction_visibility text not null default 'anonymous'
    check (interaction_visibility in ('anonymous','public'));

alter table public.reports
  add column if not exists interaction_visibility text not null default 'anonymous'
    check (interaction_visibility in ('anonymous','public'));

alter table public.venue_checkins
  add column if not exists interaction_visibility text not null default 'anonymous'
    check (interaction_visibility in ('anonymous','public'));

alter table public.app_signal_events
  add column if not exists interaction_visibility text not null default 'anonymous'
    check (interaction_visibility in ('anonymous','public'));
