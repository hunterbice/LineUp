import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const requiredManifest = ["name", "short_name", "start_url", "scope", "display", "icons"];
const missingManifest = requiredManifest.filter((key) => !manifest[key]);
if (missingManifest.length) throw new Error(`Manifest missing: ${missingManifest.join(", ")}`);

const iconErrors = [];
for (const icon of manifest.icons || []) {
  if (!icon.src || !icon.sizes || !icon.type) iconErrors.push(`Incomplete icon entry: ${JSON.stringify(icon)}`);
  if (icon.src && !fs.existsSync(path.join(root, icon.src))) iconErrors.push(`Missing icon file: ${icon.src}`);
}
if (iconErrors.length) throw new Error(iconErrors.join("\n"));

const htmlChecks = [
  ["manifest link", /<link rel="manifest" href="\/?manifest\.webmanifest">/],
  ["apple mobile web app", /apple-mobile-web-app-capable/],
  ["apple touch icon", /rel="apple-touch-icon"/],
  ["module app script", /<script type="module" src="\.\/src\/main\.js"><\/script>/],
  ["viewport fit cover", /viewport-fit=cover/],
  ["theme color", /theme-color/],
];
const missingHtml = htmlChecks.filter(([, pattern]) => !pattern.test(html)).map(([label]) => label);
if (missingHtml.length) throw new Error(`HTML missing: ${missingHtml.join(", ")}`);

if (!/serviceWorker\.register\("(?:\.\/|\/)sw\.js"\)/.test(mainJs)) throw new Error("App script missing service worker registration");
if (!/from "@supabase\/supabase-js"/.test(mainJs)) throw new Error("Supabase should be package-managed");
if (!/(from "mapbox-gl"|import\("mapbox-gl"\))/.test(mainJs)) throw new Error("Mapbox should be package-managed");
if (/cdn\.jsdelivr/.test(html) || /api\.mapbox\.com\/mapbox-gl-js/.test(mainJs)) throw new Error("Unexpected CDN runtime dependency");
if (!/CACHE_NAME\s*=\s*"lineup-pwa-v\d+"/.test(sw)) throw new Error("Service worker cache version missing");
if (!/offline\.html/.test(sw)) throw new Error("Service worker offline fallback missing");

console.log("PWA smoke checks passed");
console.log(`Manifest: ${manifest.name} · ${manifest.display} · ${manifest.icons.length} icons`);
