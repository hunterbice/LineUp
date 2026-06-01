drop policy if exists "Anyone can submit venue reports" on public.reports;
create policy "Anyone can submit venue reports"
  on public.reports for insert
  with check (
    source = 'user_report'
    and location_verified = false
    and distance_m is null
    and reporter_reliability_snapshot is null
    and exists (
      select 1
      from public.venues v
      where v.id = reports.venue_id
        and v.status = 'active'
        and v.deprecated = false
    )
  );;
