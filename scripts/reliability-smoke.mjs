import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createBarDetailController } from "../src/controllers/barDetailController.js";
import { createOwnerController } from "../src/controllers/ownerController.js";
import { createReportController } from "../src/controllers/reportController.js";
import { hydrateVenues } from "../src/controllers/retentionController.js";
import { createDealController, groupDealsByVenue, isDealCurrent, selectActiveDeals, selectDashboardDeals } from "../src/controllers/dealController.js";
import { createVenueStaffController } from "../src/controllers/venueStaffController.js";
import { createEarlyAccessController } from "../src/controllers/earlyAccessController.js";
import { createPermissionController } from "../src/controllers/permissionController.js";
import { venueAnalyticsTestHooks } from "../src/services/venueAnalyticsService.js";
import { venueDealTestHooks } from "../src/services/venueDealService.js";
import { renderDetailHtml, renderDetailPanel, renderReportRows } from "../src/ui/renderBarDetail.js";
import { renderRetentionDashboard } from "../src/ui/renderDashboard.js";
import { renderDealBadge, renderDealEditor, renderDealPerformance, renderVenueDealBlock } from "../src/ui/renderDeals.js";
import { dealEndingCue, renderDealsPage } from "../src/ui/renderDealsPage.js";
import { fallbackMapHtml } from "../src/ui/renderMap.js";
import { renderOwnerDashboardHtml } from "../src/ui/renderOwnerDashboard.js";
import { renderProfilePageHtml } from "../src/ui/renderProfile.js";
import { renderReportSheetHtml } from "../src/ui/renderReportSheet.js";
import { renderVenueControlsForBar } from "../src/ui/renderVenueControls.js";
import { renderPermissionEducationHtml, renderSetupGateHtml } from "../src/ui/renderShell.js";
import { renderAvatarEditor, renderPhotoCropSheet, renderPhotoSourceSheet } from "../src/ui/renderProfilePhoto.js";
import { filterCurrentNightReports, nightlifeWindowStart } from "../src/utils/nightlife.js";
import { PROFILE_IMAGE_MAX_DATA_URL_LENGTH, PROFILE_IMAGE_MAX_DIMENSION } from "../src/utils/profileImage.js";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
const cacheState = fs.readFileSync(path.join(root, "src/state/cacheState.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const publicSw = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
const config = fs.readFileSync(path.join(root, "src/config.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
const shellRenderer = fs.readFileSync(path.join(root, "src/ui/renderShell.js"), "utf8");
const permissionControllerSource = fs.readFileSync(path.join(root, "src/controllers/permissionController.js"), "utf8");
const profileRenderer = fs.readFileSync(path.join(root, "src/ui/renderProfile.js"), "utf8");
const dealsPageRenderer = fs.readFileSync(path.join(root, "src/ui/renderDealsPage.js"), "utf8");
const dealsRenderer = fs.readFileSync(path.join(root, "src/ui/renderDeals.js"), "utf8");
const manifest = fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8");
const publicManifest = fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8");
const offline = fs.readFileSync(path.join(root, "offline.html"), "utf8");
const publicOffline = fs.readFileSync(path.join(root, "public/offline.html"), "utf8");
const accountSync = fs.readFileSync(path.join(root, "supabase/functions/account-sync/index.ts"), "utf8");
const earlyAccessFunction = fs.readFileSync(path.join(root, "supabase/functions/early-access/index.ts"), "utf8");
const earlyAccessMigration = fs.readFileSync(path.join(root, "supabase/migrations/202606230001_app_store_early_access.sql"), "utf8");
const reportSheetRenderer = fs.readFileSync(path.join(root, "src/ui/renderReportSheet.js"), "utf8");
const locationIngest = fs.readFileSync(path.join(root, "supabase/functions/location-ingest/index.ts"), "utf8");
const reportsFeed = fs.readFileSync(path.join(root, "supabase/functions/reports-feed/index.ts"), "utf8");
const eventMigration = fs.readFileSync(path.join(root, "supabase/migrations/202606230002_current_night_events.sql"), "utf8");
const legalPages = ["privacy", "terms", "support"].map((name) => fs.readFileSync(path.join(root, `public/legal/${name}.html`), "utf8")).join("\n");
const nativeDocNames = [
  "native-rebuild-product-spec.md",
  "native-api-contract.md",
  "native-screen-state-inventory.md",
  "native-location-services-spec.md",
  "native-push-notification-spec.md",
  "native-v1-scope.md",
  "swift-feasibility-spike-plan.md",
  "native-swift-rebuild-risk-map.md",
  "native-rebuild-readiness-audit.md",
];
const nativeDocs = nativeDocNames.map((name) => fs.readFileSync(path.join(root, "docs", name), "utf8")).join("\n");
const agentRules = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const archivedDocs = [
  "legacy-pwa-app-store-readiness.md",
  "legacy-app-breakdown.md",
  "legacy-master-handoff.md",
  "priority-16-app-store-readiness-audit.md",
].map((name) => fs.readFileSync(path.join(root, "docs", "archive", name), "utf8"));

function ordered(source, patterns, label) {
  let cursor = -1;
  for (const pattern of patterns) {
    const next = source.slice(cursor + 1).search(pattern);
    if (next < 0) throw new Error(`${label} missing ordered step: ${pattern}`);
    cursor += next + 1;
  }
}

assert.match(cacheState, /removeItem\("lineup_bar_updates"\)/, "legacy venue overrides must be cleared");
assert.match(cacheState, /removeItem\("lineup_local_reports"\)/, "legacy local reports must be cleared");
assert.match(cacheState, /removeItem\("lineup_install_prompt_completed"\)/, "retired install prompt state should be cleared on boot");
assert.doesNotMatch(cacheState, /export function getInstallPromptState|export function markInstallPrompt/, "retired install prompt API should not remain callable");
assert.match(cacheState, /lineup_recent_venues/, "recent venues should use a dedicated cache key");
assert.match(cacheState, /venueId/, "recent venue cache should store venue IDs");
assert.match(cacheState, /viewedAt/, "recent venue cache should store timestamps");
assert.match(cacheState, /lineup_permission_education_/, "permission education progress should use a dedicated UI-only key");
assert.doesNotMatch(cacheState.match(/function permissionEducationKey[\s\S]*?export function getArea/)?.[0] || "", /granted|denied|coordinates|location_pref|notification_pref/, "permission education cache must not store actual permission truth");
const recentCacheBlock = cacheState.match(/export function getRecentVenues[\s\S]*?export function getArea/)?.[0] || "";
assert.doesNotMatch(recentCacheBlock, /\b(status|crowd|crowd_level|wait|wait_minutes|report|reports|live_status|confidence)\b/, "recent venue cache must not store live status fields");
assert.doesNotMatch(main, /lineup_bar_updates|lineup_local_reports/, "main must not read legacy local source-of-truth keys");
assert.match(main, /syncReportToSupabase\(bar,patch\)/, "structured normal reports must use backend ingest without public free text");
ordered(main, [/syncReportToSupabase\(bar,patch\)/, /loadVenueReports\(bar\.id\)/, /loadSupabaseStatus\(\)/], "report flow");
ordered(main, [/venueStatusIngest\(id,patch/, /loadSupabaseStatus\(\)/], "staff flow");
ordered(main, [/ownerAction\("venue_live_update"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner publish flow");
ordered(main, [/ownerAction\("set_venue_status"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner status flow");
assert.doesNotMatch(main, /Local update saved|saved locally/, "staff/report UI should not claim local mutation");
assert.equal(sw, publicSw, "public service worker must match root service worker");
assert.equal(config.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1], "v75", "APP_VERSION should be v75");
assert.match(sw, /lineup-pwa-v75/, "service worker should be v75");
assert.match(html, /data-page="highlightsPage"[^>]*aria-label="Deals"/, "main navigation should expose Deals");
assert.doesNotMatch(html, />Pulse</, "main navigation must not expose the retired Pulse label");
assert.match(html, /data-theme="light"/, "HTML should default to light mode");
assert.doesNotMatch(html, /data-theme="dark"|color-scheme" content="dark"|black-translucent/, "dark browser metadata must be removed");
assert.match(html, /theme-color" content="#F5F7FB"/, "HTML theme color should match the light app canvas");
assert.equal(manifest, publicManifest, "root and public manifests should match");
assert.equal(offline, publicOffline, "root and public offline pages should match");
assert.match(manifest, /"background_color": "#F5F7FB"/, "manifest background should be light");
assert.match(manifest, /"theme_color": "#F5F7FB"/, "manifest theme should be light");
assert.match(offline, /background:#F5F7FB/, "offline page canvas should be light");
assert.match(styles, /--bg:#F5F7FB/, "app background token should be the clean light canvas");
assert.match(styles, /--card:#FFFFFF/, "app card token should be white");
assert.match(styles, /--brand:#2563EB/, "brand token should use clean blue");
assert.doesNotMatch(styles, /--(?:bg|surface|card|brand):(?:#12151B|#191D24|#1D222A|#63D7CC)/, "old dark and teal root tokens must not return");
assert.doesNotMatch(main, /mapbox:\/\/styles\/mapbox\/dark-v11/, "maps should not use the dark style");
assert.match(agentRules + readme, /fully native SwiftUI/i, "canonical agent and README guidance should identify the fully native SwiftUI direction");
assert.match(agentRules + nativeDocs, /Supabase is (?:authoritative|the product source of truth)/i, "native guidance should preserve Supabase source of truth");
assert.doesNotMatch(agentRules + readme + nativeDocs, /LineUp is (?:frontend-only|front-end only|a static PWA)|There is no backend|localStorage (?:is|as) (?:the )?source of truth/i, "canonical native guidance must not restore obsolete frontend-only or local-storage truth claims");
assert.match(nativeDocs, /APNs token (?:sync|registration)[\s\S]*(?:missing|P0)/i, "native guidance should make the missing APNs backend contract explicit");
assert.match(nativeDocs, /Core Location[\s\S]*foreground/i, "native guidance should specify foreground Core Location");
assert.match(nativeDocs, /5(?:\s*:\s*00)? AM America\/Phoenix/i, "native guidance should preserve the current-night boundary");
archivedDocs.forEach((source) => assert.match(source, /Archived historical document\. Not canonical for the native Swift rebuild\./, "every stale handoff should carry a non-canonical archive warning"));
assert.doesNotMatch(main + shellRenderer + profileRenderer, /Add to Home Screen|Install LineUp|beforeinstallprompt|maybeShowAfterSplash/, "student runtime must not retain install promotion behavior");
assert.doesNotMatch(main, /function renderStats|NIGHT INTEL|Signal Profile/, "retired Intel and Signal Profile renderers must not remain reachable");
assert.match(shellRenderer, /togglePasswordVisibility\('authPassword',this\)/, "auth password field should expose an accessible visibility toggle");
assert.doesNotMatch(renderSetupGateHtml({ mode: "anonymous", displayName: "Test", avatarUrl: "" }), />Notifications<|>Use Location</, "core setup should not contain direct permission buttons");
assert.match(styles, /body\[data-page="permissionGate"\] \.bottomnav/, "permission education should hide the main app navigation until the flow finishes");
assert.match(renderSetupGateHtml({ mode: "anonymous", displayName: "Test", avatarUrl: "" }), /avatarCircle[\s\S]*avatarCamera/, "setup should use a circular avatar editor with camera action");
assert.match(renderPermissionEducationHtml({ step: "notifications" }), /Stay in the loop[\s\S]*Enable Notifications[\s\S]*Not Now/, "notification education should explain value before offering the prompt");
assert.match(renderPermissionEducationHtml({ step: "location" }), /Make nearby reads better[\s\S]*Enable Location[\s\S]*Not Now/, "location education should remain optional");
assert.match(renderPhotoSourceSheet({ target: "setup", hasPhoto: true }), /Take Photo[\s\S]*Choose from Library[\s\S]*Remove Current Photo[\s\S]*Cancel/, "photo sheet should expose native-style source and removal actions");
assert.doesNotMatch(renderPhotoSourceSheet({ target: "setup", hasPhoto: false }), /Remove Current Photo/, "photo sheet should hide removal when no photo exists");
assert.match(renderPhotoCropSheet(), /photoCropCanvas[\s\S]*Cancel[\s\S]*Save Photo/, "photo selection should require a crop-position confirmation");
assert.match(renderAvatarEditor("setup", ""), /avatarCircle[\s\S]*Add profile photo/, "empty avatar should use a circular person placeholder, not an initial");
assert.equal(PROFILE_IMAGE_MAX_DIMENSION, 768, "profile photos should be resized before upload");
assert.ok(PROFILE_IMAGE_MAX_DATA_URL_LENGTH < 250000, "profile photo output should remain below backend preference limits");
assert.match(reportsFeed, /\.gte\("created_at",\s*currentTucsonNightStart/, "reports feed should filter records at the current-night boundary");
assert.match(eventMigration, /event_updated_at[\s\S]*interval '5 hours'/, "active event view should enforce a 5 AM Tucson nightlife boundary");
assert.doesNotMatch(main, /catch\(function\(\)\{startLiveLocationWatch\(true\)\}\)|catch\(function\(\)\{return capturePresence/, "background permission-query failures must not trigger location prompts");
assert.doesNotMatch(main.match(/function liveLocationAllowed\(\)[\s\S]*?\}/)?.[0] || "", /accountPrefs\.location_pref/, "saved preference must not authorize live location watching");
assert.match(permissionControllerSource, /requestPermission\(\)/, "notification prompt should live behind the explicit permission controller request");
assert.match(permissionControllerSource, /readLocationStatus[\s\S]*permissions\.query/, "location status should use the browser Permissions API where available");
assert.doesNotMatch(shellRenderer + profileRenderer + dealsPageRenderer, /coming soon|\bdemo\b/i, "public student copy should not expose unfinished or demo language");
assert.match(shellRenderer, /Join Early Access[\s\S]*University of Arizona/, "account/setup flow should expose functional Arizona Early Access and manual campus selection");
assert.doesNotMatch(shellRenderer + profileRenderer, /Sign in with Apple|Apple sign-in/i, "nonfunctional Apple Sign-In must not appear");
assert.match(profileRenderer, /openDeleteAccountConfirmation[\s\S]*Delete My Account/, "profile must expose in-app account deletion");
assert.match(profileRenderer, /Privacy Policy[\s\S]*Terms of Use[\s\S]*Help \/ Support[\s\S]*menu\("Account"/, "profile must expose review-critical account and legal surfaces");
assert.match(legalPages, /support@get-lineup\.app/, "public legal/support pages must expose an actionable support contact");
assert.doesNotMatch(reportSheetRenderer, /textarea|noteField|Optional note/i, "iOS v1 report sheet must remain structured-only");
assert.doesNotMatch(reportsFeed, /note:\s*cleanText/, "public reports feed must not expose free-form report notes");
assert.match(locationIngest, /note:\s*null/, "report ingestion must not store new public free-form notes");
assert.match(main, /BARS=\[\][\s\S]*Live venue data is unavailable/, "failed initial backend load must render an honest unavailable state");
assert.doesNotMatch(main, /BARS=FALLBACK_BARS\.map|Using local LineUp data/, "prototype venue seeds must not become live truth when Supabase is unavailable");
assert.match(earlyAccessFunction, /verifyDeviceToken\(body\)/, "Early Access writes must require signed device proof");
assert.match(earlyAccessFunction, /auth\.getUser\(token\)/, "Early Access writes must validate the authenticated user");
assert.match(earlyAccessFunction, /launch_deal_requests[\s\S]*>= 20/, "launch-deal requests must be rate limited");
assert.match(earlyAccessMigration, /revoke all on public\.launch_deal_requests from public, anon, authenticated/, "launch-deal request table must deny direct browser access");
assert.match(earlyAccessMigration, /launch_deal_interest[\s\S]*count\(\*\)[\s\S]*private\.can_manage_venue/, "venue access to launch interest must be aggregate and role-gated");
assert.match(accountSync, /action === "delete_account"[\s\S]*body\.confirm !== "DELETE"[\s\S]*deleteAccountData[\s\S]*auth\.admin\.deleteUser\(user\.id\)/, "account deletion must be confirmed, self-bound, cleaned, and server-side");
assert.doesNotMatch(shellRenderer + profileRenderer + dealsPageRenderer, /Stripe|Upgrade (?:plan|now)|Subscribe(?: now)?|Buy now|Checkout|external payment/i, "student UI must not expose iOS purchase CTAs");
assert.doesNotMatch(shellRenderer + profileRenderer + dealsPageRenderer + dealsRenderer, /\$3 wells|\bshots?\b|drink-until-close/i, "public UI and venue examples must avoid risky alcohol promotion copy");
assert.match(styles, /\.field,select\.field,input\.field,textarea\.field\{[^}]*font-size:16px/, "mobile form controls should prevent iOS input zoom");
assert.match(styles, /\.barcardSkeleton|\.dealCardSkeleton/, "Live and Deals should have structural skeleton states");

const dealServiceSource = fs.readFileSync(path.join(root, "src/services/venueDealService.js"), "utf8");
const dealRendererSource = fs.readFileSync(path.join(root, "src/ui/renderDeals.js"), "utf8");
assert.doesNotMatch(dealServiceSource, /live_status|crowd_level|wait_minutes|confidence_score/, "deal service must not mutate live status truth");
assert.doesNotMatch(dealRendererSource, /localStorage|live_status|crowd_level|wait_minutes/, "deal renderer must not touch local/status truth");
assert.match(dealRendererSource, /Promoted/, "promoted placement should be labeled");

let calls = [];
const barController = createBarDetailController({
  findVenue: () => null,
  setCurrentVenue: () => calls.push("set"),
  trackAppEvent: () => calls.push("track"),
  activePage: () => "livePage",
  loadVenueReports: () => Promise.resolve(),
  renderDetail: () => calls.push("render"),
  openDetailSheet: () => calls.push("open"),
  closeDetailSheet: () => calls.push("close"),
  setDetailTab: () => calls.push("tab"),
  animateNavigate: () => calls.push("nav"),
  showToast: () => calls.push("toast"),
});
barController.open("missing");
assert.deepEqual(calls, ["toast"], "missing detail venue should not open or mutate detail state");

calls = [];
const detailVenue = { id: "venue_1", area: "main_gate" };
const detailController = createBarDetailController({
  findVenue: () => detailVenue,
  saveRecentVenue: (id) => calls.push(`recent:${id}`),
  setCurrentVenue: () => calls.push("set"),
  trackAppEvent: () => calls.push("track"),
  activePage: () => "livePage",
  loadVenueReports: () => Promise.resolve(),
  renderDetail: () => calls.push("render"),
  openDetailSheet: () => calls.push("open"),
  focusDealSection: () => calls.push("focusDeal"),
  showToast: () => calls.push("toast"),
});
detailController.open("venue_1");
assert.deepEqual(calls, ["set", "recent:venue_1", "track", "render", "open"], "detail open should save only the recent venue ID after venue validation");
calls = [];
detailController.open("venue_1", { focusDeal: true });
assert.deepEqual(calls, ["set", "recent:venue_1", "track", "render", "open", "focusDeal"], "deal navigation should open normal detail on Deals and then focus its deal section");

const backendVenues = [{ id: "fresh", name: "Fresh backend venue", lvl: "busy" }, { id: "other", name: "Other venue", lvl: "slow" }];
const hydrated = hydrateVenues([{ venueId: "missing", viewedAt: 1 }, { venueId: "other", viewedAt: 2 }], backendVenues);
assert.deepEqual(hydrated, [backendVenues[1]], "recents should hydrate from current backend venues and ignore stale IDs");
const dashboardHtml = renderRetentionDashboard({
  list: backendVenues,
  favorites: [backendVenues[0]],
  recents: hydrated,
  renderBar: (bar) => `<article class="barcard" data-id="${bar.id}">${bar.name}</article>`,
});
assert.match(dashboardHtml, /Your spots/, "dashboard should render favorites section");
assert.match(dashboardHtml, /Recently checked/, "dashboard should render recents section");
assert.match(dashboardHtml, /All nearby spots/, "dashboard should render all nearby section");

let earlyRequest = null;
const earlyController = createEarlyAccessController({
  isSignedIn: () => true,
  request: (action, extra) => {
    earlyRequest = { action, extra };
    return Promise.resolve({ early_access: { joined: true, campus_slug: "university_of_arizona", requested_venue_ids: extra?.venue_id ? [extra.venue_id] : [] } });
  },
});
await earlyController.requestDeal("fresh");
assert.deepEqual(earlyRequest, { action: "request_deal", extra: { venue_id: "fresh" } }, "launch-deal interest must use the secured Early Access request boundary");
assert.equal(earlyController.hasRequested("fresh"), true, "backend-confirmed launch request state should update the detail action");

const activeDeals = [
  { id: "promoted", venueId: "fresh", title: "No cover before 10", description: "Tonight only", dealType: "cover", startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), isActive: true, isPromoted: true, promotionTier: "boost" },
  { id: "standard", venueId: "other", title: "$3 wells", description: "", dealType: "deal", startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), isActive: true, isPromoted: false, promotionTier: "standard" },
  { id: "missing", venueId: "missing", title: "Ghost", description: "", dealType: "deal", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), isActive: true, isPromoted: true, promotionTier: "boost" },
  { id: "expired", venueId: "fresh", title: "Expired", description: "", dealType: "deal", startsAt: new Date(Date.now() - 7200000).toISOString(), endsAt: new Date(Date.now() - 3600000).toISOString(), isActive: true, isPromoted: true, promotionTier: "boost" },
  { id: "future", venueId: "fresh", title: "Future", description: "", dealType: "deal", startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 7200000).toISOString(), isActive: true, isPromoted: true, promotionTier: "boost" },
  { id: "inactive", venueId: "fresh", title: "Inactive", description: "", dealType: "deal", startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), isActive: false, isPromoted: true, promotionTier: "boost" },
];
assert.equal(isDealCurrent(activeDeals[0]), true, "active current deals should be displayable");
assert.equal(isDealCurrent(activeDeals[3]), false, "expired deals should not be displayable");
assert.equal(isDealCurrent(activeDeals[4]), false, "future deals should not be displayable");
assert.equal(isDealCurrent(activeDeals[5]), false, "inactive deals should not be displayable");
const groupedDeals = groupDealsByVenue(activeDeals);
assert.equal(groupedDeals.fresh[0].id, "promoted", "deals should group by venue without touching venue objects");
const selectedDeals = selectDashboardDeals({ deals: activeDeals, venues: backendVenues, favorites: [backendVenues[1]], recents: [] });
assert.deepEqual(selectedDeals.map((deal) => deal.id), ["promoted", "standard"], "dashboard deals should hydrate against backend venues and exclude missing venues");
assert.equal(selectedDeals.some((deal) => /expired|future|inactive/.test(deal.id)), false, "dashboard deals should exclude expired, future, and inactive rows");
const dealsPageRows = selectActiveDeals({ deals: activeDeals, venues: backendVenues });
assert.deepEqual(dealsPageRows.map((deal) => deal.id), ["promoted", "standard"], "Deals should show only current deals attached to current backend venues");
const dealsPageHtml = renderDealsPage({ deals: dealsPageRows, venuesById: { fresh: backendVenues[0], other: backendVenues[1] }, loading: false });
assert.match(dealsPageHtml, /Active deals right now/, "Deals page should explain its current-deal purpose");
assert.match(dealsPageHtml, /No cover before 10/, "Deals page should render active deal titles");
assert.match(dealsPageHtml, /Fresh backend venue/, "Deals page should hydrate venue names from backend venue data");
assert.match(dealsPageHtml, /Promoted/, "Deals page should label promoted placement");
assert.doesNotMatch(dealsPageHtml, /Fresh staff update|wait|confidence|Packed|Trending|Hot|Popular/i, "deal-first cards should not reuse live-status or fake popularity content");
assert.match(renderDealsPage({ deals: [], venuesById: {}, loading: false }), /No active deals right now[\s\S]*Check back closer to tonight/, "Deals page should have the required honest empty state");
assert.match(renderDealsPage({ deals: [], venuesById: {}, loading: true }), /dealCardSkeleton/, "Deals page should use structural skeletons while first loading");
assert.equal(dealEndingCue({ endsAt: new Date(Date.now() + 25 * 60000).toISOString() }), "Ending soon", "deals ending within 30 minutes should use the stronger ending cue");
assert.equal(dealEndingCue({ endsAt: new Date(Date.now() + 50 * 60000).toISOString() }), "Ends soon", "deals ending within 60 minutes should use the lighter ending cue");
assert.equal(dealEndingCue({ endsAt: new Date(Date.now() + 90 * 60000).toISOString() }), "", "deals outside the urgency window should not use urgency copy");
const originalVenue = structuredClone(backendVenues[0]);
assert.match(renderDealBadge(activeDeals[1]), /\$3 wells/, "venue cards should show small active deal badges");
assert.match(renderVenueDealBlock([activeDeals[0]]), /Venue posted/, "detail deal block should label venue-posted marketing");
assert.match(renderVenueDealBlock([activeDeals[0]]), /id="activeDealSection"/, "detail deal block should expose a stable focus target");
assert.deepEqual(backendVenues[0], originalVenue, "deal rendering must not mutate backend venue live status");
let openedDeal = null;
const tapController = createDealController({
  supabaseClient: () => ({}),
  activeDeals: () => activeDeals,
  dealsByVenue: () => groupedDeals,
  dealPerformanceByVenue: () => ({}),
  analytics: { trackDealTap() { throw new Error("analytics offline"); } },
  analyticsPayload: () => ({}),
  openDetail(venueId, meta) { openedDeal = { venueId, meta }; },
  showToast() {},
  logError() {},
});
tapController.handleDealTap(activeDeals[0], "deals_tab");
assert.deepEqual(openedDeal, { venueId: "fresh", meta: { source: "deals_tab", dealId: "promoted", focusDeal: true, initialTab: "deals" } }, "analytics failure must not block Deals navigation or activate the wrong detail tab");
const normalizedDealPayload = venueDealTestHooks.normalizePayload({
  venueId: "fresh",
  title: "A".repeat(120),
  description: "B".repeat(320),
  dealType: "bad_type",
  promotionTier: "bad_tier",
  isPromoted: false,
  startsAt: activeDeals[0].startsAt,
  endsAt: activeDeals[0].endsAt,
});
assert.equal(normalizedDealPayload.title.length, 80, "deal payload titles should be capped before backend write");
assert.equal(normalizedDealPayload.description.length, 240, "deal payload descriptions should be capped before backend write");
assert.equal(normalizedDealPayload.deal_type, "deal", "invalid deal types should normalize");
assert.equal(normalizedDealPayload.promotion_tier, "standard", "non-promoted deals should stay standard tier");
const sanitizedMetadata = venueAnalyticsTestHooks.sanitizeMetadata({
  surface: "dashboard",
  lat: 32.1,
  lng: -110.9,
  locationLabel: "hidden",
  longText: "x".repeat(300),
  count: 2,
});
assert.deepEqual(Object.keys(sanitizedMetadata).sort(), ["count", "longText", "surface"], "analytics metadata should drop location-like keys");
assert.equal(sanitizedMetadata.longText.length, 120, "analytics metadata strings should be capped");
const normalizedPerformance = venueAnalyticsTestHooks.normalizePerformance({
  venue_id: "fresh",
  deal_id: "11111111-1111-4111-8111-111111111111",
  deal_title: "No cover before 10",
  deal_type: "cover",
  is_active: true,
  is_promoted: true,
  promotion_tier: "boost",
  starts_at: activeDeals[0].startsAt,
  ends_at: activeDeals[0].endsAt,
  impressions_today: 124,
  taps_today: 18,
  detail_opens_today: 11,
  report_opens_today: 3,
  report_submits_today: 2,
  favorite_adds_today: 4,
  impressions_7d: 482,
  taps_7d: 61,
  detail_opens_7d: 42,
  tap_rate_7d: 12.7,
});
assert.equal(normalizedPerformance.impressionsToday, 124, "deal performance should normalize aggregate counts");
assert.equal(normalizedPerformance.tapRate7d, 12.7, "deal performance should normalize aggregate tap rate");
assert.doesNotMatch(JSON.stringify(normalizedPerformance), /user_id|device_id|lat|lng|location/i, "deal performance must not expose users, devices, or locations");
const performanceHtml = renderDealPerformance({ rows: [normalizedPerformance], loading: false, error: "" });
assert.match(performanceHtml, /Deal performance/i, "staff and owner surfaces should render deal performance");
assert.match(performanceHtml, /Views/, "deal performance should use bar-owner language");
assert.match(performanceHtml, /Tap rate/, "deal performance should show 7-day tap rate");
assert.match(renderDealPerformance({ rows: [], loading: false, error: "" }), /Post tonight&#39;s deal to start tracking student interest/, "empty performance state should be venue-friendly");
assert.match(renderDealPerformance({ rows: [], loading: false, error: "Performance data is unavailable right now." }), /Performance data is unavailable right now/, "performance errors should render without crashing");
const emptyDealEditorHtml = renderDealEditor({
  bar: { id: "fresh", name: "Fresh backend venue" },
  deal: null,
  subscription: { plan: "pro", status: "active" },
  prefix: "staff",
  isOwner: false,
});
assert.match(emptyDealEditorHtml, /Post tonight's deal to start tracking student interest/, "deal editor should guide venues with no active deal");
assert.match(emptyDealEditorHtml, /No cover before 10/, "deal editor should include practical title examples");
assert.match(emptyDealEditorHtml, /Food special/, "deal editor should include review-safe launch example copy");
assert.match(emptyDealEditorHtml, /DJ starts at 10:30/, "deal editor should include event example copy");
assert.match(emptyDealEditorHtml, /Keep it short/, "deal editor should tell venues to keep descriptions short");
assert.match(emptyDealEditorHtml, /Promoted deals can increase visibility/, "deal editor should include paid-placement trust note");
const staffVenueHtml = renderVenueControlsForBar({
  ids: ["fresh"],
  bar: { id: "fresh", name: "Fresh backend venue", address: "1 University", lvl: "busy", wait: 12, event: "" },
  levels: { busy: { label: "Busy" }, slow: { label: "Slow" } },
  logo: () => "",
  level: () => ({ label: "Busy" }),
  venueControl: "",
  dealEditor: emptyDealEditorHtml + renderDealPerformance({ rows: [], loading: false, error: "" }),
});
assert.match(staffVenueHtml, /Update what students see tonight/, "staff dashboard should use bar-facing headline copy");
assert.match(staffVenueHtml, /post tonight's deal or event/i, "staff dashboard should explain deal posting value");
assert.match(staffVenueHtml, /Publish live status/i, "staff dashboard should use live-status language");
assert.match(staffVenueHtml, /Preview Student Page/, "staff dashboard should expose a student-facing preview shortcut");
const ownerVenueHtml = renderOwnerDashboardHtml({
  data: { summary: {}, active_sessions: [], venue_activity: [], recent_redemptions: [], audit_logs: [] },
  controlVenues: [{ id: "fresh", name: "Fresh backend venue", status: "active" }],
  firstVenueId: "fresh",
  levels: { busy: { label: "Busy" }, slow: { label: "Slow" } },
  dealEditor: emptyDealEditorHtml + performanceHtml,
});
assert.match(ownerVenueHtml, /LineUp Venue Tools/, "owner dashboard should be demo-ready for bars");
assert.match(ownerVenueHtml, /track views, taps, and venue opens/i, "owner dashboard should explain deal performance value");
assert.match(ownerVenueHtml, /Live crowd status stays separate from paid promotions/, "owner dashboard should explain promotion separation");
assert.match(ownerVenueHtml, /Preview Student Page/, "owner dashboard should expose a student-facing preview shortcut");
assert.doesNotMatch(emptyDealEditorHtml + performanceHtml + dealsPageHtml, /\bTrending\b|\bHot\b|\bPacked\b/, "deal and performance copy must not invent popularity from analytics");

const detailBase = {
  bar: { id: "fresh", name: "Fresh backend venue", tag: "Pub", address: "1 University", lvl: "busy", wait: 12, event: "", lastCall: "1:30 AM", momentum: "steady", confSignals: 2, sources: [] },
  reports: [],
  detailTab: "live",
  level: () => ({ label: "Busy", range: "45-70% full", pct: 60 }),
  signalState: () => ({ key: "recent", label: "Recent live signals", detail: "Updated now", tone: "high", mode: "Crowd-sourced read" }),
  confColor: () => "#12E0C4",
  colors: { busy: "#FFB23F" },
  svg: { starFull: "★", starEmpty: "☆", lastcall: "" },
  logo: () => "",
  isFavorite: () => false,
  lineLeap: () => "#",
  detailMiniRow: () => "",
  detailPanel: () => "",
  dealBlock: "",
};
assert.doesNotMatch(renderDetailHtml(detailBase), /Manage Venue/, "normal student detail should not render venue management");
assert.match(renderDetailHtml({ ...detailBase, canManageVenue: true }), /Manage Venue/, "authorized venue preview should include management return action");
assert.match(renderDetailHtml(detailBase), /tabs2 tabs2/, "detail should center a balanced two-tab Live and Deals control without an event");
assert.doesNotMatch(renderDetailHtml(detailBase), />Events</, "detail should hide Events when there is no current event");
assert.match(renderDetailHtml({ ...detailBase, bar: { ...detailBase.bar, event: "Live music tonight" } }), /tabs2 tabs3[\s\S]*>Events</, "detail should add a balanced Events tab only for a current event");
assert.doesNotMatch(renderDetailHtml(detailBase), /detailDecision|Calm tonight|Busy tonight|Worth checking/, "detail should not repeat the hero in a decision summary strip");
const activityHtml = renderDetailPanel(detailBase.bar, [], {
  detailTab: "live",
  deals: [],
  signalState: detailBase.signalState,
  confidenceBreakdown: () => "",
  renderReportRows: () => "",
});
assert.equal((activityHtml.match(/class="activityMetric"/g) || []).length, 4, "Live Activity should use one consistent metric row for all four values");
assert.match(activityHtml, /Estimated line wait[\s\S]*Recent reports[\s\S]*Read quality[\s\S]*Freshness/, "Live Activity metric order should remain predictable");
const dealsDetailHtml = renderDetailPanel(detailBase.bar, [], { detailTab: "deals", deals: [activeDeals[0]], signalState: detailBase.signalState });
assert.match(dealsDetailHtml, /id="activeDealSection"[\s\S]*No cover before 10/, "Deals detail tab should immediately render the selected venue's active deals");

const phoenixAfterMidnight = new Date("2026-06-23T09:00:00.000Z"); // 2 AM Tucson
assert.equal(nightlifeWindowStart(phoenixAfterMidnight).toISOString(), "2026-06-22T12:00:00.000Z", "2 AM reports should remain in the prior night's 5 AM window");
const tonightReports = filterCurrentNightReports([
  { id: "old", created_at: "2026-06-22T11:59:59.000Z" },
  { id: "late", created_at: "2026-06-23T08:30:00.000Z" },
], phoenixAfterMidnight);
assert.deepEqual(tonightReports.map((report) => report.id), ["late"], "current-night report filtering should exclude prior-night history without deleting it");

let notificationRequests = 0;
const notificationApi = {
  permission: "default",
  requestPermission() { notificationRequests += 1; this.permission = "denied"; return Promise.resolve("denied"); },
};
let locationCaptures = 0;
const permissionController = createPermissionController({
  notificationRef: () => notificationApi,
  navigatorRef: () => ({ geolocation: {}, permissions: { query: () => Promise.resolve({ state: "prompt" }) } }),
  captureLocation: () => { locationCaptures += 1; return Promise.resolve(null); },
  hasConfirmedLocation: () => false,
});
assert.equal(permissionController.readNotificationStatus(), "default", "reading notification status must not trigger a prompt");
assert.equal(notificationRequests, 0, "notification education must not request permission before the enable action");
assert.equal(await permissionController.requestNotifications(), "denied", "notification result should reflect the browser result");
assert.equal(notificationRequests, 1, "notification prompt should run exactly once after explicit enable");
assert.equal(await permissionController.readLocationStatus(), "prompt", "location status should preserve browser prompt/not-decided state");
assert.equal(locationCaptures, 0, "reading location status must not call geolocation");
assert.equal(await permissionController.requestLocation(), "prompt", "failed geolocation should fall back to the real browser permission state");
assert.equal(locationCaptures, 1, "location should be requested only through the explicit enable action");
const unavailablePermissions = createPermissionController({ notificationRef: () => null, navigatorRef: () => ({}) });
assert.equal(unavailablePermissions.readNotificationStatus(), "unavailable", "unsupported notifications should be conservative");
assert.equal(await unavailablePermissions.readLocationStatus(), "unavailable", "unsupported location should be conservative");

calls = [];
const reportController = createReportController({
  currentVenue: () => null,
  trackAppEvent: () => calls.push("track"),
  setReportLevel: () => calls.push("level"),
  openSheet: () => calls.push("open"),
  renderReportSheet: () => calls.push("render"),
  capturePresence: () => calls.push("presence"),
  lineField: () => null,
  closeSheet: () => calls.push("close"),
  submitReport: () => calls.push("submit"),
  showToast: () => calls.push("toast"),
});
reportController.open();
await reportController.submit();
assert.deepEqual(calls, ["toast", "toast"], "report controller should guard missing venue");

calls = [];
const staffController = createVenueStaffController({
  setAdminVenue: () => calls.push("select"),
  renderAdminSheet: () => calls.push("render"),
  canAdminVenue: () => true,
  showToast: (msg) => calls.push(msg),
  syncVenueAdminToSupabase: () => Promise.resolve().then(() => calls.push("backend")),
  refreshCurrentVenue: () => calls.push("refreshCurrent"),
  renderDetailIfOpen: () => calls.push("detail"),
  applyFields: () => calls.push("apply"),
});
await staffController.patch("venue_1", { lvl: "busy" });
assert.deepEqual(calls, ["Publishing staff update...", "backend", "refreshCurrent", "render", "detail", "Venue source synced"], "staff update should wait for backend then refresh UI");

calls = [];
const ownerController = createOwnerController({
  isOwnerAccount: () => true,
  showToast: (msg) => calls.push(msg),
  logError: () => calls.push("log"),
  ownerRequest: () => Promise.resolve().then(() => calls.push("ownerRequest")),
  renderOwnerDashboard: () => calls.push("renderOwner"),
  clearOwnerData: () => calls.push("clear"),
  activePage: () => "statsPage",
  closeOwnerMap: () => calls.push("map"),
  setPage: () => calls.push("page"),
  publishVenue: () => Promise.resolve().then(() => calls.push("publish")),
  setVenueStatus: () => Promise.resolve().then(() => calls.push("status")),
  setRedemption: () => Promise.resolve().then(() => calls.push("redemption")),
  openVenue: () => Promise.resolve().then(() => calls.push("openVenue")),
});
await ownerController.refresh();
await ownerController.publishVenue();
await ownerController.setVenueStatus("active");
assert.deepEqual(calls, ["Refreshing owner data...", "ownerRequest", "renderOwner", "Owner data refreshed", "publish", "status"], "owner controller should use owner request/render and delegated backend flows");

assert.doesNotThrow(() => renderReportSheetHtml({ bar: null }));
assert.doesNotThrow(() => renderReportRows(null, { levels: {}, svg: { chevRight: "" } }));
assert.match(renderReportRows([{ empty: true }], { levels: {}, svg: { chevRight: "" } }), /No recent reports tonight/, "empty report placeholders must not look like current-night user reports");
assert.doesNotThrow(() => fallbackMapHtml({ bars: [{ id: "x", name: "X" }], userCoords: null, colors: {} }));
assert.doesNotThrow(() => renderOwnerDashboardHtml({ data: null, controlVenues: null, levels: null }));
assert.doesNotThrow(() => renderProfilePageHtml("home", null));
assert.doesNotThrow(() => renderVenueControlsForBar({ ids: null, bar: null }));
assert.doesNotThrow(() => renderDetailHtml({ bar: null }));

console.log("Reliability smoke checks passed");
