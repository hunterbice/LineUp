import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

const campusSlug = "university_of_arizona";

function clean(value: unknown, max = 128) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data?.user || null;
}

async function status(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: profile, error: profileError }, { data: requests, error: requestError }] = await Promise.all([
    supabase.from("user_profiles").select("early_access_joined_at,campus_slug").eq("user_id", userId).maybeSingle(),
    supabase.from("launch_deal_requests").select("venue_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  if (profileError) throw profileError;
  if (requestError) throw requestError;
  return {
    joined: Boolean(profile?.early_access_joined_at),
    joined_at: profile?.early_access_joined_at || null,
    campus_slug: profile?.campus_slug || campusSlug,
    requested_venue_ids: (requests || []).map((row) => row.venue_id),
  };
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

  const action = clean(body.action, 32) || "status";
  try {
    if (action === "status") return jsonResponse({ ok: true, early_access: await status(supabase, user.id) }, 200, req);

    if (action === "join") {
      const { error } = await supabase.from("user_profiles").update({
        early_access_joined_at: new Date().toISOString(),
        campus_slug: campusSlug,
        home_area: "main_gate",
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      if (error) throw error;
      return jsonResponse({ ok: true, early_access: await status(supabase, user.id) }, 200, req);
    }

    if (action === "request_deal") {
      const venueId = clean(body.venue_id, 64);
      if (!venueId) return jsonResponse({ error: "venue_id is required" }, 400, req);

      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("id,status,deprecated")
        .eq("id", venueId)
        .maybeSingle();
      if (venueError) throw venueError;
      if (!venue || venue.status !== "active" || venue.deprecated) return jsonResponse({ error: "Unknown active venue" }, 404, req);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("launch_deal_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if (countError) throw countError;
      if (Number(count || 0) >= 20) return jsonResponse({ error: "Deal request limit reached. Try again tomorrow." }, 429, req);

      await supabase.from("user_profiles").update({
        early_access_joined_at: new Date().toISOString(),
        campus_slug: campusSlug,
        home_area: "main_gate",
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).is("early_access_joined_at", null);

      const { error } = await supabase.from("launch_deal_requests").upsert({
        user_id: user.id,
        venue_id: venueId,
        campus_slug: campusSlug,
      }, { onConflict: "user_id,venue_id", ignoreDuplicates: true });
      if (error) throw error;
      return jsonResponse({ ok: true, duplicate: Number(count || 0) > 0, early_access: await status(supabase, user.id) }, 200, req);
    }

    return jsonResponse({ error: "Unknown action" }, 400, req);
  } catch (error) {
    console.error("early-access failed", error);
    return jsonResponse({ error: "Early access request failed" }, 500, req);
  }
});
