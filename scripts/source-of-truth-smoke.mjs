import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const cacheState = readFileSync(new URL("../src/state/cacheState.js", import.meta.url), "utf8");
const appState = readFileSync(new URL("../src/state/appState.js", import.meta.url), "utf8");
const navigationController = readFileSync(new URL("../src/controllers/navigationController.js", import.meta.url), "utf8");

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
