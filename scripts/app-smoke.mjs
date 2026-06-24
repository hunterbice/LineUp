import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const port = process.env.LINEUP_SMOKE_PORT || "4190";
const baseUrl = `http://127.0.0.1:${port}/index.html`;

const server = spawn("npm", ["run", "dev", "--", "--port", port], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, BROWSER: "none" },
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(async () => {
      if (/Local:\s+http:\/\/127\.0\.0\.1/.test(output)) {
        clearInterval(timer);
        resolve();
        return;
      }
      try {
        const response = await fetch(baseUrl, { cache: "no-store" });
        if (response.ok) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        if (Date.now() - started > 20000) {
          clearInterval(timer);
          reject(new Error(`Vite server did not start.\n${output}`));
        }
      }
    }, 250);
  });
}

async function probePullGesture(page, surfaceSelector) {
  const state = await page.evaluate((selector) => {
    window.scrollTo(0, 0);
    const detail = document.querySelector("#detail");
    if (detail?.classList.contains("open")) detail.scrollTop = 0;
    const touch = (type, y, touches = true) => {
      const point = new Touch({ identifier: 1, target: document.body, clientX: 190, clientY: y, pageX: 190, pageY: y, screenX: 190, screenY: y });
      return window.dispatchEvent(new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: touches ? [point] : [],
        targetTouches: touches ? [point] : [],
        changedTouches: [point],
      }));
    };
    touch("touchstart", 20);
    touch("touchmove", 100);
    const surface = document.querySelector(selector);
    const indicator = document.querySelector(".ptr");
    const during = {
      offset: surface?.style.getPropertyValue("--pull-distance") || "",
      label: indicator?.textContent?.trim(),
      visible: indicator?.classList.contains("visible"),
    };
    touch("touchend", 100, false);
    return during;
  }, surfaceSelector);
  if (!state.visible || !parseFloat(state.offset) || !/Pull to refresh/.test(state.label || "")) {
    throw new Error(`Pull-to-refresh should move ${surfaceSelector} and reveal its indicator: ${JSON.stringify(state)}`);
  }
  await page.waitForFunction((selector) => !document.body.dataset.pullGesture && parseFloat(document.querySelector(selector)?.style.getPropertyValue("--pull-distance") || "0") === 0, surfaceSelector);
}

async function probeRefreshGesture(page, surfaceSelector) {
  const state = await page.evaluate((selector) => {
    window.scrollTo(0, 0);
    const detail = document.querySelector("#detail");
    if (detail?.classList.contains("open")) detail.scrollTop = 0;
    const touch = (type, y, touches = true) => {
      const point = new Touch({ identifier: 2, target: document.body, clientX: 190, clientY: y, pageX: 190, pageY: y, screenX: 190, screenY: y });
      window.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: touches ? [point] : [], targetTouches: touches ? [point] : [], changedTouches: [point] }));
    };
    touch("touchstart", 20);
    touch("touchmove", 180);
    const indicator = document.querySelector(".ptr");
    const releaseLabel = indicator?.textContent?.trim() || "";
    touch("touchend", 180, false);
    return {
      releaseLabel,
      refreshing: document.body.dataset.pullRefreshing === "true",
      heldOffset: document.querySelector(selector)?.style.getPropertyValue("--pull-distance") || "",
    };
  }, surfaceSelector);
  if (!/Release to refresh/.test(state.releaseLabel) || !state.refreshing || parseFloat(state.heldOffset) < 50) {
    throw new Error(`Threshold pull should start and hold backend refresh on ${surfaceSelector}: ${JSON.stringify(state)}`);
  }
  await page.waitForFunction((selector) => !document.body.dataset.pullRefreshing && parseFloat(document.querySelector(selector)?.style.getPropertyValue("--pull-distance") || "0") === 0, surfaceSelector);
}

