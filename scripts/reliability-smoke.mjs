import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createBarDetailController } from "../src/controllers/barDetailController.js";
import { createOwnerController } from "../src/controllers/ownerController.js";
import { createReportController } from "../src/controllers/reportController.js";
import { createVenueStaffController } from "../src/controllers/venueStaffController.js";
import { renderDetailHtml, renderReportRows } from "../src/ui/renderBarDetail.js";
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
assert.doesNotMatch(main, /lineup_bar_updates|lineup_local_reports/, "main must not read legacy local source-of-truth keys");
assert.match(main, /syncReportToSupabase\(bar,patch,note,false\)/, "normal reports must use backend ingest");
ordered(main, [/syncReportToSupabase\(bar,patch,note,false\)/, /loadVenueReports\(bar\.id\)/, /loadSupabaseStatus\(\)/], "report flow");
ordered(main, [/venueStatusIngest\(id,patch/, /loadSupabaseStatus\(\)/], "staff flow");
ordered(main, [/ownerAction\("venue_live_update"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner publish flow");
ordered(main, [/ownerAction\("set_venue_status"/, /loadSupabaseStatus\(\)/, /ownerRequest\(\)/], "owner status flow");
assert.doesNotMatch(main, /Local update saved|saved locally/, "staff/report UI should not claim local mutation");
assert.equal(sw, publicSw, "public service worker must match root service worker");
assert.equal(config.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1], "v62", "APP_VERSION should be v62");
assert.match(sw, /lineup-pwa-v62/, "service worker should be v62");

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
