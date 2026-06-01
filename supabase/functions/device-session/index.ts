import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { issueDeviceToken, randomId, verifyDeviceToken } from "../_shared/security.ts";

function cleanText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  let deviceId = cleanText(body.device_id, 128);
  let sessionId = cleanText(body.session_id, 128);

  if (deviceId && cleanText(body.device_token, 4096)) {
    const verified = await verifyDeviceToken(body);
    if (!verified.ok) return jsonResponse({ error: verified.error }, 401, req);
    sessionId = sessionId || cleanText(verified.payload?.session_id, 128);
  } else {
    deviceId = randomId("ldv");
  }

  if (!sessionId) sessionId = randomId("lsn");

  try {
    const token = await issueDeviceToken(deviceId, sessionId);
    return jsonResponse({
      ok: true,
      device_id: deviceId,
      session_id: sessionId,
      device_token: token,
      expires_in_seconds: 60 * 60 * 24 * 30,
    }, 200, req);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Device session failed" }, 500, req);
  }
});
