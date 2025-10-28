import { test, Page, Locator } from "@playwright/test";
import pLimit from "p-limit";
// import fs from "fs";
import fs from "fs-extra";
import { log } from "console";

// tab 列表（大类）
const TABS = ["Landing Page", "Application UI"];

// 所有 pro-blocks 的 url 列表
const proBlocksUrls: string[] = [];
// // 所有复制的命令
// const copiedCommands: string[] = [];
// 所有 blocks 路径
const blocksPaths: string[] = [];

// 所有 blocks 的数量
let totalBlocksCount = 0;

const limit = pLimit(5);

test("test", async ({ page }) => {
  console.log(`\n${"█".repeat(80)}`);
  console.log(`🚀 测试开始：Pro Blocks 数据采集`);
  console.log(`${"█".repeat(80)}`);

  // 设置超时
  test.setTimeout(60000);

  // 访问目标链接
  await page.goto("https://www.shadcndesign.com/pro-blocks");

  // // 等待网络请求完成
  // await page.waitForLoadState('networkidle');
  // 等待文档加载完成
  await page.waitForLoadState("domcontentloaded");

  // 循环 tab
  for (const tab of TABS) {
    // 点击切换 tab
    await clickTab(page, tab);
    // 处理单个 tab
    await handleSingleTab(page, tab);
  }

  console.log(`\n🔍 总共 ${totalBlocksCount} 个 blocks\n`);
  

  // 按 limit 并发处理所有链接
  await concurrentHandleLinksByLimit(page);

  // // 把 copiedCommands 写入到文件
  // writeCopiedCommandsToFile(copiedCommands);
  // 把 blocks 路径写入到文件
  fs.outputFileSync("output/blocksPaths.txt", blocksPaths.join("\n"));

  console.log(`\n${"█".repeat(80)}`);
  console.log(`🎉 测试完成！`);
  console.log(`${"█".repeat(80)}\n`);
});

// // 把 copiedCommands 写入到文件
// function writeCopiedCommandsToFile(copiedCommands: string[]) {
//   // 确保 output 目录存在
//   if (!fs.existsSync("output")) {
//     console.log(`🔍 创建 output 目录...`);
//     fs.mkdirSync("output");
//   }
//   console.log(`🔍 写入 copiedCommands 文件...`);
//   fs.writeFileSync("output/copiedCommands.txt", copiedCommands.join("\n"));
// }

// 按 limit 并发处理所有链接（一个执行完立马执行下一个）
async function concurrentHandleLinksByLimit(page: Page) {
  console.log(`🔍 按 limit 并发处理所有链接...`);

  await Promise.all(
    proBlocksUrls.map((url, index) =>
      limit(() => handleSingleUrl(page, url, index === 0))
    )
  );
}

// 处理单个链接
async function handleSingleUrl(
  page: Page,
  url: string,
  isFirstUrl: boolean = false
) {
  console.log(`\n🔍 开始处理 ${url}`);

  // 如果是第一个链接，则使用原来的 page，否则新建一个 page
  const newPage = isFirstUrl ? page : await page.context().newPage();

  try {
    await newPage.goto(url);
    // await newPage.waitForLoadState("networkidle");
    await newPage.waitForLoadState("domcontentloaded");
    // // 获取页面复制命令
    // await getPageCopiedCommands(newPage);
    // 获取页面中所有 blocks 路径
    const paths = await getPageBlocksPaths(newPage);
    blocksPaths.push(...paths);
  } finally {
    await newPage.close();
  }
}

// 获取页面中所有 blocks 路径
async function getPageBlocksPaths(page: Page) {
  const links = await page
    .getByRole("link", { name: "Open preview in fullscreen" })
    .all();

  const paths = await Promise.all(
    links.map(async (link) => {
      const href = await link.getAttribute("href");
      // 移除域名前缀（https://pro-blocks-v4.vercel.app）
      const path = href ? href.replace("https://pro-blocks-v4.vercel.app", "") : "";
      console.log(`🔍 path: ${path}`);
      return path;
    })
  );
  return paths
}

// // 获取页面复制命令
// async function getPageCopiedCommands(page: Page) {
//   // 获取所有的 ‘Copy to clipboard’ 按钮
//   const copyButtons = await page
//     .getByRole("button", { name: "Copy to clipboard" })
//     .all();

//   // 循环 copyButtons
//   for (const copyButton of copyButtons) {
//     await handleSingleCopyButton(page, copyButton);
//   }
// }

// // 处理单个 copy 按钮
// async function handleSingleCopyButton(page: Page, copyButton: Locator) {
//   await copyButton.click();
//   const clipboardText = await page.evaluate(() => {
//     return navigator.clipboard.readText();
//   });
//   console.log(`🔍 复制命令：${clipboardText}`);
//   copiedCommands.push(clipboardText);
// }

// 处理单个 tab
async function handleSingleTab(page: Page, tab: string) {
  console.log(`\n🔍 开始处理 ${tab} 的链接`);

  const tabpanel = page.getByRole("tabpanel", { name: tab });
  const links = await tabpanel.getByRole("link").all();
  const count = links.length;
  console.log(`📊 ${tab} 共有 ${count} 个链接\n`);

  // 循环 links
  for (const link of links) {
    // 拿到这个链接内部的文本、path 和 p（Blocks 数量）
    const text = await link.locator('[data-slot="card-title"]').textContent();
    const path = await link.getAttribute("href");
    const p = await link.locator("p").textContent();
    const blocksCount = await getBlocksCount(p);
    // 处理单个链接
    await handleSingleLink(page, text, path, blocksCount);
  }

  console.log(`\n✅ ${tab} 处理完成 (共 ${count} 个链接)`);
  console.log(`${"-".repeat(80)}`);
}

// 处理单个链接
async function handleSingleLink(
  page: Page,
  text: string | null,
  path: string | null,
  blocksCount: number
) {
  console.log(`  ├─ 📦 ${text}`);
  console.log(`  │  ├─ Path: ${path}`);
  console.log(`  │  └─ Blocks: ${blocksCount}`);

  // 增加 totalBlocksCount
  totalBlocksCount += blocksCount;
  // 构造 url 并收集
  const url = `https://shadcndesign.com${path}`;
  proBlocksUrls.push(url);
}

// 点击切换 tab，第一个跳过
async function clickTab(page: Page, tabName: string) {
  if (tabName === TABS[0]) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📍 第一个 tab：${tabName} (跳过点击)`);
    console.log(`${"=".repeat(80)}`);
    return;
  }
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📍 切换到 tab：${tabName}`);
  console.log(`${"=".repeat(80)}`);
  await page.getByRole("tab", { name: tabName }).click();
}

// 从 p（如：'3 blocks'）中获取 Blocks 数量（number）
async function getBlocksCount(p: string | null) {
  const match = p?.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}
