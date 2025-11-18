import { chromium } from "playwright";
import fs from "fs-extra";
import path from "path";

import authenticateAndStart from "./auth";
import { mobileStyleTag, SCREENSHOT_DIR } from "./constants";
import processFlow from "./flow";
import { captureBreadcrumbScreenshots } from "./screenshots";
import { generateWordFiles } from "./word-export";

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.cwd(),
  "ms-playwright",
);

if (process.argv.length < 4) {
  console.error("Usage: ts-node src/index.ts <LOGIN_URL> <START_URL>\n\n");
  process.exit(1);
}

(async () => {
  await fs.emptyDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"], // Let Chrome handle full screen
  });

  // Create context without forcing a fixed viewport
  const desktopContext = await browser.newContext({
    viewport: null, // Use the browser's actual window size
  });

  // Create page
  const desktopPage = await desktopContext.newPage();

  // Dynamically set viewport to match the window size
  const windowSize = await desktopPage.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  await desktopPage.setViewportSize(windowSize);

  await authenticateAndStart(desktopPage);
  await processFlow(desktopContext, desktopPage, "desktop");

  // Mobile flow ios
  const mobileContextIos = await browser.newContext({
    viewport: null, // Use the browser's actual window size
  });
  const mobilePageIos = await mobileContextIos.newPage();

  await mobilePageIos.setViewportSize({
    height: windowSize.height,
    width: mobileStyleTag.ios.width,
  });

  // Optional: Add gray background to mimic DevTools margins
  await mobilePageIos.addStyleTag({ content: mobileStyleTag.ios.content });
  await authenticateAndStart(mobilePageIos);
  await processFlow(mobileContextIos, mobilePageIos, "ios");

  // Mobile flow android
  const mobileContextAndroid = await browser.newContext({
    viewport: null,
  });
  const mobilePageAndroid = await mobileContextAndroid.newPage();
  await mobilePageAndroid.setViewportSize({
    height: windowSize.height,
    width: mobileStyleTag.android.width,
  });

  // Optional: Add gray background to mimic DevTools margins
  await mobilePageAndroid.addStyleTag({
    content: mobileStyleTag.android.content,
  });
  await authenticateAndStart(mobilePageAndroid);
  await processFlow(mobileContextAndroid, mobilePageAndroid, "android");

  // Breadcrumb flow (desktop only)
  const breadcrumbContext = await browser.newContext({
    viewport: null,
  });
  const breadcrumbPage = await breadcrumbContext.newPage();
  const breadcrumbWindowSize = await breadcrumbPage.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  await breadcrumbPage.setViewportSize(breadcrumbWindowSize);
  await authenticateAndStart(breadcrumbPage);
  await captureBreadcrumbScreenshots(breadcrumbPage);

  await browser.close();

  // Generate Word files after screenshots
  await generateWordFiles();
})();
