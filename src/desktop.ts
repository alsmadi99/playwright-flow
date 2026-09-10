import { chromium, Page } from "playwright";
import fs from "fs-extra";
import path from "path";

import authenticateAndStart from "./auth";
import { SCREENSHOT_DIR } from "./constants";
import {
  handleWealthPage,
  switchLanguage,
  toggleTheme,
  zoomOut,
} from "./utils/page-utils";
import { takeWindowScreenshot } from "./screenshots";
import { generateWordFiles } from "./word-export";

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.cwd(),
  "ms-playwright",
);

// Usage: <LOGIN_URL> <START_URL> [lang]   lang = ar | en (default en)
if (process.argv.length < 4) {
  console.error(
    "Usage: ts-node src/desktop.ts <LOGIN_URL> <START_URL> [ar|en]\n\n",
  );
  process.exit(1);
}

const langArg = (process.argv[4] || "en").toLowerCase();
if (langArg !== "ar" && langArg !== "en") {
  console.error(`Invalid lang "${langArg}". Use "ar" or "en".`);
  process.exit(1);
}
const lang = langArg as "ar" | "en";

const themes = ["light", "dark"] as const;

const takeScrollingScreenshots = async (
  page: Page,
  folder: string,
  baseName: string,
) => {
  let index = 1;
  let maxLoops = 20; // safety limit

  // start from the very top
  await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    el.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  while (maxLoops-- > 0) {
    // extra settle time so screenshots aren't taken mid-load
    await page.waitForTimeout(3000);

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

    if (!scrollInfo.canScroll) break;

    await page.evaluate((nextScroll) => {
      const el = document.scrollingElement || document.documentElement;
      el.scrollTo({ top: nextScroll, behavior: "instant" });
    }, scrollInfo.scrollTop + scrollInfo.clientHeight);

    await page.waitForTimeout(1000);
    index++;
  }
};

const processDesktopFlow = async (page: Page) => {
  let step = 1;

  while (true) {
    console.log(`📄 [desktop] Processing step ${step} (lang=${lang})`);
    await page.waitForSelector("div.formTemplate", {
      state: "visible",
      timeout: 10000,
    });

    // Manual language switch (?lang=ar no longer works)
    await switchLanguage(page, lang);

    for (const theme of themes) {
      await page.waitForSelector("div.formTemplate", {
        state: "visible",
        timeout: 10000,
      });

      await toggleTheme(page, theme, "desktop");

      await zoomOut(page);
      await page.keyboard.press("F11");

      await handleWealthPage(page);

      const pageRoute = page.url().split("?")[0].split("/").pop();
      const folder = `${SCREENSHOT_DIR}/desktop/step${step}`;
      await fs.ensureDir(folder);

      // wait for full render before capturing
      await page.waitForTimeout(3000);

      await takeScrollingScreenshots(
        page,
        folder,
        `${pageRoute}_${lang}_${theme}_full`,
      );
    }

    const nextLabel = lang === "ar" ? "التالي" : "Next";
    const nextButton = page.locator(`button:has-text("${nextLabel}")`);
    if (!(await nextButton.count())) {
      console.log(`🚩 [desktop] No Next button found. Flow completed.`);
      break;
    }

    const isDisabled = await nextButton.getAttribute("disabled");
    if (isDisabled !== null) {
      console.log(`🚩 [desktop] Next button disabled. Flow completed.`);
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

(async () => {
  await fs.emptyDir(path.join(SCREENSHOT_DIR, "desktop"));

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const windowSize = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await page.setViewportSize(windowSize);

  await authenticateAndStart(page);
  await processDesktopFlow(page);

  await browser.close();

  await generateWordFiles();
})();
