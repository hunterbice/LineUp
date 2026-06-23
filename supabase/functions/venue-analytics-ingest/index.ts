import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

const allowedEvents = new Set([
  "deal_impression",
  "deal_tap",
  "venue_detail_open",
  "report_open",
  "report_submit",
  "favorite_add",
]);

function clean(value: unknown, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 40);
    if (!safeKey || /lat|lng|location|coord|position/i.test(safeKey)) continue;
    if (typeof raw === "string") safe[safeKey] = raw.slice(0, 120);
    else if (typeof raw === "number" && Number.isFinite(raw)) safe[safeKey] = raw;
    else if (typeof raw === "boolean") safe[safeKey] = raw;
  }
  return safe;
}

function sinceMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data?.user || null;
}

async function recentCount(
  supabase: ReturnType<typeof createClient>,
  field: "device_id" | "user_id",
  value: string,
) {
  const { count, error } = await supabase
    .from("venue_analytics_events")
    .select("id", { count: "exact", head: true })
    .eq(field, value)
    .gte("created_at", sinceMinutes(15));
  if (error) throw error;
  return Number(count || 0);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration unavailable" }, 500, req);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400, req); }

  const verifiedDevice = await verifyDeviceToken(body);
  if (!verifiedDevice.ok) return jsonResponse({ error: verifiedDevice.error }, 401, req);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await getUser(req, supabase);
  if (!user) return jsonResponse({ error: "LineUp account required" }, 401, req);

  const venueId = clean(body.venue_id, 64);
  const dealId = clean(body.deal_id, 64) || null;
  const eventType = clean(body.event_type, 48);
  const deviceId = clean(body.device_id, 128);
  if (!venueId || !deviceId || !allowedEvents.has(eventType)) {
    return jsonResponse({ error: "Invalid analytics event" }, 400, req);
  }

  try {
    const [deviceEvents, userEvents] = await Promise.all([
      recentCount(supabase, "device_id", deviceId),
      recentCount(supabase, "user_id", user.id),
    ]);
    if (deviceEvents >= 80 || userEvents >= 120) {
      return jsonResponse({ error: "Too many analytics events. Try again later." }, 429, req);
    }

    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id,status,deprecated")
      .eq("id", venueId)
      .maybeSingle();
    if (venueError) throw venueError;
    if (!venue || venue.status !== "active" || venue.deprecated) {
      return jsonResponse({ error: "Unknown active venue" }, 404, req);
    }

    if (dealId) {
      const { data: deal, error: dealError } = await supabase
        .from("venue_deals")
        .select("id,venue_id")
        .eq("id", dealId)
        .eq("venue_id", venueId)
        .maybeSingle();
      if (dealError) throw dealError;
      if (!deal) return jsonResponse({ error: "Deal does not belong to venue" }, 400, req);
    }

    const metadata = safeMetadata(body.metadata);
    if (eventType === "deal_impression" && dealId) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("venue_analytics_events")
        .select("id")
        .eq("device_id", deviceId)
        .eq("deal_id", dealId)
        .eq("event_type", eventType)
        .gte("created_at", sinceMinutes(10))
        .limit(1)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return jsonResponse({ ok: true, duplicate: true }, 200, req);
    }

    const { data, error } = await supabase.from("venue_analytics_events").insert({
      venue_id: venueId,
      deal_id: dealId,
      event_type: eventType,
      user_id: user.id,
      device_id: deviceId,
      metadata,
    }).select("id,created_at").single();
    if (error) throw error;
    return jsonResponse({ ok: true, event: data }, 200, req);
  } catch (error) {
    console.error("venue-analytics-ingest failed", error);
    return jsonResponse({ error: "Analytics event failed" }, 500, req);
  }
});
