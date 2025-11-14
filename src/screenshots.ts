import screenshot from "screenshot-desktop";
import fs from "fs-extra";

import { Page } from "playwright";
import { SCREENSHOT_DIR } from "./constants";
import { zoomOut } from "./utils/page-utils";

export const takeDesktopScreenshot = async (filePath: string) => {
  await screenshot({ filename: filePath });
  console.log(`✅ Desktop Captured: ${filePath}`);
};

export const takeMobileScreenshot = async (page: Page, filePath: string) => {
  await page.screenshot({ path: filePath });
  console.log(`✅ Mobile Captured: ${filePath}`);
};

export const captureBreadcrumbScreenshots = async (page: Page) => {
  console.log(`🔍 [desktop] Capturing breadcrumb screenshots...`);

  // Collect all hrefs first
  const breadcrumbLinks = page.locator("div.ui-lib-breadcrumb a");
  const count = await breadcrumbLinks.count();
  if (count === 0) {
    console.log(`⚠️ [desktop] No breadcrumb links found.`);
    return;
  }

  const hrefs: string[] = [];
  for (let i = 0; i < count; i++) {
    const href = await breadcrumbLinks.nth(i).getAttribute("href");
    if (href) hrefs.push(href);
  }

  const folder = `${SCREENSHOT_DIR}/breadcrumbs`;
  await fs.ensureDir(folder);

  // Navigate to each href separately
  for (let i = 0; i < hrefs.length; i++) {
    const href = hrefs[i];
    for (const lang of ["en", "ar"]) {
      const url = href.includes("?")
        ? `${href}&lang=${lang}`
        : `${href}?lang=${lang}`;
      await page.goto(url);
      await page.waitForTimeout(2500);

      const pageRoute = url.split("?")[0].split("/").pop();
      const fileName = `${folder}/${
        !!pageRoute ? pageRoute : "Home"
      }_${lang}.png`;

      await zoomOut(page);
      await page.keyboard.press("F11");
      await takeDesktopScreenshot(fileName);

      console.log(`✅ [desktop] Breadcrumb screenshot: ${fileName}`);
    }
  }
};
