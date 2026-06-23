import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { isRateLimitedAny, logSecurityEventForActors } from "../_shared/security.ts";

function prior(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 999) return null;
  if (number <= -2) return 10;
  if (number === -1) return 30;
  if (number === 0) return 50;
  if (number === 1) return 70;
  return 90;
}

function waitFromCrowd(crowd: number) {
  if (crowd >= 85) return 25;
  if (crowd >= 70) return 15;
  if (crowd >= 50) return 8;
  if (crowd >= 30) return 4;
  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const besttimePublicKey = Deno.env.get("BESTTIME_PUBLIC_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration unavailable" }, 500, req);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: authError } = token ? await supabase.auth.getUser(token) : { data: { user: null }, error: null };
  if (authError || !userData.user) return jsonResponse({ error: "Authentication required" }, 401, req);

  const userId = userData.user.id;
  const { data: ownerRows, error: ownerError } = await supabase.from("venue_admins").select("user_id").eq("user_id", userId).eq("role", "owner").limit(1);
  if (ownerError) return jsonResponse({ error: "Unable to verify owner access" }, 500, req);
  if (!ownerRows?.length) return jsonResponse({ error: "Owner access required" }, 403, req);
  if (!besttimePublicKey) return jsonResponse({ error: "BestTime integration is not configured" }, 503, req);
  if (await isRateLimitedAny(supabase, [`user:${userId}`], "besttime_import_started", 3, 60)) {
    return jsonResponse({ error: "Import limit reached. Try again later." }, 429, req);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const requestedVenue = typeof body.venue_id === "string" && body.venue_id.trim() ? body.venue_id.trim() : null;
  await logSecurityEventForActors(supabase, "besttime_import_started", [`user:${userId}`], body, { requested_venue: requestedVenue });

  let mappingQuery = supabase.from("besttime_venue_map").select("venue_id,besttime_venue_id").not("besttime_venue_id", "is", null);
  if (requestedVenue) mappingQuery = mappingQuery.eq("venue_id", requestedVenue);
  const { data: mappings, error: mappingError } = await mappingQuery;
  if (mappingError) return jsonResponse({ error: "Unable to load venue mappings" }, 500, req);
  if (!mappings?.length) return jsonResponse({ ok: true, processed: 0, message: "No mapped venues" }, 200, req);

  const { data: run } = await supabase.from("source_import_runs").insert({
    source_type: "besttime_forecast_prior",
    status: "started",
    venue_id: requestedVenue,
    metadata: { requested_venue: requestedVenue, requested_by: userId },
  }).select("id").single();

  let processed = 0;
  const errors: string[] = [];
  for (const mapping of mappings) {
    let venueFailed = false;
    for (let day = 0; day < 7; day += 1) {
      const url = new URL("https://besttime.app/api/v1/forecasts/day");
      url.searchParams.set("api_key_public", besttimePublicKey);
      url.searchParams.set("venue_id", mapping.besttime_venue_id);
      url.searchParams.set("day_int", String(day));
      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          venueFailed = true;
          errors.push(`${mapping.venue_id} day ${day}: HTTP ${response.status}`);
          continue;
        }
        const payload = await response.json();
        const rows = (payload?.analysis?.hour_analysis || []).map((hourData: Record<string, unknown>) => {
          const crowd = prior(hourData.intensity_nr);
          const hour = Number(hourData.hour);
          if (crowd === null || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
          return {
            venue_id: mapping.venue_id,
            day_of_week: (day + 1) % 7,
            hour_of_day: hour,
            crowd_prior: crowd,
            wait_prior_minutes: waitFromCrowd(crowd),
            pseudo_count: 3,
            source_type: "besttime_forecast_prior",
            sample_count: 0,
            last_calibrated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }).filter(Boolean);
        if (!rows.length) continue;
        const { error } = await supabase.from("venue_hourly_priors").upsert(rows, { onConflict: "venue_id,day_of_week,hour_of_day" });
        if (error) {
          venueFailed = true;
          errors.push(`${mapping.venue_id} day ${day}: ${error.message}`);
        } else processed += rows.length;
      } catch (error) {
        venueFailed = true;
        errors.push(`${mapping.venue_id} day ${day}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await supabase.from("besttime_venue_map").update({
      coverage_status: venueFailed ? "unverified" : "forecast_ready",
      last_forecast_import_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("venue_id", mapping.venue_id);
  }

  if (run?.id) await supabase.from("source_import_runs").update({
    status: errors.length ? (processed ? "partial" : "failed") : "success",
    records_processed: processed,
    error: errors.slice(0, 8).join(" | ") || null,
    finished_at: new Date().toISOString(),
    metadata: { error_count: errors.length, requested_by: userId },
  }).eq("id", run.id);

  return jsonResponse({ ok: errors.length === 0, processed, errors }, 200, req);
});
