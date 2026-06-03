export function createDeviceSessionService({ supabaseUrl, supabaseKey, enabled, getHeaders }) {
  let deviceSession = JSON.parse(localStorage.getItem("lineup_device_session") || "null");
  let deviceSessionPromise = null;
  let appSessionId = null;

  function getDeviceId() {
    let id = deviceSession && deviceSession.device_id || localStorage.getItem("lineup_device_id");
    if (!id) {
      id = "device_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("lineup_device_id", id);
    }
    return id;
  }

  function getSessionId() {
    if (deviceSession && deviceSession.session_id) return deviceSession.session_id;
    if (appSessionId) return appSessionId;
    appSessionId = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    return appSessionId;
  }

  function deviceSessionFresh() {
    return deviceSession &&
      deviceSession.device_token &&
      deviceSession.expires_at &&
      new Date(deviceSession.expires_at).getTime() > Date.now() + 5 * 60000;
  }

  function ensureDeviceSession() {
    if (!enabled || !supabaseUrl || !supabaseKey) return Promise.resolve(deviceSession);
    if (deviceSessionFresh()) return Promise.resolve(deviceSession);
    if (deviceSessionPromise) return deviceSessionPromise;
    const body = {
      device_id: deviceSession && deviceSession.device_id || localStorage.getItem("lineup_device_id") || "",
      session_id: deviceSession && deviceSession.session_id || appSessionId || "",
      device_token: deviceSession && deviceSession.device_token || "",
    };
    deviceSessionPromise = fetch(supabaseUrl + "/functions/v1/device-session", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    }).then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) throw new Error(data.error || "Device session failed");
        return data;
      });
    }).then(function(data) {
      deviceSession = {
        device_id: data.device_id,
        session_id: data.session_id,
        device_token: data.device_token,
        expires_at: new Date(Date.now() + Number(data.expires_in_seconds || 0) * 1000).toISOString(),
      };
      localStorage.setItem("lineup_device_session", JSON.stringify(deviceSession));
      localStorage.setItem("lineup_device_id", deviceSession.device_id);
      appSessionId = deviceSession.session_id;
      return deviceSession;
    }).finally(function() {
      deviceSessionPromise = null;
    });
    return deviceSessionPromise;
  }

  function withDeviceProof(extra) {
    return ensureDeviceSession().then(function(session) {
      return Object.assign({
        device_id: getDeviceId(),
        session_id: getSessionId(),
        device_token: session && session.device_token || "",
      }, extra || {});
    });
  }

  return { getDeviceId, getSessionId, ensureDeviceSession, withDeviceProof };
}
