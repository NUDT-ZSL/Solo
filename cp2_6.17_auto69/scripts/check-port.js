import { execSync } from 'child_process';

const ports = [3000, 4000];

function isPortInUse(port) {
  try {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr ":${port}" | findstr "LISTENING"`
      : `lsof -i :${port} -t`;
    const result = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return result.trim() ? result.trim() : null;
  } catch {
    return null;
  }
}

function killProcessOnPort(port) {
  const info = isPortInUse(port);
  if (info && process.platform === 'win32') {
    const pidMatch = info.match(/\s+(\d+)\s*$/);
    if (pidMatch) {
      const pid = pidMatch[1];
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`✅ 已终止占用端口 ${port} 的进程 (PID: ${pid})`);
      } catch (e) {
        console.log(`⚠️  无法终止端口 ${port} 的进程 (PID: ${pid})`);
      }
    }
  }
}

console.log('🔍 检查端口占用情况...');

ports.forEach(port => {
  const inUse = isPortInUse(port);
  if (inUse) {
    console.log(`⚠️  端口 ${port} 被占用，正在释放...`);
    killProcessOnPort(port);
  } else {
    console.log(`✅ 端口 ${port} 可用`);
  }
});

console.log('🚀 准备启动服务...');
