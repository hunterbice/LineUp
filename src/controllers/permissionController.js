function notificationStatus(notificationApi) {
  if (!notificationApi || typeof notificationApi.permission !== "string") return "unavailable";
  if (notificationApi.permission === "granted") return "granted";
  if (notificationApi.permission === "denied") return "denied";
  return "default";
}

export function createPermissionController(deps = {}) {
  const navigatorRef = deps.navigatorRef || (() => globalThis.navigator);
  const notificationRef = deps.notificationRef || (() => globalThis.Notification);

  function readNotificationStatus() {
    return notificationStatus(notificationRef());
  }

  async function readLocationStatus() {
    const nav = navigatorRef();
    if (!nav || !nav.geolocation) return "unavailable";
    if (!nav.permissions || typeof nav.permissions.query !== "function") return deps.hasConfirmedLocation && deps.hasConfirmedLocation() ? "granted" : "unknown";
    try {
      const result = await nav.permissions.query({ name: "geolocation" });
      return ["granted", "denied", "prompt"].includes(result.state) ? result.state : "unknown";
    } catch {
      return deps.hasConfirmedLocation && deps.hasConfirmedLocation() ? "granted" : "unknown";
    }
  }

  async function requestNotifications() {
    const api = notificationRef();
    if (!api || typeof api.requestPermission !== "function") return "unavailable";
    try {
      const result = await api.requestPermission();
      return ["granted", "denied", "default"].includes(result) ? result : readNotificationStatus();
    } catch {
      return readNotificationStatus();
    }
  }

  async function requestLocation() {
    const nav = navigatorRef();
    if (!nav || !nav.geolocation || typeof deps.captureLocation !== "function") return "unavailable";
    try {
      const result = await deps.captureLocation();
      if (result) return "granted";
    } catch {
      // The browser result below remains authoritative when a location request fails.
    }
    return readLocationStatus();
  }

  return { readNotificationStatus, readLocationStatus, requestNotifications, requestLocation };
}
