import { test, expect } from "@playwright/test";

// 或者在测试中打印
test("test", async ({ page }) => {
  await page.goto("https://pro.mufengapp.cn/");
  await page.getByRole("button", { name: "Explore Components" }).click();
  await page.getByRole("link", { name: "Bars And Circles image Bars" }).click();

  // // 等待文档加载完成
  // await page.waitForLoadState('domcontentloaded');

  // 等待网络请求完成
  await page.waitForLoadState('networkidle');

  // 查看匹配数量
  const locator = page.locator('[id$="-tab-code"]');
  const count = await locator.count();
  console.log(`找到 ${count} 个匹配元素`);

  // 暂停执行，打开 Playwright Inspector
  await page.pause();

  const locator2 = page.getByRole('tab', { name: /Code/i });
  const count2 = await locator2.count();
  console.log(`找到 ${count2} 个匹配元素`);

  await locator2.first().click();
});
