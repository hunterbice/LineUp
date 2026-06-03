export const APP_VERSION = "v58";
export const SUPABASE_URL = "https://bxngqqsxthybjikmwvqj.supabase.co";
export const SUPABASE_KEY = "sb_publishable_p8UHXd9c1vSrELkupjdqfw_4-O3eQKF";
export const ACTIVE_STATUS_SELECT = "id,area,status,deprecated,name,tag,address,map_query,lat,lng,scenes,logo_key,open_hour,close_hour,last_call,line_leap_url,event,crowd_level,wait_minutes,confidence,confidence_score,confidence_signal_count,momentum,cover_amount,cover_active,sources,fresh_at,status_updated_at";
export const MAP_CENTER = [-110.9612, 32.2292];
export const USER_COORDS = [-110.9583, 32.2320];
export const REWARD_GOAL = 500;

export function mapboxToken() {
  return localStorage.getItem("lineup_mapbox_token") ||
    window.LINEUP_MAPBOX_TOKEN ||
    "pk.eyJ1IjoibGluZXVwYXBpIiwiYSI6ImNtcG01Z3R3OTA4Z24ycm9naWJrcG15dzcifQ.AS9Xi8YkEPROiR7yr7L_Fg";
}

export function deviceSessionEnabled() {
  return localStorage.getItem("lineup_device_session_enabled") !== "false";
}
