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
    await page.locator("#authEmail").fill(`smoke-${stamp}@get-lineup.app`);
    await page.locator("#authPassword").fill("lineup-smoke-1");
    await page.locator(".authToggle label", { hasText: "Create account" }).click();
    await page.locator("#authName").fill("Smoke Test");
    await page.locator(".accountGate button", { hasText: "Join Early Access" }).click();
    await page.waitForSelector(".setupGate");
    await page.locator("#setupCampus").waitFor();
    await page.locator("#setupName").fill("Smoke Test");
    await page.locator(".setupGate button", { hasText: "Join Arizona Early Access" }).click();
    await page.waitForSelector("#livePage.active");
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
    await page.locator(".tabs2 button", { hasText: "Deals" }).click();
    await page.waitForSelector(".tabs2 button.on", { hasText: "Deals" });
    // Events tab only renders when the venue has an event tonight (item 11).
    const detailEventsTab = page.locator(".tabs2 button", { hasText: "Events" });
    if (await detailEventsTab.count()) {
      await detailEventsTab.click();
      await page.waitForSelector(".tabs2 button.on", { hasText: "Events" });
    }
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
    await page.locator("#highlightsPage .dealCard", { hasText: "Promoted" }).waitFor();
    if (await page.locator("body", { hasText: "Pulse" }).count()) throw new Error("Pulse should not appear in user-facing UI");
    if (await page.locator("text=Expired smoke deal").count()) throw new Error("Expired deals should not render");
    if (await page.locator("text=Future smoke deal").count()) throw new Error("Future deals should not render");
    if (await page.locator("text=Inactive smoke deal").count()) throw new Error("Inactive deals should not render");
    await page.locator("#highlightsPage .dealCard").first().click();
    await page.waitForSelector("#detail.open");
    await page.locator("#activeDealSection .dealDetailCard", { hasText: "No cover before 10" }).waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "activeDealSection");
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");
    await page.locator(".navbtn[data-page='profilePage']").click();
    await page.waitForSelector("#profilePage.active");
    await page.locator(".profileMenuItem", { hasText: "Privacy Policy" }).waitFor();
    await page.locator(".profileMenuItem", { hasText: "Terms of Use" }).waitFor();
    await page.locator(".profileMenuItem", { hasText: "Help / Support" }).waitFor();
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
