import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

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

if (!/localStorage\.removeItem\("lineup_bar_updates"\)/.test(main)) {
  failures.push("old lineup_bar_updates cache should be cleared during boot");
}

if (!/await loadSupabaseStatus\(\)/.test(main)) {
  failures.push("report submission should refresh backend-confirmed venue status");
}

if (!/syncVenueAdminToSupabase\(id,patch\)/.test(main)) {
  failures.push("staff updates should pass a backend payload instead of mutating local bars");
}

if (failures.length) {
  console.error(`Source-of-truth smoke failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Source-of-truth smoke checks passed");
