import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data?.user || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const deviceId = typeof body.device_id === "string" ? body.device_id.trim().slice(0, 128) : "";
  if (!deviceId) return jsonResponse({ error: "device_id is required" }, 400, req);

  const verifiedDevice = await verifyDeviceToken(body);
  if (!verifiedDevice.ok) return jsonResponse({ error: verifiedDevice.error }, 401, req);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = await getUser(req, supabase);
  if (!user) return jsonResponse({ error: "LineUp account required" }, 401, req);
  const { data: device, error: deviceError } = await supabase
    .from("user_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (deviceError) return jsonResponse({ error: "Profile access failed" }, 500, req);
  if (!device) return jsonResponse({ error: "Device does not belong to this account" }, 403, req);

  const { data, error } = await supabase.rpc("get_device_profile_summary", {
    target_device_id: deviceId,
  });

  if (error) return jsonResponse({ error: error.message }, 500, req);
  const { device_id: _deviceId, ...profile } = data || {};
  return jsonResponse({ ok: true, profile }, 200, req);
});
