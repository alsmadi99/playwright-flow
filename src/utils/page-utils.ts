import { Page } from "playwright";
import { ScreenshotType } from "../types";

export const zoomOut = async (page: Page, zoom = "70%") => {
  await page.evaluate(`document.body.style.zoom = "${zoom}"`);
};

export const handleWealthPage = async (page: Page) => {
  if (page.url().includes("provide-wealth-and-income-information")) {
    const skipButton = page.locator('div[data-id="dont-upload"]');
    if (await skipButton.count()) {
      await skipButton.click();
      console.log("➡️ Skipped bank statements upload.");
    }

    const noButton = page.locator('div[data-id="no"]');
    if (await noButton.count()) {
      await noButton.click();
      console.log("➡️ Selected No for additional wealth info.");
    }
  }
};

export const toggleTheme = async (
  page: Page,
  theme: string,
  type: ScreenshotType
) => {
  if (type === "desktop") {
    await page.click('button[aria-label="header-theme-menu"]');
  }
  if (type === "ios" || type === "android") {
    await page.click('div[aria-label="side-menu"]');
    // wait for the menu to open
    await page.waitForSelector("div.ui-lib-header-side-menu__header-icon", {
      state: "visible",
      timeout: 5000,
    });
    await page.click('button[aria-label="header-theme-menu"]');
    await page.click("div.ui-lib-header-side-menu__header-icon");
    await page.waitForTimeout(500);
  }
};
