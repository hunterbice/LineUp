import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

const crowdLevels = new Set(["dead", "slow", "busy", "packed"]);
const earthMeters = 6371008.8;

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.sqrt(h));
}

function roundCoord(value: number) {
  return Math.round(value * 10000) / 10000;
}

function normalizeArea(area: string | null | undefined) {
  if (area === "university") return "university";
  if (area === "downtown") return "downtown";
  if (area === "main_gate") return "university";
  if (area === "fourth_downtown") return "downtown";
  return "unknown";
}

function sinceMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function tooManyRecentRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
  deviceId: string | null,
  maxRows: number,
  minutes: number,
) {
  if (!deviceId) return false;
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("device_id", deviceId)
    .gte("created_at", sinceMinutes(minutes));
  if (error) return false;
  return Number(count || 0) >= maxRows;
}

async function recomputeVenue(supabase: ReturnType<typeof createClient>, venueId: string) {
  await supabase.rpc("recompute_venue_live_status", { p_venue_id: venueId });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) {
    return jsonResponse({ error: "Origin not allowed" }, 403, req);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  const lat = asNumber(body.lat);
  const lng = asNumber(body.lng);
  const accuracyM = Math.max(0, Math.min(5000, asNumber(body.accuracy_m) ?? 9999));
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return jsonResponse({ error: "Valid lat/lng are required" }, 400, req);
  }

  const action = String(body.action || "presence");
  const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 128) : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 128) : null;
  const requestedVenueId = typeof body.venue_id === "string" ? body.venue_id : null;

  if (action === "report" || action === "check_in") {
    const verifiedDevice = await verifyDeviceToken(body);
    if (!verifiedDevice.ok) return jsonResponse({ error: verifiedDevice.error }, 401, req);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "report" && await tooManyRecentRows(supabase, "reports", deviceId, 6, 15)) {
    return jsonResponse({ error: "Too many reports. Try again later." }, 429, req);
  }
  if (action === "check_in" && await tooManyRecentRows(supabase, "venue_checkins", deviceId, 5, 15)) {
    return jsonResponse({ error: "Too many check-ins. Try again later." }, 429, req);
  }
  if (action !== "report" && action !== "check_in" && await tooManyRecentRows(supabase, "presence_snapshots", deviceId, 30, 15)) {
    return jsonResponse({ error: "Too many location updates. Try again later." }, 429, req);
  }

  const { data: venues, error: venuesError } = await supabase
    .from("venues")
    .select("id,name,area,lat,lng,status,deprecated")
    .eq("status", "active")
    .eq("deprecated", false);

  if (venuesError) return jsonResponse({ error: venuesError.message }, 500, req);
  if (!venues?.length) return jsonResponse({ error: "No active venues" }, 500, req);

  const ranked = venues
    .filter((v) => v.lat !== null && v.lng !== null)
    .map((v) => ({
      ...v,
      distance_m: distanceMeters(lat, lng, Number(v.lat), Number(v.lng)),
    }))
    .sort((a, b) => a.distance_m - b.distance_m);

  const nearest = ranked[0];
  const target = requestedVenueId ? ranked.find((v) => v.id === requestedVenueId) : nearest;
  if (!target) return jsonResponse({ error: "Unknown active venue" }, 404, req);

  const verificationRadius = 75;
  const usableAccuracy = accuracyM <= 100;
  const targetVerified = usableAccuracy && target.distance_m <= Math.max(verificationRadius, accuracyM + 25);
  const nearestVerified = usableAccuracy && nearest.distance_m <= Math.max(verificationRadius, accuracyM + 25);

  const presenceSource = action === "check_in" ? "check_in" : action === "report" ? "report" : "foreground";
  await supabase.from("presence_snapshots").insert({
    device_id: deviceId,
    session_id: sessionId,
    nearest_venue_id: nearest.id,
    nearest_distance_m: Math.round(nearest.distance_m * 100) / 100,
    accuracy_m: Math.round(accuracyM * 100) / 100,
    area: normalizeArea(nearest.area),
    source: presenceSource,
    location_verified: nearestVerified,
    lat_rounded: roundCoord(lat),
    lng_rounded: roundCoord(lng),
    metadata: {
      action,
      requested_venue_id: requestedVenueId,
      target_venue_id: target.id,
      target_distance_m: Math.round(target.distance_m * 100) / 100,
    },
  });

  if (action === "check_in") {
    const { data: checkin, error: checkinError } = await supabase.from("venue_checkins").insert({
      venue_id: target.id,
      device_id: deviceId,
      session_id: sessionId,
      distance_m: Math.round(target.distance_m * 100) / 100,
      accuracy_m: Math.round(accuracyM * 100) / 100,
      verified: targetVerified,
      metadata: { nearest_venue_id: nearest.id, nearest_distance_m: Math.round(nearest.distance_m * 100) / 100 },
    }).select("id,verified,distance_m,accuracy_m,created_at").single();

    if (checkinError) return jsonResponse({ error: checkinError.message }, 500, req);

    if (targetVerified) {
      await supabase.from("app_signal_events").insert({
        venue_id: target.id,
        event_type: "verified_check_in",
        device_id: deviceId,
        session_id: sessionId,
        metadata: { distance_m: Math.round(target.distance_m), accuracy_m: Math.round(accuracyM) },
      });
      await supabase.from("venue_confidence_signals").insert({
        venue_id: target.id,
        source_type: "verified_check_in",
        signal_label: "Verified nearby check-in",
        signal_strength: 100,
        reliability: accuracyM <= 35 ? 0.78 : 0.68,
        observed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        metadata: { checkin_id: checkin.id, distance_m: Math.round(target.distance_m), accuracy_m: Math.round(accuracyM) },
        public_visible: true,
      });
      await recomputeVenue(supabase, target.id);
    }

    return jsonResponse({
      ok: true,
      action,
      venue_id: target.id,
      venue_name: target.name,
      verified: targetVerified,
      distance_m: Math.round(target.distance_m),
      accuracy_m: Math.round(accuracyM),
      nearest_venue_id: nearest.id,
      checkin,
    }, 200, req);
  }

  if (action === "report") {
    const crowdLevel = String(body.crowd_level || "");
    if (!crowdLevels.has(crowdLevel)) return jsonResponse({ error: "Invalid crowd_level" }, 400, req);
    const waitMinutes = clampInt(body.wait_minutes, 0, 180, 0);
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;
    const photoSignal = Boolean(body.photo_signal);
    const coverAmount = typeof body.cover_amount === "string" ? body.cover_amount.slice(0, 20) : null;
    const coverActive = Boolean(body.cover_active) && !!coverAmount;

    const { data: report, error: reportError } = await supabase.from("reports").insert({
      venue_id: target.id,
      crowd_level: crowdLevel,
      wait_minutes: waitMinutes,
      cover_amount: coverAmount,
      cover_active: coverActive,
      note,
      photo_signal: photoSignal,
      source: "user_report",
      device_id: deviceId,
      location_verified: targetVerified,
      distance_m: Math.round(target.distance_m * 100) / 100,
      reporter_reliability_snapshot: null,
      report_context: {
        submitted_via: "location-ingest",
        accuracy_m: Math.round(accuracyM),
        nearest_venue_id: nearest.id,
        nearest_distance_m: Math.round(nearest.distance_m),
        verification_radius_m: verificationRadius,
      },
    }).select("id,venue_id,location_verified,distance_m,created_at").single();

    if (reportError) return jsonResponse({ error: reportError.message }, 500, req);

    const nearEnoughForLive = usableAccuracy && target.distance_m <= 200;
    const publicVisible = targetVerified || nearEnoughForLive;
    const signalSource = targetVerified ? "verified_user_report" : "user_report";
    const signalLabel = targetVerified ? "Verified nearby report" : "Nearby user report";
    const signalStrength = targetVerified ? 88 : 42;
    const reliability = targetVerified
      ? (accuracyM <= 35 ? 0.78 : 0.68)
      : (nearEnoughForLive ? 0.38 : 0.18);
    const expiresMinutes = targetVerified ? 50 : 25;

    await supabase.from("app_signal_events").insert({
      venue_id: target.id,
      event_type: targetVerified ? "verified_report" : "user_report",
      device_id: deviceId,
      session_id: sessionId,
      metadata: {
        report_id: report.id,
        crowd_level: crowdLevel,
        wait_minutes: waitMinutes,
        distance_m: Math.round(target.distance_m),
        accuracy_m: Math.round(accuracyM),
        public_visible: publicVisible,
      },
    });

    await supabase.from("venue_confidence_signals").insert({
      venue_id: target.id,
      source_type: signalSource,
      signal_label: signalLabel,
      crowd_level: crowdLevel,
      wait_minutes: waitMinutes,
      signal_strength: signalStrength,
      reliability,
      observed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString(),
      metadata: {
        report_id: report.id,
        distance_m: Math.round(target.distance_m),
        accuracy_m: Math.round(accuracyM),
        location_verified: targetVerified,
        near_enough_for_live: nearEnoughForLive,
      },
      public_visible: publicVisible,
      cover_amount: coverAmount,
      cover_active: coverActive,
    });

    if (publicVisible) await recomputeVenue(supabase, target.id);

    return jsonResponse({
      ok: true,
      action,
      venue_id: target.id,
      venue_name: target.name,
      verified: targetVerified,
      signal_used: publicVisible,
      distance_m: Math.round(target.distance_m),
      accuracy_m: Math.round(accuracyM),
      nearest_venue_id: nearest.id,
      report,
    }, 200, req);
  }

  await supabase.from("app_signal_events").insert({
    venue_id: nearest.id,
    event_type: "presence_snapshot",
    device_id: deviceId,
    session_id: sessionId,
    metadata: {
      distance_m: Math.round(nearest.distance_m),
      accuracy_m: Math.round(accuracyM),
      area: normalizeArea(nearest.area),
    },
  });

  return jsonResponse({
    ok: true,
    action: "presence",
    nearest_venue_id: nearest.id,
    nearest_venue_name: nearest.name,
    nearest_distance_m: Math.round(nearest.distance_m),
    accuracy_m: Math.round(accuracyM),
    area: normalizeArea(nearest.area),
    verified_near_venue: nearestVerified,
  }, 200, req);
});
