import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
}

function runCommand(name, cmd, args, color) {
  const proc = spawn(cmd, args, {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
  })

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n')
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${name}]${colors.reset} ${line}`)
      }
    })
  })

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n')
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${name}]${colors.reset} ${line}`)
      }
    })
  })

  proc.on('close', (code) => {
    console.log(`${color}[${name}]${colors.reset} 进程退出，代码: ${code}`)
  })

  proc.on('error', (err) => {
    console.error(`${color}[${name}]${colors.reset} 启动失败:`, err.message)
  })

  return proc
}

console.log(`${colors.yellow}🚀 正在启动焚笺开发环境...${colors.reset}`)
console.log()

const server = runCommand('服务端', 'npx', ['tsx', 'watch', 'src/server.ts'], colors.green)
const client = runCommand('前端', 'npx', ['vite'], colors.cyan)

const shutdown = () => {
  console.log(`\n${colors.yellow}🛑 正在关闭所有进程...${colors.reset}`)
  server.kill('SIGTERM')
  client.kill('SIGTERM')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
