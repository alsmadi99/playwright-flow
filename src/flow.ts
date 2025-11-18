import { BrowserContext, Page } from "playwright";
import fs from "fs-extra";
import { ScreenshotType } from "./types";
import { SCREENSHOT_DIR, variations } from "./constants";
import { handleWealthPage, toggleTheme, zoomOut } from "./utils/page-utils";
import { takeWindowScreenshot } from "./screenshots";

const takeScrollingScreenshots = async (
  page: Page,
  folder: string,
  baseName: string,
) => {
  let index = 1;
  let maxLoops = 20; // safety limit

  while (maxLoops-- > 0) {
    const fileName = `${folder}/${baseName}_part${index}.png`;
    await takeWindowScreenshot(fileName);
    console.log(`✅ Screenshot saved: ${fileName}`);

    const scrollInfo = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      const scrollTop = el.scrollTop;
      const clientHeight = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      const canScroll =
        Math.ceil(scrollTop + clientHeight) < Math.ceil(scrollHeight);
      return { scrollTop, clientHeight, scrollHeight, canScroll };
    });

    if (!scrollInfo.canScroll) {
      break;
    }

    await page.evaluate((nextScroll) => {
      const el = document.scrollingElement || document.documentElement;
      el.scrollTo({ top: nextScroll, behavior: "instant" });
    }, scrollInfo.scrollTop + scrollInfo.clientHeight);

    await page.waitForTimeout(1000);
    index++;
  }
};

const processFlow = async (
  _context: BrowserContext,
  page: Page,
  type: ScreenshotType,
) => {
  let step = 1;

  while (true) {
    console.log(`📄 [${type}] Processing step ${step}`);
    await page.waitForSelector("div.formTemplate", {
      state: "visible",
      timeout: 10000,
    });

    for (const { lang, theme } of variations) {
      await page.goto(page.url().split("?")[0] + `?lang=${lang}`);
      await page.waitForSelector("div.formTemplate", {
        state: "visible",
        timeout: 10000,
      });

      await toggleTheme(page, theme, type);

      if (type === "desktop") {
        await zoomOut(page);
        await page.keyboard.press("F11");
      }

      await handleWealthPage(page);

      const pageRoute = page.url().split("?")[0].split("/").pop();
      const folder = `${SCREENSHOT_DIR}/${type}/step${step}`;
      await fs.ensureDir(folder);

      await takeScrollingScreenshots(
        page,
        folder,
        `${pageRoute}_${lang}_${theme}_full`,
      );
    }

    const nextButton = page.locator('button:has-text("Next")');
    if (!(await nextButton.count())) {
      console.log(`🚩 [${type}] No Next button found. Flow completed.`);
      break;
    }

    const isDisabled = await nextButton.getAttribute("disabled");
    if (isDisabled !== null) {
      console.log(`🚩 [${type}] Next button disabled. Flow completed.`);
      break;
    }

    await Promise.all([
      nextButton.click(),
      page.waitForSelector("div.formTemplate", {
        state: "visible",
        timeout: 10000,
      }),
    ]);
    step++;
  }
};

export default processFlow;
