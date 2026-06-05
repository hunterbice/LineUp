-- Allow RLS policies on public deal reads to evaluate role helpers for anon.
-- With no auth.uid(), these helpers return false; public access still requires
-- the active/current deal window branch of the venue_deals select policy.

grant execute on function private.can_manage_venue(text) to anon;
