import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";

const allowedEvents = new Set([
  "app_open",
  "app_resume",
  "heartbeat",
  "detail_view",
  "directions_tap",
  "favorite_add",
  "favorite_remove",
  "lineleap_tap",
  "map_pin_tap",
  "report_open",
  "share_tap",
]);

function clean(value: unknown, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function cleanVisibility(value: unknown) {
  return value === "public" ? "public" : "anonymous";
}
async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function sinceMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 40);
    if (!safeKey) continue;
    if (typeof raw === "string") out[safeKey] = raw.slice(0, 160);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[safeKey] = raw;
    else if (typeof raw === "boolean" || raw === null) out[safeKey] = raw;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) {
    return jsonResponse({ error: "Origin not allowed" }, 403, req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const venueId = clean(body.venue_id, 64);
  const eventType = clean(body.event_type, 64);
  const deviceId = clean(body.device_id, 128);
  const sessionId = clean(body.session_id, 128);
  const interactionVisibility = cleanVisibility(body.interaction_visibility);
  const displayName = clean(body.display_name, 32);
  const avatarUrl = clean(body.avatar_url, 250000);
  const safeAvatarUrl = avatarUrl.startsWith("data:image/") ? avatarUrl : "";
  if (!eventType || !deviceId) {
    return jsonResponse({ error: "event_type and device_id are required" }, 400, req);
  }
  if (!allowedEvents.has(eventType)) {
    return jsonResponse({ error: "Unsupported event type" }, 400, req);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const user = await getUser(req, supabase);
  if (!user) return jsonResponse({ error: "LineUp account required" }, 401, req);

  if (venueId) {
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id,status,deprecated")
      .eq("id", venueId)
      .maybeSingle();
    if (venueError) return jsonResponse({ error: venueError.message }, 500, req);
    if (!venue || venue.status !== "active" || venue.deprecated) {
      return jsonResponse({ error: "Unknown active venue" }, 404, req);
    }
  }

  const { count, error: countError } = await supabase
    .from("app_signal_events")
    .select("id", { count: "exact", head: true })
    .eq("device_id", deviceId)
    .gte("created_at", sinceMinutes(15));
  if (!countError && Number(count || 0) >= 80) {
    return jsonResponse({ error: "Too many app events. Try again later." }, 429, req);
  }

  const { data, error } = await supabase
    .from("app_signal_events")
    .insert({
      user_id: user.id,
      venue_id: venueId || null,
      event_type: eventType,
      device_id: deviceId,
      session_id: sessionId || null,
      interaction_visibility: interactionVisibility,
      metadata: { ...safeMetadata(body.metadata), interaction_visibility: interactionVisibility, display_name: displayName, avatar_url: safeAvatarUrl },
    })
    .select("id,created_at")
    .single();
  if (error) return jsonResponse({ error: error.message }, 500, req);

  return jsonResponse({ ok: true, event: data }, 200, req);
});
