import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createBarDetailController } from "../src/controllers/barDetailController.js";
import { createOwnerController } from "../src/controllers/ownerController.js";
import { createReportController } from "../src/controllers/reportController.js";
import { hydrateVenues } from "../src/controllers/retentionController.js";
import { groupDealsByVenue, isDealCurrent, selectDashboardDeals } from "../src/controllers/dealController.js";
import { createVenueStaffController } from "../src/controllers/venueStaffController.js";
import { venueAnalyticsTestHooks } from "../src/services/venueAnalyticsService.js";
import { venueDealTestHooks } from "../src/services/venueDealService.js";
import { renderDetailHtml, renderReportRows } from "../src/ui/renderBarDetail.js";
import { renderRetentionDashboard } from "../src/ui/renderDashboard.js";
import { renderDealBadge, renderDealSection, renderVenueDealBlock } from "../src/ui/renderDeals.js";
import { fallbackMapHtml } from "../src/ui/renderMap.js";
import { renderOwnerDashboardHtml } from "../src/ui/renderOwnerDashboard.js";
import { renderProfilePageHtml } from "../src/ui/renderProfile.js";
import { renderReportSheetHtml } from "../src/ui/renderReportSheet.js";
import { renderVenueControlsForBar } from "../src/ui/renderVenueControls.js";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
const cacheState = fs.readFileSync(path.join(root, "src/state/cacheState.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const publicSw = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
const config = fs.readFileSync(path.join(root, "src/config.js"), "utf8");

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
assert.match(cacheState, /lineup_recent_venues/, "recent venues should use a dedicated cache key");
assert.match(cacheState, /venueId/, "recent venue cache should store venue IDs");
assert.match(cacheState, /viewedAt/, "recent venue cache should store timestamps");
const recentCacheBlock = cacheState.match(/export function getRecentVenues[\s\S]*?export function getArea/)?.[0] || "";
assert.doesNotMatch(recentCacheBlock, /\b(status|crowd|crowd_level|wait|wait_minutes|report|reports|live_status|confidence)\b/, "recent venue cache must not store live status fields");
assert.doesNotMatch(main, /lineup_bar_updates|lineup_local_reports/, "main must not read legacy local source-of-truth keys");
assert.match(main, /syncReportToSupabase\(bar,patch,note,false\)/, "normal reports must use backend ingest");
ordered(main, [/syncReportToSupabase\(bar,patch,note,false\)/, /loadVenueReports\(bar\.id\)/, /loadSupabaseStatus\(\)/], "report flow");
ordered(main, [/venueStatusIngest\(id,patch/, /loadSupabaseStatus\(\)/], "staff flow");
ordered(main, [/ownerAction\("venue_live_update"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner publish flow");
ordered(main, [/ownerAction\("set_venue_status"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner status flow");
assert.doesNotMatch(main, /Local update saved|saved locally/, "staff/report UI should not claim local mutation");
assert.equal(sw, publicSw, "public service worker must match root service worker");
assert.equal(config.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1], "v66", "APP_VERSION should be v66");
assert.match(sw, /lineup-pwa-v66/, "service worker should be v66");

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
  showToast: () => calls.push("toast"),
});
detailController.open("venue_1");
assert.deepEqual(calls, ["set", "recent:venue_1", "track", "render", "open"], "detail open should save only the recent venue ID after venue validation");

const backendVenues = [{ id: "fresh", name: "Fresh backend venue", lvl: "busy" }, { id: "other", name: "Other venue", lvl: "slow" }];
const hydrated = hydrateVenues([{ venueId: "missing", viewedAt: 1 }, { venueId: "other", viewedAt: 2 }], backendVenues);
assert.deepEqual(hydrated, [backendVenues[1]], "recents should hydrate from current backend venues and ignore stale IDs");
const dashboardHtml = renderRetentionDashboard({
  list: backendVenues,
  favorites: [backendVenues[0]],
  recents: hydrated,
  pulse: { title: "Tonight", meta: "Live" },
  svg: { pulseTrend: "" },
  renderBar: (bar) => `<article class="barcard" data-id="${bar.id}">${bar.name}</article>`,
});
assert.match(dashboardHtml, /Your spots/, "dashboard should render favorites section");
assert.match(dashboardHtml, /Recently checked/, "dashboard should render recents section");
assert.match(dashboardHtml, /All nearby spots/, "dashboard should render all nearby section");

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
const originalVenue = structuredClone(backendVenues[0]);
const dealHtml = renderDealSection({ deals: selectedDeals, venuesById: { fresh: backendVenues[0], other: backendVenues[1] }, signalState: () => ({ label: "Fresh staff update", detail: "Updated now" }) });
assert.match(dealHtml, /Promoted/, "promoted deal card should be labeled");
assert.match(renderDealBadge(activeDeals[1]), /\$3 wells/, "venue cards should show small active deal badges");
assert.match(renderVenueDealBlock([activeDeals[0]]), /Venue posted/, "detail deal block should label venue-posted marketing");
assert.deepEqual(backendVenues[0], originalVenue, "deal rendering must not mutate backend venue live status");
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
assert.doesNotThrow(() => fallbackMapHtml({ bars: [{ id: "x", name: "X" }], userCoords: null, colors: {} }));
assert.doesNotThrow(() => renderOwnerDashboardHtml({ data: null, controlVenues: null, levels: null }));
assert.doesNotThrow(() => renderProfilePageHtml("home", null));
assert.doesNotThrow(() => renderVenueControlsForBar({ ids: null, bar: null }));
assert.doesNotThrow(() => renderDetailHtml({ bar: null }));

console.log("Reliability smoke checks passed");
