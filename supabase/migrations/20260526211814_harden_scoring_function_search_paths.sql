alter function public.crowd_bucket_to_score(text) set search_path = public;
alter function public.score_to_crowd_bucket(numeric) set search_path = public;
alter function public.score_to_confidence_band(integer) set search_path = public;
alter function public.preview_venue_live_score(text, timestamptz) set search_path = public;;
