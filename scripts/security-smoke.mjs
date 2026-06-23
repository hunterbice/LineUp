import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migrationDir = path.join(root, "supabase/migrations");
const migrationFiles = fs.readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort();
const migrations = migrationFiles.map((file) => read(`supabase/migrations/${file}`)).join("\n");
const lockMigration = read("supabase/migrations/202606190001_lock_direct_ingest_paths.sql");
const rpcLockMigration = read("supabase/migrations/202606190002_lock_rpc_execution_grants.sql");
const appEvent = read("supabase/functions/app-event-ingest/index.ts");
const profileSummary = read("supabase/functions/device-profile-summary/index.ts");
const analyticsIngest = read("supabase/functions/venue-analytics-ingest/index.ts");
const accountSync = read("supabase/functions/account-sync/index.ts");
const earlyAccess = read("supabase/functions/early-access/index.ts");
const deviceSession = read("supabase/functions/device-session/index.ts");
const locationIngest = read("supabase/functions/location-ingest/index.ts");
const venueStatus = read("supabase/functions/venue-status-ingest/index.ts");
const ownerActions = read("supabase/functions/owner-actions/index.ts");
const ownerDashboard = read("supabase/functions/owner-dashboard/index.ts");
const besttimeImport = read("supabase/functions/besttime-prior-import/index.ts");
const analyticsService = read("src/services/venueAnalyticsService.js");
const main = read("src/main.js");
const cacheState = read("src/state/cacheState.js");
const cors = read("supabase/functions/_shared/cors.ts");

