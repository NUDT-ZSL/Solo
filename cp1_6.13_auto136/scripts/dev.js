import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

const client = spawn('npx', ['vite'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

const shutdown = () => {
  server.kill('SIGTERM')
  client.kill('SIGTERM')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
