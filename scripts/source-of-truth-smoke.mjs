import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const cacheState = readFileSync(new URL("../src/state/cacheState.js", import.meta.url), "utf8");
const appState = readFileSync(new URL("../src/state/appState.js", import.meta.url), "utf8");
const navigationController = readFileSync(new URL("../src/controllers/navigationController.js", import.meta.url), "utf8");
const dealService = readFileSync(new URL("../src/services/venueDealService.js", import.meta.url), "utf8");
const dealController = readFileSync(new URL("../src/controllers/dealController.js", import.meta.url), "utf8");
const dealRenderer = readFileSync(new URL("../src/ui/renderDeals.js", import.meta.url), "utf8");

const forbiddenPatterns = [
  [/\bvar\s+BAR_UPDATES\b/, "BAR_UPDATES must not exist as production state"],
  [/\bfunction\s+saveBarUpdate\b/, "saveBarUpdate must not mutate venue cards locally"],
  [/\bfunction\s+applyStoredUpdates\b/, "stored venue overrides must not merge into live cards"],
  [/localStorage\.setItem\("lineup_bar_updates"/, "lineup_bar_updates must not be written"],
  [/localStorage\.getItem\("lineup_bar_updates"/, "lineup_bar_updates must not be read as venue truth"],
  [/Local update saved/, "staff updates must not claim local-only venue writes"],
];

const failures = forbiddenPatterns
  .filter(([pattern]) => pattern.test(main))
  .map(([, message]) => message);

if (!/clearLegacyVenueOverrides\(\)/.test(main)) {
  failures.push("app boot should call cacheState.clearLegacyVenueOverrides()");
}

if (!/localStorage\.removeItem\("lineup_bar_updates"\)/.test(cacheState)) {
  failures.push("old lineup_bar_updates cache should be cleared by cacheState");
}

if (!/getRecentVenues/.test(cacheState) || !/saveRecentVenue/.test(cacheState)) {
  failures.push("recent venue cache helpers should live in cacheState.js");
}

if (!/lineup_recent_venues/.test(cacheState) || !/venueId/.test(cacheState) || !/viewedAt/.test(cacheState)) {
  failures.push("recent venue cache should store venueId/viewedAt references only");
}

const recentCacheBlock = cacheState.match(/export function getRecentVenues[\s\S]*?export function getArea/)?.[0] || "";
if (/\b(status|crowd|crowd_level|wait|wait_minutes|report|reports|live_status|confidence)\b/.test(recentCacheBlock)) {
  failures.push("recent venue cache must not store live venue truth fields");
}

if (!/await loadSupabaseStatus\(\)/.test(main)) {
  failures.push("report submission should refresh backend-confirmed venue status");
}

if (!/syncVenueAdminToSupabase\(id,patch\)/.test(main)) {
  failures.push("staff updates should pass a backend payload instead of mutating local bars");
}

if (!/backend:\s*\{[\s\S]*venues/.test(appState) || !/ui:\s*\{[\s\S]*activePage/.test(appState)) {
  failures.push("appState should separate backend data from UI selections");
}

if (!/export function selectPage/.test(navigationController) || !/export function selectArea/.test(navigationController)) {
  failures.push("navigation controller should own page and area selection helpers");
}

if (!/venue_deals/.test(dealService) || /live_status/.test(dealService) || /crowd_level|wait_minutes|confidence_score/.test(dealService)) {
  failures.push("venueDealService should read/write venue_deals only, not venue live status truth");
}

if (/localStorage\./.test(dealService + dealController + dealRenderer)) {
  failures.push("deal modules must not persist full deal/status truth to localStorage");
}

if (!/Promoted/.test(dealRenderer)) {
  failures.push("promoted deal rendering must clearly label paid placement");
}

if (/crowd_level|wait_minutes|live_status/.test(dealRenderer)) {
  failures.push("deal rendering must not read or mutate live status fields directly");
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : full;
  });
}

const directStorageFiles = walk(fileURLToPath(new URL("../src", import.meta.url)))
  .filter((file) => file.endsWith(".js") && !file.endsWith("src/state/cacheState.js"))
  .filter((file) => /localStorage\./.test(readFileSync(file, "utf8")));
if (directStorageFiles.length) {
  failures.push(`localStorage access must go through cacheState.js: ${directStorageFiles.join(", ")}`);
}

if (failures.length) {
  console.error(`Source-of-truth smoke failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Source-of-truth smoke checks passed");
