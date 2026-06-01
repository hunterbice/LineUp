drop policy if exists "Owners can manage reporter reliability" on public.reporter_reliability;
create policy "Owners can insert reporter reliability"
  on public.reporter_reliability for insert
  with check ((select private.is_lineup_owner()));
create policy "Owners can update reporter reliability"
  on public.reporter_reliability for update
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));
create policy "Owners can delete reporter reliability"
  on public.reporter_reliability for delete
  using ((select private.is_lineup_owner()));

drop policy if exists "Owners can manage venue priors" on public.venue_hourly_priors;
create policy "Owners can insert venue priors"
  on public.venue_hourly_priors for insert
  with check ((select private.is_lineup_owner()));
create policy "Owners can update venue priors"
  on public.venue_hourly_priors for update
  using ((select private.is_lineup_owner()))
  with check ((select private.is_lineup_owner()));
create policy "Owners can delete venue priors"
  on public.venue_hourly_priors for delete
  using ((select private.is_lineup_owner()));;
