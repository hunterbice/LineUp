import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { actorDevice, actorKeys, isRateLimitedAny, logSecurityEventForActors } from "../_shared/security.ts";

function json(body: unknown, status = 200, req?: Request) { return jsonResponse(body, status, req); }
function since(minutes: number) { return new Date(Date.now() - minutes * 60 * 1000).toISOString(); }
function hourAgo(hours: number) { return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(); }
function uniqueCount(rows: any[], key: string) { return new Set(rows.map((r) => r[key]).filter(Boolean)).size; }
function countBy(rows: any[], key: string) { return rows.reduce((acc: Record<string, number>, row) => { const v = row[key] || "unknown"; acc[v] = (acc[v] || 0) + 1; return acc; }, {}); }
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function maskCode(last4: unknown) { const value = typeof last4 === "string" ? last4.trim() : ""; return value ? `****${value}` : ""; }
function displayPoint(value: unknown) { const n = Number(value); return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return json({ error: "Origin not allowed" }, 403, req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ownerCode = Deno.env.get("LINEUP_OWNER_CODE") || "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server is missing Supabase configuration" }, 500, req);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_error) { return json({ error: "Invalid JSON body" }, 400, req); }
  const actor = actorDevice(body, req);
  const actors = actorKeys(body, req);
  const origin = req.headers.get("Origin");

  if (await isRateLimitedAny(supabase, actors.length ? actors : [actor], "owner_auth_failed")) {
    return json({ error: "Too many attempts. Try again later." }, 429, req);
  }

  const authHeader = req.headers.get("Authorization") || "";
  let ownerByAccount = false;
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData.user?.id) {
      const { data: adminRows } = await supabase.from("venue_admins").select("user_id").eq("user_id", userData.user.id).eq("role", "owner").limit(1);
      ownerByAccount = Boolean(adminRows && adminRows.length);
    }
  }
  if (!(ownerCode && clean(body.code) === ownerCode) && !ownerByAccount) {
    await logSecurityEventForActors(supabase, "owner_auth_failed", actors, body, { action: "owner_dashboard", origin });
    return json({ error: "Owner access denied" }, 401, req);
  }

  try {
    const [presence15, presence60, presence24, reports24, checkins24, appSignals24, rewardEvents24, redemptions24, venues, live, recentRedemptions, staffCodes, auditLogs] = await Promise.all([
      supabase.from("presence_snapshots").select("nearest_venue_id, nearest_distance_m, area, source, location_verified, lat_rounded, lng_rounded, created_at, device_id, user_id").gte("created_at", since(15)).order("created_at", { ascending: false }).limit(500),
      supabase.from("presence_snapshots").select("nearest_venue_id, nearest_distance_m, area, source, location_verified, lat_rounded, lng_rounded, created_at, device_id, user_id").gte("created_at", since(60)).order("created_at", { ascending: false }).limit(1000),
      supabase.from("presence_snapshots").select("nearest_venue_id, area, source, location_verified, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(3000),
      supabase.from("reports").select("venue_id, crowd_level, wait_minutes, location_verified, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(1000),
      supabase.from("venue_checkins").select("venue_id, verified, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(1000),
      supabase.from("app_signal_events").select("venue_id, event_type, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(2000),
      supabase.from("reward_events").select("reason, points, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(1000),
      supabase.from("reward_redemptions").select("reward_type, points_spent, status, created_at, device_id, user_id").gte("created_at", hourAgo(24)).order("created_at", { ascending: false }).limit(500),
      supabase.from("venues").select("id, name, area, lat, lng, status, deprecated").eq("status", "active").eq("deprecated", false),
      supabase.from("live_status").select("venue_id, crowd_level, wait_minutes, confidence, momentum, fresh_at, updated_at"),
      supabase.from("reward_redemptions").select("id,reward_type,points_spent,status,code,created_at").order("created_at", { ascending: false }).limit(25),
      supabase.from("venue_staff_codes").select("id,venue_id,label,code_last4,active,created_at,expires_at").order("created_at", { ascending: false }).limit(40),
      supabase.from("owner_audit_logs").select("id,action,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(25),
    ]);
    const responses: any[] = [presence15, presence60, presence24, reports24, checkins24, appSignals24, rewardEvents24, redemptions24, venues, live, recentRedemptions, staffCodes, auditLogs];
    const firstError = responses.map((r) => r.error).find(Boolean);
    if (firstError) return json({ error: firstError.message }, 500, req);
    const p15 = presence15.data || [], p60 = presence60.data || [], p24 = presence24.data || [];
    const r24 = reports24.data || [], c24 = checkins24.data || [], a24 = appSignals24.data || [], rew24 = rewardEvents24.data || [], red24 = redemptions24.data || [];
    const venueRows = venues.data || [], liveRows = live.data || [];
    const venueNames = new Map(venueRows.map((v: any) => [v.id, v.name]));
    const liveByVenue = new Map(liveRows.map((row: any) => [row.venue_id, row]));
    const latestByDevice = new Map<string, any>();
    for (const row of p60) { const key = row.user_id || row.device_id; if (key && !latestByDevice.has(key)) latestByDevice.set(key, row); }
    const activePoints = Array.from(latestByDevice.values()).slice(0, 160).map((row, i) => ({ id: `active_${i + 1}`, lat: displayPoint(row.lat_rounded), lng: displayPoint(row.lng_rounded), area: row.area, source: row.source, verified: Boolean(row.location_verified), nearest_venue_id: row.nearest_venue_id, nearest_venue_name: venueNames.get(row.nearest_venue_id) || row.nearest_venue_id || "Unknown", nearest_distance_m: Number(row.nearest_distance_m || 0), age_min: Math.max(0, Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000)) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const venueActivity = venueRows.map((venue: any) => { const l = liveByVenue.get(venue.id) || {}; return { id: venue.id, name: venue.name, area: venue.area, lat: Number(venue.lat), lng: Number(venue.lng), active_users_60m: p60.filter((row: any) => row.nearest_venue_id === venue.id).length, reports_24h: r24.filter((row: any) => row.venue_id === venue.id).length, checkins_24h: c24.filter((row: any) => row.venue_id === venue.id).length, app_events_24h: a24.filter((row: any) => row.venue_id === venue.id).length, crowd_level: l.crowd_level || "unknown", wait_minutes: l.wait_minutes ?? null, confidence: l.confidence || "unknown", momentum: l.momentum || "steady", fresh_at: l.fresh_at || l.updated_at || null }; }).sort((a, b) => b.active_users_60m - a.active_users_60m || b.app_events_24h - a.app_events_24h);
    const summary = { active_users_15m: uniqueCount(p15, "user_id") + uniqueCount(p15.filter((r: any) => !r.user_id), "device_id"), active_users_60m: uniqueCount(p60, "user_id") + uniqueCount(p60.filter((r: any) => !r.user_id), "device_id"), unique_users_24h: uniqueCount(p24, "user_id") + uniqueCount(p24.filter((r: any) => !r.user_id), "device_id"), reports_24h: r24.length, verified_reports_24h: r24.filter((row: any) => row.location_verified).length, checkins_24h: c24.length, verified_checkins_24h: c24.filter((row: any) => row.verified).length, app_events_24h: a24.length, points_issued_24h: rew24.reduce((sum: number, row: any) => sum + Number(row.points || 0), 0), redemptions_24h: red24.filter((row: any) => row.status !== "cancelled").length, generated_at: new Date().toISOString(), owner_by_account: ownerByAccount };
    const redemptions = (recentRedemptions.data || []).map((row: any) => ({ ...row, code: row.code || "" }));
    const staff = (staffCodes.data || []).map((row: any) => ({ id: row.id, venue_id: row.venue_id, label: row.label, active: row.active, created_at: row.created_at, expires_at: row.expires_at, code_preview: maskCode(row.code_last4) }));
    return json({ ok: true, summary, active_points: activePoints, venue_activity: venueActivity, event_mix: countBy(a24, "event_type"), reward_mix: countBy(rew24, "reason"), timeline_60m: [], recent_redemptions: redemptions, staff_codes: staff, audit_logs: auditLogs.data || [] }, 200, req);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Owner dashboard failed" }, 500, req); }
});
