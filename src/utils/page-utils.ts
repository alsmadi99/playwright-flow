import { Page } from "playwright";
import { ScreenshotType } from "../types";

export const zoomOut = async (page: Page, zoom = "80%") => {
  await page.evaluate(`document.body.style.zoom = "${zoom}"`);
};

/**
 * Switch UI language manually via the language switcher side panel.
 * `?lang=ar` query param is no longer honoured, so we drive the UI:
 *   1. click the circular language switcher button (opens the side panel)
 *   2. click the target-language button inside the panel
 */
export const switchLanguage = async (page: Page, lang: "ar" | "en") => {
  const targetLabel = lang === "ar" ? "العربية" : "English";
  const htmlLang = await page.getAttribute("html", "lang");

  // Already in the requested language → nothing to do.
  if (htmlLang && htmlLang.toLowerCase().startsWith(lang)) {
    return;
  }

  // 1. open the side panel
  await page.click("button.ui-lib-language-switcher");

  // 2. click the language option inside the panel
  const option = page
    .locator("button.ui-lib-button_secondary", { hasText: targetLabel })
    .last();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();

  // wait for the re-render after language change
  await page.waitForSelector("div.formTemplate", {
    state: "visible",
    timeout: 10000,
  });
  await page.waitForTimeout(1000);
  console.log(`🌐 Switched language to ${lang}`);
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
  type: ScreenshotType,
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
