import { chromium, devices, Page, BrowserContext } from "playwright";
import screenshot from "screenshot-desktop";
import fs from "fs-extra";
import path from "path";

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.cwd(),
  "ms-playwright"
);

const variations = [
  { lang: "ar", theme: "dark" },
  { lang: "ar", theme: "light" },
  { lang: "en", theme: "dark" },
  { lang: "en", theme: "light" },
];

if (process.argv.length < 4) {
  console.error("Usage: ts-node src/index.ts <LOGIN_URL> <START_URL>\n\n");
  process.exit(1);
}

const LOGIN_URL = process.argv[2];
const START_URL = process.argv[3];

const SCREENSHOT_DIR = "./screenshots";

type ScreenshotType = "desktop" | "ios" | "android";

async function authenticateAndStart(page: Page) {
  await page.goto(LOGIN_URL);
  await page.goto(START_URL);
  await page.waitForSelector("div.formTemplate", {
    state: "visible",
    timeout: 10000,
  });
}

async function toggleTheme(page: Page, theme: string, type: ScreenshotType) {
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
}

async function zoomOut(page: Page, zoom = "70%") {
  await page.evaluate(`document.body.style.zoom = "${zoom}"`);
}

async function handleWealthPage(page: Page) {
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
}

async function takeDesktopScreenshot(filePath: string) {
  await screenshot({ filename: filePath });
  console.log(`✅ Desktop Captured: ${filePath}`);
}

async function takeMobileScreenshot(page: Page, filePath: string) {
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`✅ Mobile Captured: ${filePath}`);
}

async function captureBreadcrumbScreenshots(page: Page) {
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
}

async function processFlow(
  _context: BrowserContext,
  page: Page,
  type: ScreenshotType
) {
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
      const fileName = `${folder}/${pageRoute}_${lang}_${theme}.png`;

      if (type === "desktop") {
        await takeDesktopScreenshot(fileName);
      } else {
        await takeMobileScreenshot(page, fileName);
      }
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
})();
