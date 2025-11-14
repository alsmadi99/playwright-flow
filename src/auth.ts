import { Page } from "playwright";
import { LOGIN_URL, START_URL } from "./constants";

const authenticateAndStart = async (page: Page) => {
  await page.goto(LOGIN_URL);
  await page.goto(START_URL);
  await page.waitForSelector("div.formTemplate", {
    state: "visible",
    timeout: 10000,
  });
};

export default authenticateAndStart;
