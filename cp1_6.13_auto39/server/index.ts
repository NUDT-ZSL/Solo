import express from 'express'
import cors from 'cors'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import mapRoutes from './mapStorage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')

async function bootstrap() {
  await mkdir(DATA_DIR, { recursive: true })

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.use('/api/maps', mapRoutes)

  app.listen(PORT, () => {
    console.log(`[server] Map server listening on http://localhost:${PORT}`)
    console.log(`[server] Data directory: ${DATA_DIR}`)
  })
}

bootstrap().catch((err) => {
  console.error('[server] Failed to start:', err)
  process.exit(1)
})
