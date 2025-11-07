import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 3, interval: 1000, intervalCap: 5 });

// 监听
queue.on("active", () => console.log(`⚡ 正在执行中：${queue.pending} 个任务进行中`));
queue.on("completed", () => console.log(`✅ 任务完成。队列剩余任务数：${queue.size}`));
queue.on("idle", () => console.log("🎉 所有任务完成！"));

// 模拟任务
const task = (name, delay) =>
  new Promise<void>((r) => setTimeout(() => {
    console.log("完成：", name);
    r();
  }, delay));

// 添加任务（不同优先级）
// 优先级只对时间相近的任务生效，如果低优先级任务时间较短，那它会先执行完成，不会让给高优先级任务！
queue.add(() => task("低优先级任务", 800), { priority: 1 });
queue.add(() => task("高优先级任务", 500), { priority: 10 });
queue.add(() => task("普通任务", 700), { priority: 5 });
queue.add(() => task("普通任务", 900), { priority: 5 });
queue.add(() => task("普通任务", 1000), { priority: 5 });
queue.add(() => task("普通任务", 1100), { priority: 5 });

// 暂停 1 秒后恢复
setTimeout(() => {
  console.log("⏸️ 暂停队列");
  queue.pause();

  setTimeout(() => {
    console.log("▶️ 恢复队列");
    queue.start();
  }, 500);
}, 500);
