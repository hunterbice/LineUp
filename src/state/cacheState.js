const DEFAULT_PERMISSIONS = { owner: false, roles: [], venues: [] };
const DEFAULT_ACCOUNT_PREFS = {
  interaction_visibility: "anonymous",
  display_name: "",
  avatar_url: "",
  profile_setup_completed: false,
  notification_pref: "unset",
  location_pref: "unset",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function clearLegacyVenueOverrides() {
  localStorage.removeItem("lineup_bar_updates");
  localStorage.removeItem("lineup_local_reports");
}

export function getRewardSummary() { return readJson("lineup_reward_summary", null); }
export function setRewardSummary(value) { return writeJson("lineup_reward_summary", value); }

export function getAuthState() { return readJson("lineup_auth_state", null); }
export function setAuthState(value) { return writeJson("lineup_auth_state", value); }
export function clearAuthState() { localStorage.removeItem("lineup_auth_state"); }

export function getAccountPermissions() { return readJson("lineup_account_permissions", DEFAULT_PERMISSIONS); }
export function setAccountPermissions(value) { return writeJson("lineup_account_permissions", value); }
export function clearAccountPermissions() { localStorage.removeItem("lineup_account_permissions"); }

export function getPresenceState() { return readJson("lineup_presence_state", null); }
export function setPresenceState(value) { return writeJson("lineup_presence_state", value); }

export function getProfileSummary() { return readJson("lineup_profile_summary", null); }
export function setProfileSummary(value) { return writeJson("lineup_profile_summary", value); }

export function getAccountPrefs() { return readJson("lineup_account_prefs", DEFAULT_ACCOUNT_PREFS); }
export function setAccountPrefs(value) { return writeJson("lineup_account_prefs", value); }
export function clearAccountPrefs() { localStorage.removeItem("lineup_account_prefs"); }

export function getActivityLog() { return readJson("lineup_activity_log", []); }
export function setActivityLog(value) { return writeJson("lineup_activity_log", value); }

export function getFavorites() { return readJson("lineup_favorites", []); }
export function setFavorites(value) { return writeJson("lineup_favorites", value); }

export function getArea() { return localStorage.getItem("lineup_area") || "main_gate"; }
export function setArea(value) { localStorage.setItem("lineup_area", value); return value; }

export function clearSignedInAccountCache() {
  clearAuthState();
  clearAccountPrefs();
  localStorage.removeItem("lineup_reward_summary");
  clearAccountPermissions();
}
