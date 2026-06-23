import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const config = fs.readFileSync(new URL("../src/config.js", import.meta.url), "utf8");
const url = config.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const key = config.match(/SUPABASE_KEY\s*=\s*"([^"]+)"/)?.[1];
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) throw new Error("Public Supabase configuration missing");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for isolated live IDOR tests");

const baseHeaders = { "Content-Type": "application/json", apikey: key, Origin: "https://get-lineup.app" };
async function request(path, options = {}) {
  const response = await fetch(url + path, { ...options, headers: { ...baseHeaders, ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}
function expectDenied(label, result) {
  if (![401, 403].includes(result.status)) throw new Error(`${label} expected 401/403, received ${result.status}`);
}
async function edge(name, body, accessToken = "") {
  return request(`/functions/v1/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}
async function newDevice() {
  const result = await edge("device-session", {});
  if (result.status !== 200 || !result.body?.device_id || !result.body?.device_token) {
    throw new Error(`device-session failed (${result.status})`);
  }
  return result.body;
}

for (const name of ["device-profile-summary", "app-event-ingest", "venue-analytics-ingest", "early-access", "owner-actions", "owner-dashboard", "venue-status-ingest", "besttime-prior-import"]) {
  const result = await edge(name, { venue_id: "bens", device_id: "security_probe", event_type: "detail_view", crowd_level: "busy", action: "venue_detail" });
  expectDenied(`${name} unauthenticated call`, result);
}

const probes = [
  ["direct report insert", "/rest/v1/reports", { venue_id: "bens", crowd_level: "security_probe_invalid", wait_minutes: 0, source: "user_report" }],
  ["direct app signal insert", "/rest/v1/app_signal_events", { venue_id: "bens", event_type: "security_probe_invalid", device_id: "security_probe" }],
  ["direct analytics insert", "/rest/v1/venue_analytics_events", { venue_id: "bens", event_type: "security_probe_invalid", metadata: {} }],
  ["direct launch deal request insert", "/rest/v1/launch_deal_requests", { user_id: "00000000-0000-0000-0000-000000000001", venue_id: "bens" }],
  ["direct role self-assignment", "/rest/v1/venue_admins", { user_id: "00000000-0000-0000-0000-000000000001", venue_id: null, role: "owner" }],
  ["direct live status update", "/rest/v1/live_status?venue_id=eq.bens", { crowd_level: "security_probe_invalid" }, "PATCH"],
  ["direct subscription update", "/rest/v1/venue_subscriptions?venue_id=eq.bens", { plan: "security_probe_invalid" }, "PATCH"],
  ["anonymous deal insert", "/rest/v1/venue_deals", { venue_id: "bens", title: "security probe", deal_type: "security_probe_invalid", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() - 1000).toISOString() }],
];
for (const [label, path, body, method = "POST"] of probes) {
  const result = await request(path, { method, body: JSON.stringify(body), headers: { Prefer: "return=minimal" } });
  expectDenied(label, result);
}

const subscriptions = await request("/rest/v1/venue_subscriptions?select=venue_id,plan&limit=1");
if (subscriptions.status !== 200 || !Array.isArray(subscriptions.body) || subscriptions.body.length !== 0) {
  throw new Error(`anonymous subscriptions read leaked rows or failed unexpectedly (${subscriptions.status})`);
}
const publicDeals = await request("/rest/v1/venue_deals?select=id,venue_id,title&is_active=eq.true&limit=1");
if (publicDeals.status !== 200 || !Array.isArray(publicDeals.body)) throw new Error(`anonymous public deal read failed (${publicDeals.status})`);
expectDenied("anonymous performance RPC", await request("/rest/v1/rpc/venue_deal_performance", { method: "POST", body: JSON.stringify({ target_venue_id: "bens" }) }));

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `LineUp-security-${suffix}!`;
const createdUsers = [];
try {
  async function createUser(label) {
    const email = `security-${label}-${suffix}@get-lineup.app`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error || new Error(`Unable to create ${label}`);
    createdUsers.push(data.user.id);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError || !sessionData.session) throw signInError || new Error(`Unable to sign in ${label}`);
    return { id: data.user.id, token: sessionData.session.access_token, client };
  }

  const [userA, userB] = await Promise.all([createUser("a"), createUser("b")]);
  const [deviceA, deviceB] = await Promise.all([newDevice(), newDevice()]);
  const claimA = await edge("account-sync", { action: "claim", ...deviceA, preferences: { display_name: "Security A", profile_setup_completed: true } }, userA.token);
  const claimB = await edge("account-sync", { action: "claim", ...deviceB, preferences: { display_name: "Security B", profile_setup_completed: true }, favorites: ["frog"] }, userB.token);
  if (claimA.status !== 200 || claimB.status !== 200) throw new Error(`account claim failed (${claimA.status}/${claimB.status})`);

  const ownProfile = await userA.client.from("user_profiles").select("user_id,display_name").eq("user_id", userA.id);
  const otherProfile = await userA.client.from("user_profiles").select("user_id,display_name").eq("user_id", userB.id);
  if (ownProfile.error || ownProfile.data?.length !== 1) throw new Error("user A cannot read own profile");
  if (otherProfile.error || otherProfile.data?.length !== 0) throw new Error("IDOR: user A can read user B profile");
  const otherFavorites = await userA.client.from("user_favorites").select("user_id,venue_id").eq("user_id", userB.id);
  if (otherFavorites.error || otherFavorites.data?.length !== 0) throw new Error("IDOR: user A can read user B favorites");

  const crossDevice = await edge("device-profile-summary", deviceB, userA.token);
  if (crossDevice.status !== 403) throw new Error(`cross-device profile read expected 403, received ${crossDevice.status}`);
  const forgedUpdate = await edge("account-sync", { action: "update_profile", user_id: userB.id, ...deviceA, preferences: { display_name: "Security A Updated" } }, userA.token);
  if (forgedUpdate.status !== 200 || forgedUpdate.body?.user?.id !== userA.id) throw new Error("account-sync did not bind update to authenticated user");

  const { error: roleError } = await admin.from("venue_admins").insert({ user_id: userA.id, venue_id: "bens", role: "venue_staff" });
  if (roleError) throw roleError;
  const staffPermissions = await edge("account-sync", { action: "claim", ...deviceA }, userA.token);
  if (staffPermissions.status !== 200 || !staffPermissions.body?.permissions?.venues?.some((venue) => venue.id === "bens")) {
    throw new Error("temporary staff role was not recognized for venue A");
  }
  const crossVenueWrite = await edge("venue-status-ingest", { venue_id: "frog", crowd_level: "busy", wait_minutes: 10, ...deviceA }, userA.token);
  if (![401, 403].includes(crossVenueWrite.status)) throw new Error(`BOLA: venue A staff reached venue B write path (${crossVenueWrite.status})`);
  const crossVenueAnalytics = await userA.client.rpc("venue_deal_performance", { target_venue_id: "frog" });
  if (crossVenueAnalytics.error || crossVenueAnalytics.data?.length !== 0) throw new Error("BOLA: venue A staff can read venue B analytics");
  expectDenied("ordinary/staff owner dashboard access", await edge("owner-dashboard", deviceA, userA.token));

  const directRoleWrite = await fetch(`${url}/rest/v1/venue_admins`, {
    method: "POST",
    headers: { ...baseHeaders, Authorization: `Bearer ${userB.token}`, Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userB.id, venue_id: null, role: "owner" }),
  });
  if (![401, 403].includes(directRoleWrite.status)) throw new Error(`privilege escalation write expected denial, received ${directRoleWrite.status}`);

  const joinEarlyAccess = await edge("early-access", { action: "join", ...deviceA }, userA.token);
  if (joinEarlyAccess.status !== 200 || !joinEarlyAccess.body?.early_access?.joined) throw new Error(`early access join failed (${joinEarlyAccess.status})`);
  const requestDeal = await edge("early-access", { action: "request_deal", venue_id: "bens", ...deviceA }, userA.token);
  if (requestDeal.status !== 200 || !requestDeal.body?.early_access?.requested_venue_ids?.includes("bens")) throw new Error(`launch deal request failed (${requestDeal.status})`);

  const deleteA = await edge("account-sync", { action: "delete_account", confirm: "DELETE", user_id: userB.id, ...deviceA }, userA.token);
  if (deleteA.status !== 200 || !deleteA.body?.deleted) throw new Error(`self account deletion failed (${deleteA.status})`);
  const deletedA = await admin.auth.admin.getUserById(userA.id);
  if (!deletedA.error) throw new Error("deleted user A still exists after self-delete");
  const survivingB = await admin.auth.admin.getUserById(userB.id);
  if (survivingB.error || !survivingB.data.user) throw new Error("BOLA: user A deletion affected user B");
} finally {
  for (const userId of createdUsers) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

console.log("Live security smoke checks passed, including isolated IDOR/BOLA probes");
