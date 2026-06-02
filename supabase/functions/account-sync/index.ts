import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { verifyDeviceToken } from "../_shared/security.ts";

function cleanText(value: unknown, max = 128) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function cleanVenueList(value: unknown) {
  return Array.isArray(value) ? Array.from(new Set(value.map((item) => cleanText(item, 64)).filter(Boolean))).slice(0, 50) : [];
}
function cleanPrefs(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { interaction_visibility: null, display_name: null, avatar_url: null, profile_setup_completed: null, notification_pref: null, location_pref: null, terms_accepted: null, data_policy_seen: null };
  const prefs = value as Record<string, unknown>;
  const rawVisibility = cleanText(prefs.interaction_visibility, 24);
  const visibility = rawVisibility === "public" || rawVisibility === "anonymous" ? rawVisibility : null;
  const displayName = cleanText(prefs.display_name, 32);
  const avatar = cleanText(prefs.avatar_url, 250000);
  const notification = cleanText(prefs.notification_pref, 24);
  const location = cleanText(prefs.location_pref, 24);
  return {
    interaction_visibility: visibility,
    display_name: displayName || null,
    avatar_url: avatar && avatar.startsWith("data:image/") ? avatar : null,
    profile_setup_completed: typeof prefs.profile_setup_completed === "boolean" ? prefs.profile_setup_completed : null,
    notification_pref: ["unset", "enabled", "disabled", "denied"].includes(notification) ? notification : null,
    location_pref: ["unset", "enabled", "disabled", "denied"].includes(location) ? location : null,
    terms_accepted: prefs.terms_accepted === true ? true : null,
    data_policy_seen: prefs.data_policy_seen === true ? true : null,
  };
}
async function getUser(req: Request, supabase: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
async function claimDeviceData(supabase: ReturnType<typeof createClient>, userId: string, deviceId: string) {
  const tables = ["reward_events", "reward_redemptions", "reporter_reliability", "reports", "venue_checkins", "presence_snapshots", "app_signal_events"];
  for (const table of tables) {
    await supabase.from(table).update({ user_id: userId }).eq("device_id", deviceId).is("user_id", null);
  }
}
async function getFavorites(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase.from("user_favorites").select("venue_id").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.venue_id);
}
async function upsertFavorites(supabase: ReturnType<typeof createClient>, userId: string, favorites: string[]) {
  if (!favorites.length) return;
  const rows = favorites.map((venue_id) => ({ user_id: userId, venue_id, metadata: { source: "account-sync-v1" } }));
  const { error } = await supabase.from("user_favorites").upsert(rows, { onConflict: "user_id,venue_id", ignoreDuplicates: true });
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);
  if (!isAllowedOrigin(req.headers.get("Origin"))) return jsonResponse({ error: "Origin not allowed" }, 403, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, req);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_error) { return jsonResponse({ error: "Invalid JSON body" }, 400, req); }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await getUser(req, supabase);
  if (!user) return jsonResponse({ error: "Authenticated session required" }, 401, req);

  const action = cleanText(body.action, 32) || "claim";
  const deviceId = cleanText(body.device_id, 128);
  if (!deviceId) return jsonResponse({ error: "device_id is required" }, 400, req);
  const verifiedDevice = await verifyDeviceToken(body);
  if (!verifiedDevice.ok) return jsonResponse({ error: verifiedDevice.error }, 401, req);

  try {
    const prefs = cleanPrefs(body.preferences);
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("display_name,interaction_visibility,avatar_url,profile_setup_completed,notification_pref,location_pref,terms_accepted_at,data_policy_seen_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const fallbackDisplayName = cleanText(user.user_metadata?.full_name, 80) || null;
    const nextDisplayName = prefs.display_name ?? existingProfile?.display_name ?? fallbackDisplayName;
    const nextVisibility = prefs.interaction_visibility || existingProfile?.interaction_visibility || "anonymous";
    const nextAvatar = prefs.avatar_url ?? existingProfile?.avatar_url ?? null;
    const nextSetup = prefs.profile_setup_completed ?? Boolean(existingProfile?.profile_setup_completed);
    const nextNotification = prefs.notification_pref || existingProfile?.notification_pref || "unset";
    const nextLocation = prefs.location_pref || existingProfile?.location_pref || "unset";
    const now = new Date().toISOString();

    await supabase.from("user_profiles").upsert({
      user_id: user.id,
      display_name: nextDisplayName,
      interaction_visibility: nextVisibility,
      avatar_url: nextAvatar,
      profile_setup_completed: nextSetup,
      notification_pref: nextNotification,
      location_pref: nextLocation,
      terms_accepted_at: existingProfile?.terms_accepted_at || (prefs.terms_accepted ? now : null),
      data_policy_seen_at: existingProfile?.data_policy_seen_at || (prefs.data_policy_seen ? now : null),
      updated_at: now,
    }, { onConflict: "user_id" });

    const profile = {
      interaction_visibility: nextVisibility,
      display_name: nextDisplayName || "",
      avatar_url: nextAvatar || "",
      profile_setup_completed: nextSetup,
      notification_pref: nextNotification,
      location_pref: nextLocation,
      terms_accepted: Boolean(existingProfile?.terms_accepted_at || prefs.terms_accepted),
      data_policy_seen: Boolean(existingProfile?.data_policy_seen_at || prefs.data_policy_seen),
    };

    await supabase.from("user_devices").upsert({
      user_id: user.id,
      device_id: deviceId,
      last_seen_at: new Date().toISOString(),
      metadata: { is_anonymous: Boolean(user.is_anonymous), source: "account-sync-v1" },
    }, { onConflict: "device_id" });

    if (action === "claim" || action === "sync_favorites") {
      await claimDeviceData(supabase, user.id, deviceId);
      await upsertFavorites(supabase, user.id, cleanVenueList(body.favorites));
      const favorites = await getFavorites(supabase, user.id);
      return jsonResponse({ ok: true, user: { id: user.id, is_anonymous: Boolean(user.is_anonymous), email: user.email || "" }, preferences: profile, favorites }, 200, req);
    }

    if (action === "update_profile") {
      return jsonResponse({ ok: true, user: { id: user.id, is_anonymous: Boolean(user.is_anonymous), email: user.email || "" }, preferences: profile }, 200, req);
    }

    if (action === "set_favorite") {
      const venueId = cleanText(body.venue_id, 64);
      if (!venueId) return jsonResponse({ error: "venue_id is required" }, 400, req);
      if (Boolean(body.favorited)) {
        const { error } = await supabase.from("user_favorites").upsert({ user_id: user.id, venue_id: venueId, metadata: { source: "account-sync-v1" } }, { onConflict: "user_id,venue_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("venue_id", venueId);
        if (error) throw error;
      }
      const favorites = await getFavorites(supabase, user.id);
      return jsonResponse({ ok: true, user: { id: user.id, is_anonymous: Boolean(user.is_anonymous), email: user.email || "" }, preferences: profile, favorites }, 200, req);
    }

    return jsonResponse({ error: "Unknown action" }, 400, req);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Account sync failed" }, 500, req);
  }
});
