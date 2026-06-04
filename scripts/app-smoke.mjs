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
