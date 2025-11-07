const fs = require('fs-extra');
const PQueue = require('p-queue').default;
const path = require('path');

// 配置
const API_BASE_URL = 'https://shadcndesign-registry.vercel.app/api/registry/';
const LICENSE_KEY = '7CFE7568-75D3-44C6-981A-9B35DF245936';
const BLOCKS_PATH_FILE = 'output/blocksPaths.txt';
const OUTPUT_DIR = 'output';

// 预处理 blocksPaths.txt，提取组件名
async function preprocessBlockPaths() {
  console.log('正在读取并预处理 blocksPaths.txt...');

  // 如果 componentNames.json 已经存在，则跳过处理
  if (fs.existsSync('output/componentNames.json')) {
    console.log('componentNames.json 已经存在，跳过处理');
    return fs.readJson('output/componentNames.json');
  }
  
  
  const content = await fs.readFile(BLOCKS_PATH_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  
  const componentNames = lines.map(line => {
    const trimmedLine = line.trim();
    const lastSegment = trimmedLine.split('/').pop();
    return lastSegment;
  });
  
  console.log(`共提取 ${componentNames.length} 个组件名`);
  
  // 输出为 JSON 文件
  await fs.writeJson('output/componentNames.json', componentNames, { spaces: 2 });
  console.log('组件名已保存到 output/componentNames.json');
  
  return componentNames;
}

// 获取单个组件的数据
async function fetchComponent(componentName) {
  const url = `${API_BASE_URL}${componentName}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'node-fetch',
        'x-license-key': LICENSE_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { componentName, data, success: true };
  } catch (error) {
    console.error(`❌ 获取 ${componentName} 失败:`, error.message);
    return { componentName, error: error.message, success: false };
  }
}

// 保存组件文件
async function saveComponentFiles(componentName, data) {
  if (!data.files || data.files.length === 0) {
    console.warn(`⚠️  ${componentName} 没有文件数据`);
    return;
  }
  
  const file = data.files[0];
  const code = file.content;
  const filePath = file.path;
  
  // 根据 files[0].path 组织目录层级
  const fullPath = path.join(OUTPUT_DIR, filePath);
  
  // 确保目录存在
  await fs.ensureDir(path.dirname(fullPath));
  
  // 写入文件
  await fs.writeFile(fullPath, code, 'utf-8');
  
  console.log(`✅ 已保存: ${filePath}`);
}

// 主函数
async function main() {
  console.log('=== 开始拉取 Shadcn 组件 ===\n');
  
  // 1. 预处理获取组件名列表
  const componentNames = await preprocessBlockPaths();
  
  console.log('\n=== 开始并发拉取组件 ===\n');
  
  // 2. 创建并发队列
  // 并发为 5，每秒最多 20 个请求
  const queue = new PQueue({
    concurrency: 5,
    interval: 1000,      // 时间窗口：1000ms (1秒)
    intervalCap: 20      // 时间窗口内最多 20 个请求
  });
  
  // 统计信息
  let successCount = 0;
  let failCount = 0;
  
  // 3. 添加任务到队列
  const tasks = componentNames.map((componentName, index) => {
    return queue.add(async () => {
      console.log(`[${index + 1}/${componentNames.length}] 正在获取: ${componentName}`);
      
      const result = await fetchComponent(componentName);
      
      if (result.success) {
        await saveComponentFiles(componentName, result.data);
        successCount++;
      } else {
        failCount++;
      }
      
      return result;
    });
  });
  
  // 4. 等待所有任务完成
  console.log('正在执行队列任务...\n');
  const results = await Promise.all(tasks);
  
  // 5. 输出统计信息
  console.log('\n=== 执行完成 ===');
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log(`📁 文件保存目录: ${OUTPUT_DIR}`);
  
  // 保存执行结果
  await fs.writeJson('output/fetchResults.json', results, { spaces: 2 });
  console.log('详细结果已保存到 output/fetchResults.json');
}

// 运行主函数
main().catch(error => {
  console.error('执行出错:', error);
  process.exit(1);
});



