create or replace function public.recompute_live_status_after_confidence_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_venue_live_status(new.venue_id, new.observed_at);
  return new;
end;
$$;

create or replace function public.recompute_live_status_after_app_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.venue_id is not null then
    perform public.recompute_venue_live_status(new.venue_id, new.created_at);
  end if;
  return new;
end;
$$;

drop trigger if exists reports_recompute_live_status on public.reports;

drop trigger if exists confidence_signals_recompute_live_status on public.venue_confidence_signals;
create trigger confidence_signals_recompute_live_status
after insert on public.venue_confidence_signals
for each row execute function public.recompute_live_status_after_confidence_signal();

drop trigger if exists app_signals_recompute_live_status on public.app_signal_events;
create trigger app_signals_recompute_live_status
after insert on public.app_signal_events
for each row execute function public.recompute_live_status_after_app_signal();

revoke execute on function public.recompute_live_status_after_confidence_signal() from anon, authenticated, public;
revoke execute on function public.recompute_live_status_after_app_signal() from anon, authenticated, public;;
