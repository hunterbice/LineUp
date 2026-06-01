create index if not exists owner_audit_logs_actor_user_idx on public.owner_audit_logs (actor_user_id);
create index if not exists venue_staff_codes_created_by_idx on public.venue_staff_codes (created_by);;