const createdTables = new Set([...migrations.matchAll(/create table(?: if not exists)?\s+(public\.[a-z0-9_]+)/gi)].map((match) => match[1].toLowerCase()));
const rlsTables = new Set([...migrations.matchAll(/alter table\s+(public\.[a-z0-9_]+)\s+enable row level security/gi)].map((match) => match[1].toLowerCase()));
assert.deepEqual([...createdTables].filter((table) => !rlsTables.has(table)), [], "every migration-created public table must enable RLS");
assert.doesNotMatch(migrations, /disable row level security/i, "migrations must not disable RLS");
const functionBlocks = migrations.split(/(?=create(?: or replace)? function\s)/i).filter((block) => /^create(?: or replace)? function\s/i.test(block));
const unsafeDefiners = functionBlocks.filter((block) => /security definer/i.test(block) && !/set search_path\s*=\s*(?:public|''|pg_catalog)/i.test(block));
assert.deepEqual(unsafeDefiners.map((block) => block.match(/function\s+([^\s(]+)/i)?.[1]), [], "every SECURITY DEFINER function must pin search_path");

for (const table of ["reports", "app_signal_events", "venue_analytics_events"]) {
  assert.match(lockMigration, new RegExp(`drop policy if exists [^\\n]+ on public\\.${table}`, "i"), `${table} direct insert policy must be removed`);
}
assert.match(lockMigration, /revoke insert, update, delete, truncate, references, trigger on[\s\S]*public\.reports[\s\S]*public\.reward_events[\s\S]*public\.venue_analytics_events[\s\S]*from public, anon, authenticated/i, "server-owned tables must revoke all browser mutation privileges");
assert.match(lockMigration, /revoke delete, truncate, references, trigger on public\.venue_deals/, "deal deletion and structural privileges must be revoked");
assert.match(rpcLockMigration, /revoke execute on function public\.venue_deal_performance\(text\) from public, anon/, "deal performance RPC must not inherit anonymous/PUBLIC execute");
assert.match(migrations, /create policy "Venue staff can create plan-gated deals"[\s\S]*private\.can_manage_venue\(venue_id\)[\s\S]*private\.venue_has_deal_plan\(venue_id\)/, "deal creation must require venue assignment and an eligible plan");
assert.match(migrations, /create policy "Venue staff can update plan-gated deals"[\s\S]*private\.can_promote_venue_deal\(venue_id, promotion_tier\)/, "deal updates must enforce venue and promotion eligibility");
assert.match(migrations, /analytics_deal_matches_venue\(deal_id, venue_id\)/, "analytics RLS must bind deal IDs to venue IDs");

for (const [label, source] of [["app events", appEvent], ["profile summary", profileSummary], ["analytics", analyticsIngest], ["account sync", accountSync], ["early access", earlyAccess]]) {
  assert.match(source, /verifyDeviceToken\(body\)/, `${label} must require signed device proof`);
  assert.match(source, /auth\.getUser\(token\)/, `${label} must validate the authenticated account token`);
}
assert.match(profileSummary, /from\("user_devices"\)[\s\S]*eq\("user_id", user\.id\)[\s\S]*eq\("device_id", deviceId\)/, "profile summary must bind device ID to authenticated user");
assert.doesNotMatch(profileSummary, /profile:\s*data/, "profile summary must not return raw RPC device_id payload");
assert.match(appEvent, /eq\("user_id", user\.id\)[\s\S]*>= 120/, "app events must include a per-user rate limit");
assert.match(analyticsIngest, /recentCount\(supabase, "device_id", deviceId\)/, "analytics must rate limit devices");
assert.match(analyticsIngest, /recentCount\(supabase, "user_id", user\.id\)/, "analytics must rate limit users");
assert.match(analyticsIngest, /Deal does not belong to venue/, "analytics must reject deal/venue mismatch");
assert.match(analyticsIngest, /lat\|lng\|location\|coord\|position/i, "analytics metadata must reject location-like keys");
assert.match(analyticsIngest, /deal_impression[\s\S]*duplicate/i, "analytics must deduplicate recent deal impressions");

assert.match(accountSync, /verifyDeviceToken\(body\)[\s\S]*claimDeviceData\(supabase, user\.id, deviceId\)/, "device claims must require device proof and use auth user ID");
assert.match(accountSync, /action === "delete_account"[\s\S]*deleteAccountData\(supabase, user\.id, deviceId\)[\s\S]*auth\.admin\.deleteUser\(user\.id\)/, "account deletion must remain self-bound to the authenticated account");
assert.match(accountSync, /presence_snapshots[\s\S]*venue_checkins[\s\S]*reports[\s\S]*recompute_venue_live_status/, "account deletion must clear precise activity and remove report-derived truth");
assert.match(earlyAccess, /verifyDeviceToken\(body\)/, "early access must require signed-device proof");
assert.match(earlyAccess, /auth\.getUser\(token\)/, "early access must validate the authenticated account");
assert.match(earlyAccess, /launch_deal_requests[\s\S]*>= 20/, "launch deal requests must be rate limited");
assert.match(migrations, /revoke all on public\.launch_deal_requests from public, anon, authenticated/, "launch deal requests must reject direct browser access");
assert.match(migrations, /launch_deal_interest[\s\S]*private\.can_manage_venue/, "launch deal aggregates must require venue authorization");
assert.match(venueStatus, /accountAccess\(req, supabase, venueId\)[\s\S]*Venue account access required/, "venue status writes must verify role for requested venue");
assert.match(ownerActions, /hasOwnerAccess\(req\)[\s\S]*Owner access required/, "owner actions must verify owner role before action routing");
assert.match(ownerDashboard, /from\("venue_admins"\)[\s\S]*in\("role", \["owner", "admin"\]\)[\s\S]*Owner access denied/, "owner dashboard must verify an owner/admin database role and reject non-owner accounts");
assert.match(besttimeImport, /isAllowedOrigin[\s\S]*auth\.getUser\(token\)[\s\S]*eq\("role", "owner"\)/, "BestTime imports must enforce origin, auth, and owner role");
assert.match(besttimeImport, /isRateLimitedAny[\s\S]*besttime_import_started/, "BestTime imports must be rate limited");
assert.match(locationIngest, /const verifiedDevice = await verifyDeviceToken\(body\)/, "all location ingest actions must require signed device proof");
assert.doesNotMatch(locationIngest, /action === "report" \|\| action === "check_in"[\s\S]*verifyDeviceToken/, "presence must not bypass signed device proof");
assert.match(deviceSession, /isRateLimitedAny[\s\S]*device_session_issued[\s\S]*logSecurityEventForActors/, "device session issuance must be rate limited and auditable");
assert.match(cors, /if \(origin === "null"\) return false/, "opaque browser origins must not receive CORS access");

assert.doesNotMatch(analyticsService, /\.from\("venue_analytics_events"\)\.insert/, "frontend analytics service must not insert directly into Supabase");
assert.match(analyticsService, /ingestEvent\(payload\)/, "frontend analytics must use secured ingest dependency");
assert.match(main, /deviceFunctionRequest\("venue-analytics-ingest"/, "app must route analytics through signed-device ingest");
assert.match(main, /deviceFunctionRequest\("app-event-ingest"/, "app events must use signed-device transport");
assert.match(main, /deviceFunctionRequest\("device-profile-summary"/, "profile summary must use signed-device transport");
assert.match(main, /accountPermissions=\{owner:false,roles:\[\],venues:\[\]\}/, "privileged UI must start with no permissions");
assert.doesNotMatch(main, /cacheState\.(?:get|set)(?:AuthState|AccountPermissions|PresenceState|ProfileSummary|AccountPrefs|RewardSummary|ActivityLog)/, "auth, role, profile, reward, presence, and activity truth must not use local cache");
assert.match(main, /clearSensitiveAccountCache\(\)/, "legacy sensitive account cache must be cleared at boot");
assert.match(main, /function rewardRequest\(action,extra\)[\s\S]*if\(!authAccessToken\)return Promise\.reject/, "reward endpoint calls must wait for an authenticated session");
assert.match(main, /if\(!canAdminVenue\(id\)\)return showToast\("Venue access required"\)/, "deal/staff UI entry must be hidden from unauthorized users as UX defense in depth");
for (const key of ["lineup_auth_state", "lineup_account_permissions", "lineup_presence_state", "lineup_profile_summary", "lineup_account_prefs", "lineup_reward_summary", "lineup_activity_log"]) {
  assert.doesNotMatch(cacheState, new RegExp(`writeJson\\(\\"${key}\\"`), `${key} must never be written`);
  assert.match(cacheState, new RegExp(`removeItem\\(\\"${key}\\"\\)`), `${key} legacy data must be cleared`);
}

const directStorageFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js") && !full.endsWith(path.join("src", "state", "cacheState.js")) && /localStorage\./.test(fs.readFileSync(full, "utf8"))) directStorageFiles.push(full);
  }
}
walk(path.join(root, "src"));
assert.deepEqual(directStorageFiles, [], "localStorage access must remain centralized in cacheState.js");

console.log(`Security smoke checks passed: ${createdTables.size} RLS tables audited`);
