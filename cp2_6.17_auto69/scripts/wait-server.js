const SERVER_URL = 'http://localhost:4000/sessions';
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

async function checkServer() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(SERVER_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  console.log('⏳ 等待后端服务启动...');
  for (let i = 0; i < MAX_RETRIES; i++) {
    const isReady = await checkServer();
    if (isReady) {
      console.log('✅ 后端服务已就绪，启动前端...');
      process.exit(0);
    }
    process.stdout.write(`  重试中 (${i + 1}/${MAX_RETRIES})...\r`);
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }
  console.log('\n⚠️  后端服务启动超时，仍将启动前端');
  process.exit(0);
}

waitForServer();
