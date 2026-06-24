import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "src/main.js"), "utf8");
const configJs = fs.readFileSync(path.join(root, "src/config.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const renderShellJs = fs.readFileSync(path.join(root, "src/ui/renderShell.js"), "utf8");
const publicSwPath = path.join(root, "public/sw.js");
const publicSw = fs.existsSync(publicSwPath) ? fs.readFileSync(publicSwPath, "utf8") : null;
const publicManifest = JSON.parse(fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8"));
const offline = fs.readFileSync(path.join(root, "offline.html"), "utf8");
const publicOffline = fs.readFileSync(path.join(root, "public/offline.html"), "utf8");
if (fs.existsSync(path.join(root, "src/services/installPrompt.js"))) throw new Error("retired student install prompt service should be removed");

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
const appVersion = configJs.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1];
const swVersion = sw.match(/CACHE_NAME\s*=\s*"lineup-pwa-(v\d+)"/)?.[1];
if (!appVersion || !swVersion || appVersion !== swVersion) throw new Error(`APP_VERSION (${appVersion}) must match service worker (${swVersion})`);
if (appVersion !== "v75") throw new Error(`APP_VERSION should be v75, found ${appVersion}`);
if (!/offline\.html/.test(sw)) throw new Error("Service worker offline fallback missing");
if (publicSw !== null && publicSw !== sw) throw new Error("public/sw.js must match root sw.js because Vite deploys the public copy");
if (!/url\.pathname\.endsWith\("\.js"\)/.test(sw) || !/url\.pathname\.endsWith\("\.css"\)/.test(sw)) throw new Error("Service worker should network-refresh JS/CSS chunks after deploy");

if (!/href="\/icons\/favicon-32\.png\?v=75"/.test(html)) throw new Error("favicon link should use the v75 LineUp icon asset");
if (!/href="\/icons\/apple-touch-icon\.png\?v=75"/.test(html)) throw new Error("apple-touch-icon link should use the v75 LineUp icon asset");
if (!/data-theme="light"/.test(html) || /data-theme="dark"/.test(html)) throw new Error("app shell should default to light mode");
if (!/<meta name="theme-color" content="#F5F7FB">/.test(html) || !/<meta name="color-scheme" content="light">/.test(html)) throw new Error("app shell metadata should use the light theme");
if (manifest.theme_color !== "#F5F7FB" || manifest.background_color !== "#F5F7FB") throw new Error("root manifest should use the light app shell colors");
if (publicManifest.theme_color !== "#F5F7FB" || publicManifest.background_color !== "#F5F7FB") throw new Error("public manifest should use the light app shell colors");
if (JSON.stringify(manifest) !== JSON.stringify(publicManifest)) throw new Error("root and public manifests should match");
if (offline !== publicOffline) throw new Error("root and public offline pages should match");
if (!/theme-color" content="#F5F7FB"/.test(offline) || !/color-scheme" content="light"/.test(offline) || !/background:#F5F7FB/.test(offline)) throw new Error("offline page should use the light app shell");
if (/Pulse Planner|shortcut-pulse/.test(JSON.stringify(manifest))) throw new Error("manifest shortcuts should expose Deals, not Pulse");
if (!/Active Deals/.test(JSON.stringify(manifest))) throw new Error("manifest should expose the Deals shortcut");
for (const page of ["privacy", "terms", "support"]) {
  const legalPath = path.join(root, "public/legal", `${page}.html`);
  if (!fs.existsSync(legalPath)) throw new Error(`${page} page should be publicly deployable`);
  const legalHtml = fs.readFileSync(legalPath, "utf8");
  if (!/theme-color" content="#F5F7FB"/.test(legalHtml)) throw new Error(`${page} page should use the light app theme`);
  if (!new RegExp(`legal/${page}\\.html`).test(sw)) throw new Error(`${page} page should be part of the offline app shell`);
}
if (/mapbox:\/\/styles\/mapbox\/dark-v11/.test(mainJs)) throw new Error("Mapbox must not use the dark style in light mode");
if (!/mapbox:\/\/styles\/mapbox\/streets-v12/.test(mainJs) || !/mapbox:\/\/styles\/mapbox\/light-v11/.test(mainJs)) throw new Error("public and owner maps should use light Mapbox styles");
if (!/src="\/icons\/icon-192\.png"/.test(html + renderShellJs)) throw new Error("sign-in/install app icon should use the canonical LineUp icon-192 asset");
if (!/"icons\/icon-192\.png"/.test(JSON.stringify(manifest)) || !/"icons\/icon-192\.png"/.test(JSON.stringify(publicManifest))) {
  throw new Error("root and public manifests should use the canonical LineUp icon-192 asset");
}
const servedBrandSources = [html, renderShellJs, JSON.stringify(manifest), JSON.stringify(publicManifest), sw, publicSw || ""].join("\n");
const legacyBrandPatterns = [
  /LineUp_App_Icon_Mockup/i,
  /Adobe Express/i,
  /Unknown-removebg/i,
  /Unknown\.png/i,
  /file-2\.png/i,
  /file\.png/i,
  /old-logo/i,
  /legacy-logo/i,
];
const legacyHit = legacyBrandPatterns.find((pattern) => pattern.test(servedBrandSources));
if (legacyHit) throw new Error(`Served app shell references a legacy brand asset: ${legacyHit}`);

console.log("PWA smoke checks passed");
console.log(`Manifest: ${manifest.name} · ${manifest.display} · ${manifest.icons.length} icons`);
