alter table public.reporter_reliability
  add column if not exists verified_report_count integer not null default 0 check (verified_report_count >= 0),
  add column if not exists checkin_count integer not null default 0 check (checkin_count >= 0),
  add column if not exists last_checkin_at timestamptz,
  add column if not exists last_score_at timestamptz,
  add column if not exists quality_summary jsonb not null default '{}'::jsonb;

create or replace function public.crowd_bucket_index(bucket text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case bucket
    when 'dead' then 0
    when 'slow' then 1
    when 'busy' then 2
    when 'packed' then 3
    else null
  end;
$$;

create or replace function public.recompute_reporter_reliability(target_device_id text)
returns public.reporter_reliability
language plpgsql
security definer
set search_path = public
as $$
declare
  stats record;
  score numeric(5,3);
  tier text;
  result public.reporter_reliability;
begin
  if target_device_id is null or length(trim(target_device_id)) = 0 then
    return null;
  end if;

  with report_stats as (
    select
      count(*)::integer as report_count,
      count(*) filter (where location_verified)::integer as verified_report_count,
      max(created_at) as last_report_at
    from public.reports
    where device_id = target_device_id
  ), checkin_stats as (
    select
      count(*) filter (where verified)::integer as checkin_count,
      max(created_at) filter (where verified) as last_checkin_at
    from public.venue_checkins
    where device_id = target_device_id
  ), report_agreement as (
    select
      r.id,
      case
        when validator.id is null then null
        when abs(public.crowd_bucket_index(r.crowd_level) - public.crowd_bucket_index(validator.crowd_level)) <= 1 then true
        else false
      end as agrees
    from public.reports r
    left join lateral (
      select s.id, s.crowd_level
      from public.venue_confidence_signals s
      where s.venue_id = r.venue_id
        and s.crowd_level is not null
        and s.observed_at > r.created_at
        and s.observed_at <= r.created_at + interval '75 minutes'
        and coalesce(s.metadata->>'report_id', '') <> r.id::text
        and s.source_type in ('venue_admin','owner_override','verified_scout','trusted_reporter','gps_verified_report','verified_check_in','photo_report','ground_truth_calibration')
      order by
        case when s.source_type in ('venue_admin','owner_override','ground_truth_calibration') then 0 else 1 end,
        s.observed_at asc
      limit 1
    ) validator on true
    where r.device_id = target_device_id
  ), agreement_stats as (
    select
      count(*) filter (where agrees is true)::integer as agreement_count,
      count(*) filter (where agrees is false)::integer as disagreement_count,
      count(*) filter (where agrees is not null)::integer as judged_count
    from report_agreement
  )
  select
    coalesce(rs.report_count,0) as report_count,
    coalesce(rs.verified_report_count,0) as verified_report_count,
    rs.last_report_at,
    coalesce(cs.checkin_count,0) as checkin_count,
    cs.last_checkin_at,
    coalesce(ags.agreement_count,0) as agreement_count,
    coalesce(ags.disagreement_count,0) as disagreement_count,
    coalesce(ags.judged_count,0) as judged_count
  into stats
  from report_stats rs
  cross join checkin_stats cs
  cross join agreement_stats ags;

  score := 0.500
    + least(0.120, stats.report_count * 0.012)
    + least(0.140, stats.verified_report_count * 0.035)
    + least(0.100, stats.checkin_count * 0.025);

  if stats.judged_count > 0 then
    score := score + least(0.160, (stats.agreement_count::numeric / stats.judged_count) * 0.160)
                   - least(0.180, (stats.disagreement_count::numeric / stats.judged_count) * 0.180);
  end if;

  score := greatest(0.150, least(0.950, score));

  tier := case
    when stats.disagreement_count >= 3 and score < 0.350 then 'flagged'
    when score >= 0.780 and stats.report_count >= 8 then 'trusted'
    when stats.report_count >= 2 or stats.checkin_count >= 2 then 'normal'
    else 'new'
  end;

  insert into public.reporter_reliability(
    device_id, user_id, trust_tier, reliability_score, report_count, verified_report_count,
    checkin_count, agreement_count, disagreement_count, last_report_at, last_checkin_at,
    last_score_at, quality_summary, updated_at
  ) values (
    target_device_id, auth.uid(), tier, score, stats.report_count, stats.verified_report_count,
    stats.checkin_count, stats.agreement_count, stats.disagreement_count, stats.last_report_at,
    stats.last_checkin_at, now(), jsonb_build_object(
      'judged_reports', stats.judged_count,
      'verified_reports', stats.verified_report_count,
      'verified_checkins', stats.checkin_count,
      'model', 'bayesian_quality_v1'
    ), now()
  )
  on conflict (device_id) do update set
    trust_tier = excluded.trust_tier,
    reliability_score = excluded.reliability_score,
    report_count = excluded.report_count,
    verified_report_count = excluded.verified_report_count,
    checkin_count = excluded.checkin_count,
    agreement_count = excluded.agreement_count,
    disagreement_count = excluded.disagreement_count,
    last_report_at = excluded.last_report_at,
    last_checkin_at = excluded.last_checkin_at,
    last_score_at = excluded.last_score_at,
    quality_summary = excluded.quality_summary,
    updated_at = now()
  returning * into result;

  update public.reports
  set reporter_reliability_snapshot = result.reliability_score
  where device_id = target_device_id
    and reporter_reliability_snapshot is null;

  return result;
end;
$$;

create or replace function public.refresh_reporter_after_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.device_id is not null and new.verified then
    perform public.recompute_reporter_reliability(new.device_id);
  end if;
  return new;
end;
$$;

drop trigger if exists checkins_refresh_reporter_reliability on public.venue_checkins;
create trigger checkins_refresh_reporter_reliability
after insert on public.venue_checkins
for each row execute function public.refresh_reporter_after_checkin();

create or replace function public.refresh_recent_reporters_after_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  if new.crowd_level is null then
    return new;
  end if;

  if new.source_type in ('venue_admin','owner_override','verified_scout','trusted_reporter','gps_verified_report','verified_check_in','photo_report','ground_truth_calibration') then
    for rec in
      select distinct device_id
      from public.reports
      where venue_id = new.venue_id
        and device_id is not null
        and created_at >= new.observed_at - interval '75 minutes'
        and created_at < new.observed_at
    loop
      perform public.recompute_reporter_reliability(rec.device_id);
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists confidence_signals_refresh_reporters on public.venue_confidence_signals;
create trigger confidence_signals_refresh_reporters
after insert on public.venue_confidence_signals
for each row execute function public.refresh_recent_reporters_after_signal();

create or replace function public.create_confidence_signal_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signal_kind text;
  base_reliability numeric(4,3);
  reporter_score numeric(4,3);
begin
  select rr.reliability_score into reporter_score
  from public.reporter_reliability rr
  where rr.device_id = new.device_id;

  reporter_score := coalesce(reporter_score, 0.500);
  signal_kind := case
    when new.photo_signal then 'photo_report'
    when new.location_verified then 'gps_verified_report'
    else 'user_report'
  end;

  base_reliability := case
    when new.photo_signal then 0.760
    when new.location_verified then 0.720
    else 0.620
  end;

  base_reliability := least(0.950, greatest(0.300, (base_reliability * 0.70) + (reporter_score * 0.30)));

  if new.note is not null and length(trim(new.note)) >= 8 then
    base_reliability := least(0.950, base_reliability + 0.050);
  end if;

  insert into public.venue_confidence_signals
    (venue_id, source_type, signal_label, crowd_level, wait_minutes, signal_strength, reliability, observed_at, expires_at, metadata, public_visible)
  values
    (
      new.venue_id,
      signal_kind,
      case
        when new.photo_signal then 'User photo report'
        when new.location_verified then 'Nearby user report'
        else 'User crowd report'
      end,
      new.crowd_level,
      new.wait_minutes,
      100,
      base_reliability,
      new.created_at,
      new.created_at + case when new.photo_signal then interval '90 minutes' else interval '75 minutes' end,
      jsonb_build_object(
        'report_id', new.id,
        'device_id', new.device_id,
        'has_note', new.note is not null and length(trim(coalesce(new.note, ''))) > 0,
        'photo_signal', new.photo_signal,
        'location_verified', new.location_verified,
        'distance_m', new.distance_m,
        'reporter_reliability', reporter_score,
        'cover_active', new.cover_active
      ),
      true
    );

  perform public.recompute_reporter_reliability(coalesce(new.device_id, 'anonymous'));
  return new;
end;
$$;

create or replace function public.get_device_profile_summary(target_device_id text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with rr as (
    select * from public.reporter_reliability where device_id = target_device_id
  ), report_stats as (
    select
      count(*)::integer as reports_total,
      count(*) filter (where location_verified)::integer as verified_reports,
      count(*) filter (where photo_signal)::integer as photo_reports,
      max(created_at) as last_report_at
    from public.reports
    where device_id = target_device_id
  ), checkin_stats as (
    select
      count(*) filter (where verified)::integer as verified_checkins,
      max(created_at) filter (where verified) as last_checkin_at
    from public.venue_checkins
    where device_id = target_device_id
  ), presence_stats as (
    select
      count(*)::integer as presence_count,
      max(created_at) as last_presence_at
    from public.presence_snapshots
    where device_id = target_device_id
  ), reward_stats as (
    select
      coalesce(sum(points),0)::integer as backend_points,
      count(*)::integer as backend_events
    from public.reward_events
    where device_id = target_device_id
  )
  select jsonb_build_object(
    'device_id', target_device_id,
    'trust_tier', coalesce((select trust_tier from rr), 'new'),
    'reliability_score', coalesce((select reliability_score from rr), 0.500),
    'report_count', coalesce((select reports_total from report_stats), 0),
    'verified_report_count', coalesce((select verified_reports from report_stats), 0),
    'photo_report_count', coalesce((select photo_reports from report_stats), 0),
    'checkin_count', coalesce((select verified_checkins from checkin_stats), 0),
    'agreement_count', coalesce((select agreement_count from rr), 0),
    'disagreement_count', coalesce((select disagreement_count from rr), 0),
    'presence_count', coalesce((select presence_count from presence_stats), 0),
    'backend_points', coalesce((select backend_points from reward_stats), 0),
    'backend_reward_events', coalesce((select backend_events from reward_stats), 0),
    'last_report_at', (select last_report_at from report_stats),
    'last_checkin_at', (select last_checkin_at from checkin_stats),
    'last_presence_at', (select last_presence_at from presence_stats),
    'quality_summary', coalesce((select quality_summary from rr), '{}'::jsonb)
  );
$$;

grant execute on function public.get_device_profile_summary(text) to anon, authenticated;
grant execute on function public.recompute_reporter_reliability(text) to service_role;
;
