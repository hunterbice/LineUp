import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { actorDevice, isRateLimitedAny, issueDeviceToken, logSecurityEventForActors, randomId, verifyDeviceToken } from "../_shared/security.ts";

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration unavailable" }, 500, req);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const actor = actorDevice({}, req);
  if (await isRateLimitedAny(supabase, [actor], "device_session_issued", 200, 15)) {
    return jsonResponse({ error: "Too many device session requests. Try again later." }, 429, req);
  }

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
    await logSecurityEventForActors(supabase, "device_session_issued", [actor], {}, { renewed: Boolean(body.device_token) });
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
