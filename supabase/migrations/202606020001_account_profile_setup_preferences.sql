alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists profile_setup_completed boolean not null default false,
  add column if not exists notification_pref text not null default 'unset'
    check (notification_pref in ('unset','enabled','disabled','denied')),
  add column if not exists location_pref text not null default 'unset'
    check (location_pref in ('unset','enabled','disabled','denied')),
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists data_policy_seen_at timestamptz;

comment on column public.user_profiles.interaction_visibility is
  'Public display mode only. Backend records still store authenticated user_id for moderation and trust.';
