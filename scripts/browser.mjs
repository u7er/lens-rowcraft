import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

export function browserPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = process.platform === "win32"
    ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
      .filter(Boolean).flatMap((base) => ["Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe"].map((file) => path.join(base, file)))
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return [...candidates, chromium.executablePath()].find(existsSync);
}

export async function launchBrowser() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error("No browser found. Install Chrome or Edge, or set CHROME_PATH to a browser executable.");
  return chromium.launch({ executablePath, headless: true });
}
