import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { actorDevice, actorKeys, isRateLimitedAny, logSecurityEventForActors } from "../_shared/security.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function userFromRequest(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function hasOwnerAccess(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return { ok: false, mode: "none", userId: null };
  const { data, error } = await admin
    .from("venue_admins")
    .select("id")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (error) throw error;
  return { ok: !!data, mode: data ? "owner_account" : "none", userId: user.id };
}

async function audit(action: string, access: { mode: string; userId: string | null }, body: Record<string, unknown>) {
  const { code: _code, staff_code: _staffCode, ...safeBody } = body;
  try {
    await admin.from("owner_audit_logs").insert({
      action,
      actor_user_id: access.userId,
      actor_mode: access.mode,
      target_type: String(body.venue_id ? "venue" : body.redemption_id ? "redemption" : "system"),
      target_id: String(body.venue_id ?? body.redemption_id ?? ""),
      metadata: {
        ...safeBody,
        has_code: Boolean(body.code),
        has_staff_code: Boolean(body.staff_code),
      },
    });
  } catch {
    // Audit failures should never block the live control surface.
  }
}

async function recomputeVenue(venueId: string) {
  try {
    await admin.rpc("recompute_venue_live_status", { p_venue_id: venueId });
  } catch {
    // Keep owner controls usable if the database migration is being deployed separately.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }
  if (!isAllowedOrigin(req.headers.get("Origin"))) {
    return jsonResponse({ error: "Origin not allowed" }, 403, req);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").trim();
    const actor = actorDevice(body, req);
    const actors = actorKeys(body, req);
    const origin = req.headers.get("Origin");

    if (await isRateLimitedAny(admin, actors.length ? actors : [actor], "owner_auth_failed")) {
      return jsonResponse({ error: "Too many attempts. Try again later." }, 429, req);
    }

    const access = await hasOwnerAccess(req);
    if (!access.ok) {
      await logSecurityEventForActors(admin, "owner_auth_failed", actors, body, { action, origin });
      return jsonResponse({ error: "Owner access required" }, 401, req);
    }

    if (action === "venue_live_update") {
      const venueId = String(body.venue_id ?? "").trim();
      if (!venueId) return jsonResponse({ error: "Missing venue" }, 400, req);

      const signal = {
        venue_id: venueId,
        source_type: "owner",
        signal_label: "Owner override",
        crowd_level: body.crowd_level ?? null,
        wait_minutes: Number(body.wait_minutes ?? 0),
        cover_amount: body.cover_amount ?? null,
        cover_active: !!body.cover_active,
        event: body.event ?? null,
        note: body.note ?? "Owner control update",
        reliability: 1,
        device_id: body.device_id ?? null,
        metadata: { owner_mode: access.mode },
      };

      const { error } = await admin.from("venue_confidence_signals").insert(signal);
      if (error) throw error;

      await admin.from("live_status").upsert({
        venue_id: venueId,
        crowd_level: signal.crowd_level,
        wait_minutes: signal.wait_minutes,
        cover_amount: signal.cover_amount,
        cover_active: signal.cover_active,
        event: signal.event,
        event_updated_at: signal.event ? new Date().toISOString() : null,
        confidence: "high",
        momentum: body.momentum ?? "steady",
        sources: ["Owner override", "Fresh manual update"],
        updated_at: new Date().toISOString(),
      }, { onConflict: "venue_id" });

      await recomputeVenue(venueId);
      await audit(action, access, body);
      return jsonResponse({ ok: true }, 200, req);
    }

    if (action === "set_venue_status") {
      const venueId = String(body.venue_id ?? "").trim();
      const status = String(body.status ?? "active");
      if (!venueId) return jsonResponse({ error: "Missing venue" }, 400, req);
      if (!["active", "closed", "hidden"].includes(status)) {
        return jsonResponse({ error: "Unsupported status" }, 400, req);
      }
      const deprecated = status === "closed" ? true : status === "active" ? false : !!body.deprecated;
      const { error } = await admin
        .from("venues")
        .update({ status, deprecated })
        .eq("id", venueId);
      if (error) throw error;
      await audit(action, access, body);
      return jsonResponse({ ok: true }, 200, req);
    }

    if (action === "create_staff_code" || action === "toggle_staff_code") {
      await audit(action, access, body);
      return jsonResponse({ error: "Staff codes are retired. Assign venue roles to authenticated accounts instead." }, 410, req);
    }

    if (action === "redemption_status") {
      const redemptionId = String(body.redemption_id ?? "").trim();
      const status = String(body.status ?? "").trim();
      if (!redemptionId || !status) return jsonResponse({ error: "Missing redemption update" }, 400, req);
      const { error } = await admin
        .from("reward_redemptions")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", redemptionId);
      if (error) throw error;
      await audit(action, access, body);
      return jsonResponse({ ok: true }, 200, req);
    }

    if (action === "venue_detail") {
      const venueId = String(body.venue_id ?? "").trim();
      if (!venueId) return jsonResponse({ error: "Missing venue" }, 400, req);
      const [venue, live, reports, checkins, events, signals, audits] = await Promise.all([
        admin.from("venues").select("id,name,area,status,deprecated,tag,address,lat,lng").eq("id", venueId).maybeSingle(),
        admin.from("live_status").select("venue_id,crowd_level,wait_minutes,confidence,momentum,cover_amount,cover_active,event,sources,fresh_at,updated_by_role,updated_at").eq("venue_id", venueId).maybeSingle(),
        admin.from("reports").select("crowd_level,wait_minutes,location_verified,distance_m,source,created_at").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(12),
        admin.from("venue_checkins").select("verified,distance_m,accuracy_m,created_at").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(12),
        admin.from("app_signal_events").select("event_type,created_at").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(12),
        admin.from("venue_confidence_signals").select("source_type,signal_label,crowd_level,wait_minutes,signal_strength,reliability,created_at,observed_at,expires_at").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(12),
        admin.from("owner_audit_logs").select("action,target_type,target_id,created_at").eq("target_id", venueId).order("created_at", { ascending: false }).limit(12),
      ]);
      return jsonResponse({
        ok: true,
        venue: venue.data,
        live_status: live.data,
        reports: reports.data ?? [],
        checkins: checkins.data ?? [],
        events: events.data ?? [],
        signals: signals.data ?? [],
        audits: audits.data ?? [],
      }, 200, req);
    }

    return jsonResponse({ error: "Unknown owner action" }, 400, req);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Owner action failed" }, 500, req);
  }
});
