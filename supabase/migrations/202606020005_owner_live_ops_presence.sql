alter table public.presence_snapshots
  add column if not exists lat_exact numeric(10,7),
  add column if not exists lng_exact numeric(10,7);

alter table public.app_signal_events
  drop constraint if exists app_signal_events_event_type_check;

alter table public.app_signal_events
  add constraint app_signal_events_event_type_check check (event_type = any (array[
    'app_open',
    'app_resume',
    'heartbeat',
    'venue_card_open',
    'detail_view',
    'directions_tap',
    'map_pin_tap',
    'favorite_add',
    'favorite_remove',
    'lineleap_tap',
    'pulse_recommendation_view',
    'report_open',
    'share_tap',
    'verified_report',
    'user_report',
    'verified_check_in',
    'presence_snapshot'
  ]));

create index if not exists presence_snapshots_exact_created_idx
  on public.presence_snapshots (created_at desc)
  where lat_exact is not null and lng_exact is not null;
