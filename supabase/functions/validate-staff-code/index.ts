import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsResponse, isAllowedOrigin, jsonResponse } from "../_shared/cors.ts";
import { actorDevice, actorKeys, isRateLimitedAny, logSecurityEventForActors, staffCodeHash } from "../_shared/security.ts";

type StaffCodeRow = {
  venue_id: string;
  label: string | null;
  active: boolean;
  expires_at: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ownerCode = Deno.env.get("LINEUP_OWNER_CODE") ?? "";

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
    .in("role", ["owner", "venue_staff", "staff", "manager"])
    .limit(20);
  if (error) throw error;
  const rows = data || [];
  const owner = rows.find((row) => row.role === "owner");
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
    const code = String(body.code ?? "").trim();
    const venueId = String(body.venue_id ?? "").trim();
    const actor = actorDevice(body, req);
    const actors = actorKeys(body, req);
    const origin = req.headers.get("Origin");

    if (await isRateLimitedAny(admin, actors.length ? actors : [actor], "staff_auth_failed")) {
      return jsonResponse({ error: "Too many attempts. Try again later." }, 429, req);
    }

    if (ownerCode && code === ownerCode) {
      return jsonResponse({
        ok: true,
        access: "owner",
        owner: true,
        venue_id: null,
      }, 200, req);
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

    if (!code) {
      await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "missing_code", origin });
      return jsonResponse({ error: "Missing code" }, 400, req);
    }

    const codeHash = await staffCodeHash(code, venueId);

    const { data: staffCode, error: codeError } = await admin
      .from("venue_staff_codes")
      .select("venue_id,label,active,expires_at")
      .eq("venue_id", venueId)
      .eq("code_hash", codeHash)
      .eq("active", true)
      .maybeSingle<StaffCodeRow>();

    if (codeError) throw codeError;
    if (!staffCode || staffCode.venue_id !== venueId) {
      await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "invalid_code", origin });
      return jsonResponse({ error: "Access denied" }, 401, req);
    }

    if (staffCode.expires_at && new Date(staffCode.expires_at).getTime() < Date.now()) {
      await logSecurityEventForActors(admin, "staff_auth_failed", actors, body, { reason: "expired_code", origin });
      return jsonResponse({ error: "Access denied" }, 401, req);
    }

    return jsonResponse({
      ok: true,
      access: "venue",
      venue_id: staffCode.venue_id,
      label: staffCode.label,
    }, 200, req);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Staff validation failed" }, 500, req);
  }
});