async function main() {
  let browser;
  await waitForServer();
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (/Failed to load resource: the server responded with a status of 401/.test(text)) return;
      errors.push(text);
    });
    const now = Date.now();
    const smokeDeals = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        venue_id: "bens",
        title: "No cover before 10",
        description: "Venue posted special for smoke testing",
        deal_type: "cover",
        starts_at: new Date(now - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_promoted: true,
        promotion_tier: "boost",
        created_by: null,
        created_at: new Date(now - 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        venue_id: "bens",
        title: "Expired smoke deal",
        description: "Should never render",
        deal_type: "deal",
        starts_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_promoted: true,
        promotion_tier: "boost",
        created_by: null,
        created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        venue_id: "bens",
        title: "Future smoke deal",
        description: "Should never render",
        deal_type: "deal",
        starts_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        ends_at: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_promoted: true,
        promotion_tier: "boost",
        created_by: null,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        venue_id: "bens",
        title: "Inactive smoke deal",
        description: "Should never render",
        deal_type: "deal",
        starts_at: new Date(now - 60 * 60 * 1000).toISOString(),
        ends_at: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
        is_active: false,
        is_promoted: true,
        promotion_tier: "boost",
        created_by: null,
        created_at: new Date(now - 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 60 * 60 * 1000).toISOString(),
      },
    ];
    const earlyAccessState = { joined: false, joined_at: null, campus_slug: "university_of_arizona", requested_venue_ids: [] };
    await page.addInitScript((deals) => {
      window.LINEUP_TEST_DEALS = deals;
      window.__permissionCalls = { notifications: 0, location: 0 };
      window.__geoPermissionState = "prompt";
      const notificationApi = {
        permission: "default",
        requestPermission() {
          window.__permissionCalls.notifications += 1;
          notificationApi.permission = "denied";
          return Promise.resolve("denied");
        },
      };
      Object.defineProperty(window, "Notification", { configurable: true, value: notificationApi });
      Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: () => Promise.resolve({ state: window.__geoPermissionState }) } });
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        getCurrentPosition(success) {
          window.__permissionCalls.location += 1;
          window.__geoPermissionState = "granted";
          success({ coords: { latitude: 32.2319, longitude: -110.9501, accuracy: 12 } });
        },
        watchPosition() { return 1; },
        clearWatch() {},
      } });
    }, smokeDeals);
    await page.route("**/*venue_deals*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(smokeDeals) });
        return;
      }
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(smokeDeals[0]) });
    });
    await page.route("**/*venue_analytics_events*", async (route) => {
      await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    });
    await page.route("**/functions/v1/venue-analytics-ingest", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accepted: true }) });
    });
    await page.route("**/functions/v1/location-ingest", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, nearest_venue_id: "bens", nearest_venue_name: "Gentle Ben’s", nearest_distance_m: 20, area: "main_gate" }) });
    });
    await page.route("**/functions/v1/early-access", async (route) => {
      const payload = route.request().postDataJSON() || {};
      if (payload.action === "join") {
        earlyAccessState.joined = true;
        earlyAccessState.joined_at = new Date().toISOString();
      }
      if (payload.action === "request_deal" && payload.venue_id && !earlyAccessState.requested_venue_ids.includes(payload.venue_id)) {
        earlyAccessState.joined = true;
        earlyAccessState.joined_at ||= new Date().toISOString();
        earlyAccessState.requested_venue_ids.push(payload.venue_id);
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, early_access: earlyAccessState }) });
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".accountGate");
    const stamp = `${Date.now()}${Math.round(Math.random() * 10000)}`;
    const smokeEmail = `smoke-${stamp}@get-lineup.app`;
    await page.locator("#authEmail").fill(smokeEmail);
    await page.locator("#authPassword").fill("lineup-smoke-1");
    await page.locator(".passwordToggle").click();
    if (await page.locator("#authPassword").getAttribute("type") !== "text") throw new Error("Password toggle should reveal the sign-in password");
    if (await page.locator(".passwordToggle").getAttribute("aria-label") !== "Hide password") throw new Error("Password toggle should expose its changed accessible label");
    await page.locator(".passwordToggle").click();
    await page.locator(".authToggle label", { hasText: "Create account" }).click();
    await page.waitForTimeout(200);
    if (await page.locator("#authEmail").inputValue() !== smokeEmail) throw new Error("Switching to registration should preserve typed email");
    if (await page.locator("#authPassword").getAttribute("autocomplete") !== "new-password") throw new Error("Create-account mode should use the new-password autofill contract");
    if (!await page.locator(".accountGate").count()) throw new Error("Registration typing should not bounce back to a different auth screen");
    await page.locator(".passwordToggle").click();
    if (await page.locator("#authPassword").getAttribute("type") !== "text") throw new Error("Password toggle should work in create-account mode");
    await page.locator(".passwordToggle").click();
    await page.locator("#authName").fill("Smoke Test");
    await page.locator(".accountGate button", { hasText: "Join Early Access" }).click();
    await page.waitForSelector(".setupGate");
    await page.locator("#setupCampus").waitFor();
    if (await page.locator(".setupGate", { hasText: "favorite bars" }).count()) throw new Error("Setup should not ask users to select favorite bars");
    if (await page.locator(".setupGate button", { hasText: "Notifications" }).count() || await page.locator(".setupGate button", { hasText: "Use Location" }).count()) throw new Error("Core setup should not contain direct permission buttons");
    await page.waitForSelector(".setupGate .avatarCircle:not(.hasPhoto)");
    await page.locator(".setupGate .avatarCamera").click();
    await page.waitForSelector("#reportSheet.open .photoActionSheet");
    await page.locator(".photoSheetAction", { hasText: "Take Photo" }).waitFor();
    await page.locator(".photoSheetAction", { hasText: "Choose from Library" }).waitFor();
    if (await page.locator(".photoSheetAction", { hasText: "Remove Current Photo" }).count()) throw new Error("Photo removal should be hidden before a photo exists");
    if (await page.locator("#photoCameraInput").getAttribute("capture") !== "environment") throw new Error("Take Photo should use the camera capture path where supported");
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1400;
      const context = canvas.getContext("2d");
      context.fillStyle = "#2563EB";
      context.fillRect(0, 0, canvas.width / 2, canvas.height);
      context.fillStyle = "#DC2626";
      context.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const input = document.querySelector("#photoLibraryInput");
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], "large-profile.png", { type: "image/png" }));
      Object.defineProperty(input, "files", { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForSelector("#photoCropCanvas");
    const cropBefore = await page.locator("#photoCropCanvas").evaluate((canvas) => canvas.toDataURL("image/jpeg", 0.84));
    await page.locator("#photoCropCanvas").press("ArrowRight");
    const cropAfter = await page.locator("#photoCropCanvas").evaluate((canvas) => canvas.toDataURL("image/jpeg", 0.84));
    if (cropBefore === cropAfter) throw new Error("Crop-position controls should change the saved composition");
    await page.locator("#saveCroppedPhoto").click();
    await page.waitForSelector(".setupGate .avatarCircle.hasPhoto img");
    const processedPhoto = await page.locator(".setupGate .avatarCircle img").getAttribute("src");
    if (!processedPhoto?.startsWith("data:image/jpeg") || processedPhoto.length >= 220000) throw new Error("Large profile photo should be resized and compressed before save");
    await page.locator("#setupName").fill("Smoke Test");
    await page.locator(".setupGate button", { hasText: "Join Arizona Early Access" }).click();
    await page.waitForSelector('.permissionGate[data-permission-step="notifications"]');
    if (await page.evaluate(() => window.__permissionCalls.notifications) !== 0) throw new Error("Notification prompt must not run before Enable Notifications");
    await page.locator(".permissionGate .permissionSkip", { hasText: "Not Now" }).click();
    await page.waitForSelector('.permissionGate[data-permission-step="location"]');
    if (await page.evaluate(() => window.__permissionCalls.location) !== 0) throw new Error("Location prompt must not run before Enable Location");
    await page.locator(".permissionGate .permissionSkip", { hasText: "Not Now" }).click();
    await page.waitForSelector("#livePage.active");
    await page.waitForFunction(() => window.scrollY <= 1);
    if (await page.locator("body", { hasText: "Add to Home Screen" }).count() || await page.locator("body", { hasText: "Install LineUp" }).count()) throw new Error("Student UI must not expose install promotion");
    await page.locator(".earlyAccessBanner", { hasText: "Build your fall lineup" }).waitFor();
    await page.waitForSelector(".barcard .statusline");
    const lightMode = await page.evaluate(() => {
      const colorTotal = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).reduce((sum, part) => sum + Number(part), 0);
      const body = getComputedStyle(document.body).backgroundColor;
      const card = getComputedStyle(document.querySelector(".barcard")).backgroundColor;
      const nav = getComputedStyle(document.querySelector(".bottomnav")).backgroundColor;
      return {
        body,
        card,
        nav,
        bodyLight: colorTotal(body) > 600,
        cardLight: colorTotal(card) > 600,
        navLight: colorTotal(nav) > 600,
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    if (!lightMode.bodyLight || !lightMode.cardLight || !lightMode.navLight) throw new Error(`Expected light runtime surfaces: ${JSON.stringify(lightMode)}`);
    if (!lightMode.noOverflow) throw new Error("Light mode should not introduce horizontal overflow at 390px");
    await probePullGesture(page, "#app");
    if (await page.locator("#livePage .dealCard").count()) throw new Error("Live should not reuse full deal cards");
    await page.locator(".dealBadge", { hasText: "No cover before 10" }).waitFor();
    if (await page.locator("text=Expired smoke deal").count()) throw new Error("Expired deals should not render");
    if (await page.locator("text=Future smoke deal").count()) throw new Error("Future deals should not render");
    if (await page.locator("text=Inactive smoke deal").count()) throw new Error("Inactive deals should not render");
    await page.locator(".emptyState", { hasText: "No favorite spots yet" }).waitFor();
    await page.evaluate(() => localStorage.setItem("lineup_recent_venues", JSON.stringify([{ venueId: "stale_missing_venue", viewedAt: Date.now() }])));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#livePage.active");
    await page.locator(".emptyState", { hasText: "No favorite spots yet" }).waitFor();
    await page.locator(".fav").first().click();
    await page.locator(".sectionlabel", { hasText: "Your spots" }).waitFor();
    await page.waitForSelector(".barcard .fav.on");
    await page.locator(".barcard").nth(1).click();
    await page.waitForSelector("#detail.open");
    await page.locator(".launchDealRequest", { hasText: "Request a launch deal" }).click();
    await page.locator(".launchDealRequest.requested", { hasText: "Launch deal requested" }).waitFor();
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");
    const recentCache = await page.evaluate(() => JSON.parse(localStorage.getItem("lineup_recent_venues") || "[]"));
    if (!recentCache[0] || !recentCache[0].venueId || !recentCache[0].viewedAt || Object.keys(recentCache[0]).some((key) => /status|crowd|wait|report|live/i.test(key))) {
      throw new Error("Recent venue cache should contain only venueId/viewedAt");
    }
    await page.locator(".sectionlabel", { hasText: "Recently checked" }).waitFor();
    await page.locator(".barcard").first().click();
    await page.waitForSelector("#detail.open");
    await page.waitForSelector(".tabs2 button.on", { hasText: "Live" });
    if (await page.locator("#detail .detailDecision").count() || await page.locator("#detail", { hasText: "Calm tonight" }).count()) throw new Error("Venue detail should not repeat the hero in a decision summary strip");
    await page.locator("#detail .heroStat").waitFor();
    await page.locator(".tabs2 button", { hasText: "Deals" }).click();
    await page.waitForSelector(".tabs2 button.on", { hasText: "Deals" });
    const detailTabCount = await page.locator(".tabs2 button").count();
    if (detailTabCount < 2 || detailTabCount > 3) throw new Error("Venue subnav should contain balanced Live/Deals and optional current Events");
    await page.locator(".cta", { hasText: "Report" }).click();
    await page.waitForSelector("#reportSheet.open");
    const busyReportButton = page.locator("#reportSheet .choicegrid").first().locator("button", { hasText: "BUSY" });
    await busyReportButton.click();
    await page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll("#reportSheet .choicegrid button")];
      return buttons.some((button) => button.textContent?.includes("BUSY") && button.classList.contains("on"));
    });
    await page.locator("#reportSheet button", { hasText: "Cancel" }).click();
    await page.waitForFunction(() => !document.querySelector("#reportSheet")?.classList.contains("open"));
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");

    await page.locator(".navbtn[data-page='mapPage']").click();
    await page.waitForSelector("#mapPage.active");
    await page.locator(".navbtn[data-page='highlightsPage']").click();
    await page.waitForSelector("#highlightsPage.active");
    await page.locator(".navbtn[data-page='highlightsPage']", { hasText: "Deals" }).waitFor();
    await page.locator("#highlightsPage", { hasText: "Active deals right now" }).waitFor();
    await probeRefreshGesture(page, "#app");
    await page.locator("#highlightsPage .dealCard", { hasText: "Promoted" }).waitFor();
    if (await page.locator("body", { hasText: "Pulse" }).count()) throw new Error("Pulse should not appear in user-facing UI");
    if (await page.locator("text=Expired smoke deal").count()) throw new Error("Expired deals should not render");
    if (await page.locator("text=Future smoke deal").count()) throw new Error("Future deals should not render");
    if (await page.locator("text=Inactive smoke deal").count()) throw new Error("Inactive deals should not render");
    await page.locator("#highlightsPage .dealCard").first().click();
    await page.waitForSelector("#detail.open");
    await page.waitForSelector(".tabs2 button.on", { hasText: "Deals" });
    await page.locator("#activeDealSection .dealDetailCard", { hasText: "No cover before 10" }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "activeDealSection");
    await probePullGesture(page, ".detailStage");
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");
    await page.locator(".navbtn[data-page='profilePage']").click();
    await page.waitForSelector("#profilePage.active");
    await page.locator(".profileMenuItem", { hasText: "Privacy Policy" }).waitFor();
    await page.locator(".profileMenuItem", { hasText: "Terms of Use" }).waitFor();
    await page.locator(".profileMenuItem", { hasText: "Help / Support" }).waitFor();
    await page.locator(".profileMenuItem", { hasText: "Preferences" }).click();
    await page.locator("button", { hasText: "Review Notification Access" }).click();
    await page.waitForSelector('.permissionGate[data-permission-step="notifications"]');
    await page.locator(".permissionGate .submit", { hasText: "Enable Notifications" }).click();
    await page.locator(".permissionResult", { hasText: "Not enabled" }).waitFor();
    if (await page.evaluate(() => window.__permissionCalls.notifications) !== 1) throw new Error("Explicit notification enable should call the real API exactly once");
    await page.locator(".permissionGate .submit", { hasText: "Continue" }).click();
    await page.waitForSelector('.permissionGate[data-permission-step="location"]');
    await page.locator(".permissionGate .submit", { hasText: "Enable Location" }).click();
    await page.locator(".permissionResult", { hasText: "Enabled" }).waitFor();
    if (await page.evaluate(() => window.__permissionCalls.location) !== 1) throw new Error("Explicit location enable should call geolocation exactly once");
    await page.locator(".permissionGate .submit", { hasText: "Enter LineUp" }).click();
    await page.waitForSelector("#livePage.active .barcard");
    await page.locator(".navbtn[data-page='profilePage']").click();
    await page.locator(".profileMenuItem", { hasText: "Preferences" }).click();
    await page.locator(".permission", { hasText: "Notifications" }).locator(".locationStatus", { hasText: "Denied" }).waitFor();
    await page.locator(".permission", { hasText: "Location" }).locator(".locationStatus", { hasText: "Enabled" }).waitFor();
    await page.locator(".backBtn", { hasText: "Profile" }).click();
    // Anonymous users no longer get a large "A" avatar (items 6/19), so .profileMark
    // only exists when a public photo is set. Guard the hidden-owner-access check.
    const profileMark = page.locator(".profileMark");
    if (await profileMark.count()) {
      await profileMark.click({ clickCount: 5 });
      if (await page.locator("#reportSheet.open").count()) throw new Error("Profile avatar should not open hidden owner access");
    }
    await page.locator(".profileMenuItem", { hasText: "Account" }).click();
    await page.locator(".dangerBtn", { hasText: "Delete My Account" }).click();
    await page.locator("#reportSheet.open", { hasText: "Delete your LineUp account?" }).waitFor();
    await page.locator("#reportSheet button", { hasText: "Cancel" }).click();
    await page.waitForFunction(() => !document.querySelector("#reportSheet")?.classList.contains("open"));
    const roleTabs = await page.locator("#roleNavButton").count();
    if (roleTabs !== 0) throw new Error("Normal account should not receive owner or venue controls");

    if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
    console.log("App smoke checks passed");
  } finally {
    await browser?.close().catch(() => {});
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill("SIGTERM");
  });
