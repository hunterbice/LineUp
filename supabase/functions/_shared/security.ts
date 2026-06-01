import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const encoder = new TextEncoder();

export function clientIp(req: Request) {
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "")
    .split(",")[0]
    .trim();
}

export function userAgent(req: Request) {
  return (req.headers.get("user-agent") || "").slice(0, 180);
}

export function actorDevice(body: Record<string, unknown>, req: Request) {
  const device = typeof body.device_id === "string" ? body.device_id.trim() : "";
  return device || `ip:${clientIp(req) || "unknown"}`;
}

export function actorKeys(body: Record<string, unknown>, req: Request) {
  const device = typeof body.device_id === "string" ? body.device_id.trim() : "";
  const ip = clientIp(req);
  const ua = userAgent(req);
  return Array.from(new Set([
    actorDevice(body, req),
    device && `device:${device}`,
    ip && `ip:${ip}`,
    ip && ua && `ipua:${ip}:${ua}`,
  ].filter(Boolean) as string[]));
}

export function sinceMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlEncode(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function randomId(prefix: string) {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `${prefix}_${base64UrlEncode(bytes)}`;
}

export async function issueDeviceToken(deviceId: string, sessionId: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const secret = Deno.env.get("LINEUP_DEVICE_TOKEN_SECRET") || "";
  if (!secret) throw new Error("LINEUP_DEVICE_TOKEN_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    device_id: deviceId,
    session_id: sessionId,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyDeviceToken(body: Record<string, unknown>) {
  const secret = Deno.env.get("LINEUP_DEVICE_TOKEN_SECRET") || "";
  if (!secret) return { ok: false, error: "Device token secret is not configured" };
  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  const token = typeof body.device_token === "string" ? body.device_token.trim() : "";
  if (!deviceId || !token || !token.includes(".")) return { ok: false, error: "A valid device token is required" };
  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return { ok: false, error: "A valid device token is required" };
  const verified = await crypto.subtle.verify("HMAC", await hmacKey(secret), base64UrlDecode(encodedSignature), encoder.encode(encodedPayload));
  if (!verified) return { ok: false, error: "Device token signature is invalid" };
  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return { ok: false, error: "Device token payload is invalid" };
  }
  if (payload.device_id !== deviceId) return { ok: false, error: "Device token does not match this device" };
  if (!payload.exp || Number(payload.exp) * 1000 < Date.now()) return { ok: false, error: "Device token expired" };
  return { ok: true, payload };
}

export async function staffCodeHash(code: string, venueId: string) {
  const pepper = Deno.env.get("LINEUP_STAFF_CODE_PEPPER") || "";
  return `sha256:${await sha256Hex(`${pepper}:${venueId}:${code}`)}`;
}

export function staffCodePreview(code: string) {
  return code ? code.slice(-4) : "";
}

export async function logSecurityEvent(
  admin: SupabaseClient,
  action: string,
  actor: string,
  body: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
) {
  try {
    await admin.from("owner_audit_logs").insert({
      action,
      actor_device_id: actor,
      actor_mode: "security",
      target_type: body.venue_id ? "venue" : "system",
      target_id: String(body.venue_id ?? ""),
      metadata: {
        ...metadata,
        origin: metadata.origin ?? null,
        has_code: Boolean(body.code),
      },
    });
  } catch {
    // Auth logging must not expose internals or block a legitimate user.
  }
}

export async function logSecurityEventForActors(
  admin: SupabaseClient,
  action: string,
  actors: string[],
  body: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
) {
  const keys = Array.from(new Set(actors.filter(Boolean)));
  if (!keys.length) return logSecurityEvent(admin, action, "", body, metadata);
  try {
    await admin.from("owner_audit_logs").insert(keys.map((actor) => ({
      action,
      actor_device_id: actor,
      actor_mode: "security",
      target_type: body.venue_id ? "venue" : "system",
      target_id: String(body.venue_id ?? ""),
      metadata: {
        ...metadata,
        origin: metadata.origin ?? null,
        has_code: Boolean(body.code),
        rate_limit_key: true,
      },
    })));
  } catch {
    // Auth logging must not expose internals or block a legitimate user.
  }
}

export async function isRateLimitedAny(
  admin: SupabaseClient,
  actors: string[],
  action: string,
  maxFailures = 8,
  minutes = 15,
) {
  const keys = actors.filter(Boolean);
  if (!keys.length) return false;
  const { count, error } = await admin
    .from("owner_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .in("actor_device_id", keys)
    .gte("created_at", sinceMinutes(minutes));

  if (error) return false;
  return Number(count || 0) >= maxFailures;
}
