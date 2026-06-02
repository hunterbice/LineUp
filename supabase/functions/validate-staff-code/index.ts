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

async function accountAccess(req: Request, venueId: string) {
  const user = await userFromRequest(req);
  if (!user) return null;
  const { data, error } = await admin
    .from("venue_admins")
    .select("id,venue_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "venue_owner", "venue_staff", "venue_admin"])
    .limit(20);
  if (error) throw error;
  const rows = data || [];
  const owner = rows.find((row) => row.role === "owner" || row.role === "admin");
  if (owner) return { access: "owner", venue_id: null, label: "Owner account" };
  const staff = rows.find((row) => row.venue_id === venueId);
  if (staff) return { access: "venue", venue_id: venueId, label: "Staff account" };
  return null;
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
    const venueId = String(body.venue_id ?? "").trim();
    const actor = actorDevice(body, req);
    const actors = actorKeys(body, req);
    const origin = req.headers.get("Origin");

    if (await isRateLimitedAny(admin, actors.length ? actors : [actor], "staff_auth_failed")) {
      return jsonResponse({ error: "Too many attempts. Try again later." }, 429, req);
    }

    if (!venueId) {
      await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "missing_venue", origin });
      return jsonResponse({ error: "Missing venue" }, 400, req);
    }

    const { data: venue, error: venueError } = await admin
      .from("venues")
      .select("id,status,deprecated")
      .eq("id", venueId)
      .maybeSingle();

    if (venueError) throw venueError;
    if (!venue || venue.status !== "active" || venue.deprecated) {
      await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "inactive_venue", origin });
      return jsonResponse({ error: "Access denied" }, 403, req);
    }

    const authAccess = await accountAccess(req, venueId);
    if (authAccess) {
      return jsonResponse({
        ok: true,
        access: authAccess.access,
        owner: authAccess.access === "owner",
        venue_id: authAccess.venue_id,
        label: authAccess.label,
        auth_account: true,
      }, 200, req);
    }

    await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "no_account_role", origin });
    return jsonResponse({ error: "Venue account access required" }, 401, req);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Staff validation failed" }, 500, req);
  }
});
