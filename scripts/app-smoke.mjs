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
    ];
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

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".accountGate");
    const stamp = `${Date.now()}${Math.round(Math.random() * 10000)}`;
    await page.locator("#authEmail").fill(`smoke-${stamp}@get-lineup.app`);
    await page.locator("#authPassword").fill("lineup-smoke-1");
    await page.locator(".authToggle label", { hasText: "Create account" }).click();
    await page.locator("#authName").fill("Smoke Test");
    await page.locator(".accountGate button", { hasText: "Create Account" }).click();
    await page.waitForSelector(".setupGate");
    await page.locator("#setupName").fill("Smoke Test");
    await page.locator(".setupGate button", { hasText: "Finish Setup" }).click();
    await page.waitForSelector("#livePage.active");
    await page.waitForSelector(".barcard .statusline");
    await page.locator(".sectionlabel", { hasText: "TONIGHT’S DEALS" }).waitFor();
    await page.locator(".dealCard", { hasText: "Promoted" }).waitFor();
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
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");
    const recentCache = await page.evaluate(() => JSON.parse(localStorage.getItem("lineup_recent_venues") || "[]"));
    if (!recentCache[0] || !recentCache[0].venueId || !recentCache[0].viewedAt || Object.keys(recentCache[0]).some((key) => /status|crowd|wait|report|live/i.test(key))) {
      throw new Error("Recent venue cache should contain only venueId/viewedAt");
    }
    await page.locator(".sectionlabel", { hasText: "Recently checked" }).waitFor();
    await page.locator(".dealCard").first().click();
    await page.waitForSelector("#detail.open");
    await page.locator(".dealDetailCard", { hasText: "No cover before 10" }).waitFor();
    await page.locator("button[onclick='closeDetail()']").click();
    await page.waitForSelector("#detail:not(.open)");
    await page.locator(".barcard").first().click();
    await page.waitForSelector("#detail.open");
    await page.locator(".tabs2 button", { hasText: "Intel" }).click();
    await page.waitForSelector(".tabs2 button.on", { hasText: "Intel" });
    await page.locator(".tabs2 button", { hasText: "Events" }).click();
    await page.waitForSelector(".tabs2 button.on", { hasText: "Events" });
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
    await page.locator(".vibeBtn").nth(1).click();
    await page.waitForSelector(".vibeBtn.on");
    await page.locator(".navbtn[data-page='profilePage']").click();
    await page.waitForSelector("#profilePage.active");
    const roleTabs = await page.locator("#roleNavButton").count();
    if (roleTabs !== 0) throw new Error("Normal account should not receive owner or venue controls");
    await page.locator(".profileMark").click({ clickCount: 5 });
    const hiddenSheetOpened = await page.locator("#reportSheet.open").count();
    if (hiddenSheetOpened) throw new Error("Profile avatar should not open hidden owner access");

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
