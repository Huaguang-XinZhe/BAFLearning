import { test, Page } from "@playwright/test";

test("open browser", async ({ page }) => {
  await page.goto("https://www.shadcndesign.com/pro-blocks");
  await page.waitForLoadState("domcontentloaded");
  await page.pause();
});