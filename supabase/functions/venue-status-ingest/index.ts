import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { actorDevice, actorKeys, isRateLimitedAny, logSecurityEventForActors, staffCodeHash } from "../_shared/security.ts";
const crowdLevels = new Set(["dead", "slow", "busy", "packed"]);

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
async function recomputeVenue(supabase: ReturnType<typeof createClient>, venueId: string) {
  const result = await supabase.rpc("recompute_venue_live_status", { p_venue_id: venueId });
  return result.error;
}
async function userFromRequest(req: Request, supabase: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
async function accountAccess(req: Request, supabase: ReturnType<typeof createClient>, venueId: string) {
  const user = await userFromRequest(req, supabase);
  if (!user) return null;
  const { data, error } = await supabase
    .from("venue_admins")
    .select("id,venue_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "venue_staff", "staff", "manager"])
    .limit(20);
  if (error) throw error;
  const rows = data || [];
  const owner = rows.find((row: any) => row.role === "owner");
  if (owner) return { sourceType: "owner_override", mode: "owner_account", userId: user.id };
  const staff = rows.find((row: any) => row.venue_id === venueId);
  if (staff) return { sourceType: "venue_admin", mode: "staff_account", userId: user.id };
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);

  const ownerCode = Deno.env.get("LINEUP_OWNER_CODE") || "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_error) { return jsonResponse({ error: "Invalid JSON body" }, 400, req); }

  const code = clean(body.code);
  const venueId = clean(body.venue_id);
  const crowdLevel = clean(body.crowd_level);
  const deviceId = clean(body.device_id) || null;
  const actor = actorDevice(body, req);
  const actors = actorKeys(body, req);
  const origin = req.headers.get("Origin");

  if (await isRateLimitedAny(supabase, actors.length ? actors : [actor], "staff_update_auth_failed")) {
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429, req);
  }
  if (!venueId) return jsonResponse({ error: "venue_id is required" }, 400, req);
  if (!crowdLevels.has(crowdLevel)) return jsonResponse({ error: "Invalid crowd_level" }, 400, req);

  let sourceType = "venue_admin";
  let authMode = "code";
  if (ownerCode && code === ownerCode) {
    sourceType = "owner_override";
    authMode = "emergency_code";
  } else {
    const account = await accountAccess(req, supabase, venueId);
    if (account) {
      sourceType = account.sourceType;
      authMode = account.mode;
    } else {
      const { data: staff, error: staffError } = await supabase
        .from("venue_staff_codes")
        .select("id,venue_id,label,active,expires_at")
        .eq("venue_id", venueId)
        .eq("code_hash", await staffCodeHash(code, venueId))
        .eq("active", true)
        .maybeSingle();
      if (staffError) return jsonResponse({ error: staffError.message }, 500, req);
      const expired = staff?.expires_at && new Date(staff.expires_at).getTime() < Date.now();
      if (!staff || expired || staff.venue_id !== venueId) {
        await logSecurityEventForActors(supabase, "staff_update_auth_failed", actors, body, { origin, reason: "invalid_code" });
        return jsonResponse({ error: "Invalid venue code" }, 401, req);
      }
      sourceType = "venue_admin";
      authMode = "staff_code";
    }
  }

  const waitMinutes = clampInt(body.wait_minutes, 0, 180, 0);
  const coverAmount = clean(body.cover_amount) || null;
  const coverActive = Boolean(body.cover_active) && !!coverAmount;
  const event = clean(body.event) || null;
  const note = clean(body.note) || null;

  const { data: venue, error: venueError } = await supabase.from("venues").select("id,status,deprecated").eq("id", venueId).maybeSingle();
  if (venueError) return jsonResponse({ error: venueError.message }, 500, req);
  if (!venue || venue.status !== "active" || venue.deprecated) return jsonResponse({ error: "Unknown or inactive venue" }, 404, req);

  const { error: signalError } = await supabase.from("venue_confidence_signals").insert({
    venue_id: venueId,
    source_type: sourceType,
    signal_label: sourceType === "owner_override" ? "Owner live update" : "Venue live update",
    crowd_level: crowdLevel,
    wait_minutes: waitMinutes,
    signal_strength: 100,
    reliability: sourceType === "owner_override" ? 0.98 : 0.95,
    expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    metadata: { note, submitted_via: "venue-status-ingest", auth_mode: authMode, device_id: deviceId },
    public_visible: true,
    event,
    cover_amount: coverAmount,
    cover_active: coverActive,
  });
  if (signalError) return jsonResponse({ error: signalError.message }, 500, req);

  const recomputeError = await recomputeVenue(supabase, venueId);
  if (recomputeError) return jsonResponse({ error: recomputeError.message }, 500, req);

  const { error: updateError } = await supabase
    .from("live_status")
    .update({
      cover_amount: coverAmount,
      cover_active: coverActive,
      event: event || undefined,
      updated_by_role: sourceType === "owner_override" ? "owner" : "venue_admin",
      updated_at: new Date().toISOString(),
    })
    .eq("venue_id", venueId);
  if (updateError) return jsonResponse({ error: updateError.message }, 500, req);

  const { data: updatedStatus, error: statusError } = await supabase
    .from("active_venue_status")
    .select("id,name,area,status,deprecated,tag,address,map_query,lat,lng,scenes,logo_key,open_hour,close_hour,last_call,line_leap_url,event,crowd_level,wait_minutes,confidence,confidence_score,confidence_signal_count,momentum,cover_amount,cover_active,sources,fresh_at,status_updated_at")
    .eq("id", venueId)
    .single();
  if (statusError) return jsonResponse({ error: statusError.message }, 500, req);

  if (sourceType === "owner_override") {
    await supabase.from("owner_audit_logs").insert({
      actor_device_id: deviceId,
      action: "venue_live_update",
      target_type: "venue",
      target_id: venueId,
      metadata: { via: "staff_console", crowd_level: crowdLevel, wait_minutes: waitMinutes, cover_active: coverActive, event },
    });
  }

  return jsonResponse({ ok: true, venue_id: venueId, source_type: sourceType, auth_mode: authMode, live_status: updatedStatus }, 200, req);
});
