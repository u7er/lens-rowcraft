import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { launchBrowser } from "./browser.mjs";

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve("preview.html")).href);
  await page.locator(".lwr-editor").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await mkdir("assets/screenshots", { recursive: true });
  await page.locator("#workload-layout-preview").screenshot({ path: "assets/screenshots/layout-editor.png" });
  console.log("Saved assets/screenshots/layout-editor.png (standalone editor preview, not live Lens).");
} finally {
  await browser.close();
}
