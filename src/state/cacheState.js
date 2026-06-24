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
  localStorage.removeItem("lineup_pwa_installed");
  localStorage.removeItem("lineup_install_prompt_completed");
  localStorage.removeItem("lineup_install_prompt_dismissed_at");
}

export function clearAuthState() { localStorage.removeItem("lineup_auth_state"); }

export function clearAccountPermissions() { localStorage.removeItem("lineup_account_permissions"); }

export function clearAccountPrefs() { localStorage.removeItem("lineup_account_prefs"); }

export function getFavorites() { return readJson("lineup_favorites", []); }
export function setFavorites(value) { return writeJson("lineup_favorites", value); }

export function getRecentVenues() {
  return readJson("lineup_recent_venues", [])
    .filter((entry) => entry && typeof entry.venueId === "string" && Number.isFinite(Number(entry.viewedAt)))
    .map((entry) => ({ venueId: entry.venueId, viewedAt: Number(entry.viewedAt) }))
    .slice(0, 5);
}
export function saveRecentVenue(venueId) {
  if (typeof venueId !== "string" || !venueId.trim()) return getRecentVenues();
  const next = [{ venueId: venueId.trim(), viewedAt: Date.now() }]
    .concat(getRecentVenues().filter((entry) => entry.venueId !== venueId.trim()))
    .slice(0, 5);
  return writeJson("lineup_recent_venues", next);
}
export function clearRecentVenues() { localStorage.removeItem("lineup_recent_venues"); }

function permissionEducationKey(userId) {
  return `lineup_permission_education_${String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
}
export function getPermissionEducationState(userId) {
  if (!userId) return { step: "notifications", completed: false };
  const value = readJson(permissionEducationKey(userId), null);
  return {
    step: value && value.step === "location" ? "location" : "notifications",
    completed: Boolean(value && value.completed),
  };
}
export function setPermissionEducationStep(userId, step) {
  if (!userId) return { step: "notifications", completed: false };
  return writeJson(permissionEducationKey(userId), { step: step === "location" ? "location" : "notifications", completed: false });
}
export function completePermissionEducation(userId) {
  if (!userId) return { step: "location", completed: true };
  return writeJson(permissionEducationKey(userId), { step: "location", completed: true });
}

export function getArea() { return localStorage.getItem("lineup_area") || "main_gate"; }
export function setArea(value) { localStorage.setItem("lineup_area", value); return value; }

export function getMapboxTokenOverride() { return localStorage.getItem("lineup_mapbox_token") || ""; }
export function isDeviceSessionEnabled() { return localStorage.getItem("lineup_device_session_enabled") !== "false"; }

export function getDeviceSession() { return readJson("lineup_device_session", null); }
export function setDeviceSession(value) { return writeJson("lineup_device_session", value); }
export function getDeviceIdCache() { return localStorage.getItem("lineup_device_id") || ""; }
export function setDeviceIdCache(value) { localStorage.setItem("lineup_device_id", value); return value; }

export function clearSensitiveAccountCache() {
  clearAuthState();
  clearAccountPrefs();
  localStorage.removeItem("lineup_reward_summary");
  clearAccountPermissions();
  localStorage.removeItem("lineup_presence_state");
  localStorage.removeItem("lineup_profile_summary");
  localStorage.removeItem("lineup_activity_log");
}

export const clearSignedInAccountCache = clearSensitiveAccountCache;
