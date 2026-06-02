import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

const REWARD_GOAL = 500;
const POINTS: Record<string, number> = { report: 10, verified_report: 15, checkin: 15, photo: 20, invite: 25, streak: 30 };
const DAILY_CAPS: Record<string, number> = { report_group: 3, checkin: 3, photo: 2, invite: 3, streak: 1 };
function cleanText(value: unknown, max = 96) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function phoenixDateKey(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function redemptionCode() { const bytes = new Uint8Array(5); crypto.getRandomValues(bytes); return `LU-${Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").toUpperCase()}`; }
async function getUserId(req: Request, supabase: ReturnType<typeof createClient>) { const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim(); if (!token) return null; const { data, error } = await supabase.auth.getUser(token); return error ? null : data?.user?.id ?? null; }
function dedupeById(rows: any[]) { return Array.from(new Map(rows.map((row) => [row.id, row])).values()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); }
function sourceWindowStart() { return new Date(Date.now() - 15 * 60 * 1000).toISOString(); }
function rowBelongsToActor(row: any, deviceId: string, userId: string | null) { return row?.device_id === deviceId || (!!userId && row?.user_id === userId); }
async function scopedRows(supabase: ReturnType<typeof createClient>, table: string, select: string, deviceId: string, userId: string | null) {
  const rows: any[] = [];
  const device = await supabase.from(table).select(select).eq("device_id", deviceId).order("created_at", { ascending: false });
  if (device.error) throw device.error;
  rows.push(...(device.data || []));
  if (userId) {
    const user = await supabase.from(table).select(select).eq("user_id", userId).order("created_at", { ascending: false });
    if (user.error) throw user.error;
    rows.push(...(user.data || []));
  }
  return dedupeById(rows);
}
async function verifyAwardSource(supabase: ReturnType<typeof createClient>, kind: string, body: Record<string, unknown>, deviceId: string, userId: string | null) {
  if (kind === "report" || kind === "verified_report" || kind === "photo") {
    const reportId = cleanText(body.report_id, 64);
    if (!reportId) throw new Error("A server-confirmed report_id is required for report rewards");
    const { data, error } = await supabase
      .from("reports")
      .select("id,user_id,device_id,location_verified,photo_signal,created_at")
      .eq("id", reportId)
      .gte("created_at", sourceWindowStart())
      .maybeSingle();
    if (error) throw error;
    if (!data || !rowBelongsToActor(data, deviceId, userId)) throw new Error("Report reward could not be verified");
    if (kind === "verified_report" && !data.location_verified) throw new Error("Verified report reward requires a verified nearby report");
    if (kind === "photo" && !data.photo_signal) throw new Error("Photo reward requires an approved report photo");
    return { source_table: "reports", source_id: String(data.id), report_id: String(data.id) };
  }
  if (kind === "checkin") {
    const checkinId = cleanText(body.checkin_id, 64);
    if (!checkinId) throw new Error("A server-confirmed checkin_id is required for check-in rewards");
    const { data, error } = await supabase
      .from("venue_checkins")
      .select("id,user_id,device_id,verified,created_at")
      .eq("id", checkinId)
      .gte("created_at", sourceWindowStart())
      .maybeSingle();
    if (error) throw error;
    if (!data || !rowBelongsToActor(data, deviceId, userId) || !data.verified) throw new Error("Check-in reward could not be verified");
    return { source_table: "venue_checkins", source_id: String(data.id), report_id: null };
  }
  return { source_table: "manual", source_id: null, report_id: null };
}
async function buildSummary(supabase: ReturnType<typeof createClient>, deviceId: string, userId: string | null) {
  const allEvents = await scopedRows(supabase, "reward_events", "id, points, reason, created_at, metadata", deviceId, userId);
  const allRedemptions = (await scopedRows(supabase, "reward_redemptions", "id, reward_type, points_spent, status, code, created_at, metadata", deviceId, userId)).filter((r) => r.status !== "cancelled");
  const pointsEarned = allEvents.reduce((sum, event) => sum + Number(event.points || 0), 0);
  const pointsSpent = allRedemptions.reduce((sum, item) => sum + Number(item.points_spent || 0), 0);
  const dayKey = phoenixDateKey();
  const todayByReason = allEvents.filter((event) => event.metadata?.day_key === dayKey).reduce((acc: Record<string, number>, event) => { acc[event.reason] = (acc[event.reason] || 0) + 1; return acc; }, {});
  return { device_id: deviceId, user_id: userId, points_earned: pointsEarned, points_spent: pointsSpent, balance: Math.max(0, pointsEarned - pointsSpent), reward_goal: REWARD_GOAL, can_redeem: pointsEarned - pointsSpent >= REWARD_GOAL, redeemed_skips: allRedemptions.filter((item) => item.reward_type === "lineup_skip").length, today: { day_key: dayKey, reports: (todayByReason.report || 0) + (todayByReason.verified_report || 0), checkins: todayByReason.checkin || 0, by_reason: todayByReason }, recent_events: allEvents.slice(0, 12), recent_redemptions: allRedemptions.slice(0, 5) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);
  let body: Record<string, unknown>; try { body = await req.json(); } catch (_) { return jsonResponse({ error: "Invalid JSON body" }, 400, req); }
  const action = cleanText(body.action, 24) || "summary", deviceId = cleanText(body.device_id, 128);
  if (!deviceId) return jsonResponse({ error: "device_id is required" }, 400, req);
  const verifiedDevice = await verifyDeviceToken(body);
  if (!verifiedDevice.ok) return jsonResponse({ error: verifiedDevice.error }, 401, req);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const userId = await getUserId(req, supabase);
  if (!userId) return jsonResponse({ error: "LineUp account required" }, 401, req);
  try {
    if (action === "summary") return jsonResponse({ ok: true, summary: await buildSummary(supabase, deviceId, userId) }, 200, req);
    if (action === "award") {
      const kind = cleanText(body.kind, 32); if (!POINTS[kind]) return jsonResponse({ error: "Unsupported reward event" }, 400, req);
      const dayKey = phoenixDateKey(), summary = await buildSummary(supabase, deviceId, userId), counts = summary.today.by_reason || {};
      const reportGroupCount = (counts.report || 0) + (counts.verified_report || 0), sameKindCount = counts[kind] || 0;
      if ((kind === "report" || kind === "verified_report") && reportGroupCount >= DAILY_CAPS.report_group) return jsonResponse({ ok: true, capped: true, message: "Daily report points are maxed", summary }, 200, req);
      if (kind !== "report" && kind !== "verified_report" && sameKindCount >= (DAILY_CAPS[kind] ?? 99)) return jsonResponse({ ok: true, capped: true, message: "Daily points are maxed for this action", summary }, 200, req);
      const source = await verifyAwardSource(supabase, kind, body, deviceId, userId);
      if (source.source_id) {
        const existing = await supabase
          .from("reward_events")
          .select("id")
          .eq("device_id", deviceId)
          .eq("source_table", source.source_table)
          .eq("source_id", source.source_id)
          .maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) return jsonResponse({ ok: true, capped: true, message: "Points were already awarded for that action", summary }, 200, req);
      }
      const points = POINTS[kind];
      const { error } = await supabase.from("reward_events").insert({ user_id: userId, device_id: deviceId, report_id: source.report_id, source_table: source.source_table, source_id: source.source_id, points, reason: kind, metadata: { label: cleanText(body.label, 96), day_key: dayKey, source: "reward-ledger-v3" } });
      if (error) throw error;
      return jsonResponse({ ok: true, awarded: { kind, points }, summary: await buildSummary(supabase, deviceId, userId) }, 200, req);
    }
    if (action === "redeem") {
      const summary = await buildSummary(supabase, deviceId, userId);
      if (summary.balance < REWARD_GOAL) return jsonResponse({ error: "Not enough points to redeem", summary }, 409, req);
      const code = redemptionCode();
      const { error } = await supabase.from("reward_redemptions").insert({ user_id: userId, device_id: deviceId, reward_type: "lineup_skip", points_spent: REWARD_GOAL, status: "issued", code, metadata: { source: "reward-ledger-v2" } });
      if (error) throw error;
      return jsonResponse({ ok: true, redemption: { reward_type: "lineup_skip", points_spent: REWARD_GOAL, code }, summary: await buildSummary(supabase, deviceId, userId) }, 200, req);
    }
    return jsonResponse({ error: "Unknown action" }, 400, req);
  } catch (error) { return jsonResponse({ error: error instanceof Error ? error.message : "Reward service failed" }, 500, req); }
});
