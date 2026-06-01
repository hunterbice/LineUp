alter table public.venue_confidence_signals
  add column if not exists event text,
  add column if not exists cover_amount text,
  add column if not exists cover_active boolean not null default false;

create or replace function public.submit_venue_status_update(
  p_venue_id text,
  p_crowd_level text,
  p_wait_minutes integer default null,
  p_cover_amount text default null,
  p_cover_active boolean default false,
  p_event text default null,
  p_note text default null
)
returns public.live_status
language plpgsql
security definer
set search_path = public
as $$
declare
  source_kind text;
  signal_reliability numeric(4,3);
  result public.live_status;
begin
  if not exists (select 1 from public.venues where id = p_venue_id and status = 'active' and deprecated = false) then
    raise exception 'Unknown or inactive venue: %', p_venue_id;
  end if;

  if p_crowd_level is null or p_crowd_level <> any(array['dead','slow','busy','packed']) then
    raise exception 'Invalid crowd level: %', p_crowd_level;
  end if;

  if not ((select private.is_lineup_owner()) or (select private.can_manage_venue(p_venue_id))) then
    raise exception 'Not allowed to manage venue %', p_venue_id;
  end if;

  source_kind := case when (select private.is_lineup_owner()) then 'owner_override' else 'venue_admin' end;
  signal_reliability := case when source_kind = 'owner_override' then 0.980 else 0.950 end;

  insert into public.venue_confidence_signals
    (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible, event, cover_amount, cover_active)
  values
    (
      p_venue_id,
      source_kind,
      case when source_kind = 'owner_override' then 'Owner live update' else 'Venue live update' end,
      p_crowd_level,
      greatest(0, least(180, coalesce(p_wait_minutes, 0))),
      100,
      signal_reliability,
      now(),
      now() + interval '3 hours',
      jsonb_build_object('note', p_note, 'submitted_by', auth.uid(), 'source', source_kind),
      true,
      nullif(trim(coalesce(p_event, '')), ''),
      nullif(trim(coalesce(p_cover_amount, '')), ''),
      coalesce(p_cover_active, false)
    );

  result := public.recompute_venue_live_status(p_venue_id, now());

  update public.live_status
  set
    cover_amount = nullif(trim(coalesce(p_cover_amount, '')), ''),
    cover_active = coalesce(p_cover_active, false),
    event = coalesce(nullif(trim(coalesce(p_event, '')), ''), event),
    updated_by_role = case when source_kind = 'owner_override' then 'owner' else 'venue_admin' end,
    updated_at = now()
  where venue_id = p_venue_id
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.submit_venue_status_update(text, text, integer, text, boolean, text, text) from anon, public;
grant execute on function public.submit_venue_status_update(text, text, integer, text, boolean, text, text) to authenticated;;
