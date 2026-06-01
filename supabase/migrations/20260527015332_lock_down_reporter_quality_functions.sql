revoke execute on function public.get_device_profile_summary(text) from public, anon, authenticated;
revoke execute on function public.recompute_reporter_reliability(text) from public, anon, authenticated;
revoke execute on function public.refresh_recent_reporters_after_signal() from public, anon, authenticated;
revoke execute on function public.refresh_reporter_after_checkin() from public, anon, authenticated;

grant execute on function public.get_device_profile_summary(text) to service_role;
grant execute on function public.recompute_reporter_reliability(text) to service_role;
;
