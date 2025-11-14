import { chromium, devices } from "playwright";
import fs from "fs-extra";
import path from "path";

import authenticateAndStart from "./auth";
import { SCREENSHOT_DIR } from "./constants";
import processFlow from "./flow";
import { captureBreadcrumbScreenshots } from "./screenshots";
import { generateWordFiles } from "./word-export";

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.cwd(),
  "ms-playwright"
);

if (process.argv.length < 4) {
  console.error("Usage: ts-node src/index.ts <LOGIN_URL> <START_URL>\n\n");
  process.exit(1);
}

(async () => {
  await fs.emptyDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--start-maximized",
      "--window-position=0,0",
      "--window-size=1920,1080",
    ],
  });

  // Desktop flow
  const desktopContext = await browser.newContext();
  const desktopPage = await desktopContext.newPage();
  await authenticateAndStart(desktopPage);
  await processFlow(desktopContext, desktopPage, "desktop");

  // Mobile flow Android
  const mobileContextIos = await browser.newContext({
    ...devices["iPhone 12"],
  });
  const mobilePageIos = await mobileContextIos.newPage();
  await authenticateAndStart(mobilePageIos);
  await processFlow(mobileContextIos, mobilePageIos, "ios");

  // Mobile flow Ios
  const mobileContextAndroid = await browser.newContext({
    ...devices["Galaxy S24"],
  });
  const mobilePageAndroid = await mobileContextAndroid.newPage();
  await authenticateAndStart(mobilePageAndroid);
  await processFlow(mobileContextAndroid, mobilePageAndroid, "android");

  // Breadcrumb flow (desktop only)
  const breadcrumbContext = await browser.newContext();
  const breadcrumbPage = await breadcrumbContext.newPage();
  await authenticateAndStart(breadcrumbPage);
  await captureBreadcrumbScreenshots(breadcrumbPage);

  await browser.close();

  // Generate Word files after screenshots
  await generateWordFiles();
})();
