create table if not exists public.owner_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_device_id text,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_staff_codes (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  label text not null,
  code text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.owner_audit_logs enable row level security;
alter table public.venue_staff_codes enable row level security;

create index if not exists owner_audit_logs_created_idx on public.owner_audit_logs (created_at desc);
create index if not exists owner_audit_logs_target_idx on public.owner_audit_logs (target_type, target_id, created_at desc);
create index if not exists venue_staff_codes_venue_idx on public.venue_staff_codes (venue_id, active);

create policy "Owner can read audit logs" on public.owner_audit_logs for select to authenticated using ((select private.is_lineup_owner()));
create policy "Owner can read staff codes" on public.venue_staff_codes for select to authenticated using ((select private.is_lineup_owner()));
;
