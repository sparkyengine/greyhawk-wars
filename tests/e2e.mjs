// Browser smoke test: starts Vite, watches bots play, then plays a few human turns in solo mode through the UI.
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`.
import { createServer } from "vite";
import { chromium } from "playwright";

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const url = "http://localhost:5199/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
const ready = () => page.waitForFunction(() => document.querySelector(".paintbar.done"), null, { timeout: 180000 });

await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
await page.click("#mode-watch"); await page.selectOption("#setup-speed", "6"); await page.click("text=Start the war");
await page.waitForSelector(".game"); await page.waitForTimeout(20000);
const turn = await page.textContent(".scenname span");

await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await ready();
await page.click("#mode-solo"); await page.fill("#setup-seed", "7"); await page.click("text=Start the war"); await page.waitForSelector(".game");
let actions = 0;
for (let i = 0; i < 250; i++) {
  await page.waitForTimeout(100);
  const kind = await page.evaluate(() => window.__game?.req?.kind);
  const vis = async s => { const e = await page.$(s); return !!e && await e.isVisible(); };
  if (await vis(".battle-layer")) { const b = await page.$(".battle-layer .bacts .btn.primary"); if (b) await b.click().catch(() => {}); continue; }
  if (await vis(".modal-layer")) { const b = await page.$(".modal-layer .btn.primary:not([disabled])") || await page.$(".modal-layer .choices .btn"); if (b) { await b.click(); continue; } }
  if (kind === "heroes") { await page.click("text=Done placing heroes"); continue; }
  if (kind === "area") { await page.click(".coach .choices .btn"); continue; }
  if (kind === "action") { await page.click("text=End actions"); const c = await page.$(".modal-layer .btn.primary"); if (c) await c.click(); actions++; continue; }
  if (kind === "final") { await page.click("text=End my turn"); continue; }
}
await browser.close(); await server.close();
console.log(`bots reached: ${turn}; solo action phases ended through the UI: ${actions}`);
if (errors.length) { console.error("Page errors:\n" + errors.join("\n")); process.exit(1); }
if (actions < 2) { console.error("The solo game did not progress."); process.exit(1); }
console.log("e2e ok");
