drop policy if exists "Reports are publicly readable" on public.reports;

create index if not exists reports_public_feed_idx
  on public.reports (venue_id, created_at desc)
  where source = 'user_report';
