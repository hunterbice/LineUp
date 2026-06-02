import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";

function cleanText(value: unknown, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function publicAuthor(row: any, profile: any) {
  const context = row.report_context || {};
  const visibility = row.interaction_visibility === "public" ? "public" : "anonymous";
  if (visibility !== "public") return { name: "Anonymous User", avatar_url: "", anonymous: true };
  const name = cleanText(context.display_name || profile.display_name, 32) || "LineUp User";
  const avatar = cleanText(context.avatar_url || profile.avatar_url, 250000);
  return { name, avatar_url: avatar.startsWith("data:image/") ? avatar : "", anonymous: false };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_) { return jsonResponse({ error: "Invalid JSON body" }, 400, req); }
  const venueId = cleanText(body.venue_id, 64);
  if (!venueId) return jsonResponse({ error: "venue_id is required" }, 400, req);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from("reports")
    .select("id,user_id,venue_id,crowd_level,wait_minutes,note,photo_signal,location_verified,interaction_visibility,created_at,report_context")
    .eq("venue_id", venueId)
    .eq("source", "user_report")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return jsonResponse({ error: error.message }, 500, req);

  const publicUserIds = Array.from(new Set((data || [])
    .filter((row: any) => row.interaction_visibility === "public" && row.user_id)
    .map((row: any) => row.user_id)));
  const profileMap = new Map<string, any>();
  if (publicUserIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id,display_name,avatar_url")
      .in("user_id", publicUserIds);
    if (profilesError) return jsonResponse({ error: profilesError.message }, 500, req);
    (profiles || []).forEach((profile: any) => profileMap.set(profile.user_id, profile));
  }

  const reports = (data || []).map((row: any) => {
    const author = publicAuthor(row, profileMap.get(row.user_id) || {});
    return {
      id: row.id,
      venue_id: row.venue_id,
      crowd_level: row.crowd_level,
      wait_minutes: Number(row.wait_minutes || 0),
      note: cleanText(row.note, 180),
      photo_signal: Boolean(row.photo_signal),
      location_verified: Boolean(row.location_verified),
      created_at: row.created_at,
      author,
    };
  });

  return jsonResponse({ ok: true, reports }, 200, req);
});
