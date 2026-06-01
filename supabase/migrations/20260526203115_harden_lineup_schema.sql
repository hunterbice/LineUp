create schema if not exists private;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.is_lineup_owner() set schema private;
alter function public.can_manage_venue(text) set schema private;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.is_lineup_owner() from public, anon;
revoke execute on function private.can_manage_venue(text) from public, anon;
grant execute on function private.is_lineup_owner() to authenticated;
grant execute on function private.can_manage_venue(text) to authenticated;

alter policy "Venue admins can update their live status"
on public.live_status
using ((select private.can_manage_venue(venue_id)))
with check ((select private.can_manage_venue(venue_id)));

alter policy "Owners can insert live status"
on public.live_status
with check ((select private.is_lineup_owner()));

alter policy "Admins can read their access grants"
on public.venue_admins
using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));

drop policy if exists "Owners can manage access grants" on public.venue_admins;

create policy "Owners can insert access grants"
on public.venue_admins for insert
to authenticated
with check ((select private.is_lineup_owner()));

create policy "Owners can update access grants"
on public.venue_admins for update
to authenticated
using ((select private.is_lineup_owner()))
with check ((select private.is_lineup_owner()));

create policy "Owners can delete access grants"
on public.venue_admins for delete
to authenticated
using ((select private.is_lineup_owner()));

alter policy "Users can read their own rewards"
on public.reward_events
using (user_id = (select auth.uid()) or (select private.is_lineup_owner()));

create index reward_events_user_idx on public.reward_events (user_id);
create index reward_events_report_idx on public.reward_events (report_id);
;
