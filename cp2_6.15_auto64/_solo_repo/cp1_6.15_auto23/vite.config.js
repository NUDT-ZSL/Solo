import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        let apiHandler = null
        let mockModule = null

        const loadMockModule = async () => {
          const { default: express } = await import('express')
          const app = express()
          app.use(express.json())

          mockModule = await server.ssrLoadModule(
            path.resolve(__dirname, 'server/mock.ts')
          )
          const router = express.Router()
          mockModule.registerRoutes(router)
          app.use(router)
          apiHandler = app
        }

        server.watcher.add(path.resolve(__dirname, 'server/**/*.ts'))
        server.watcher.on('change', async (file) => {
          if (file.startsWith(path.resolve(__dirname, 'server'))) {
            server.moduleGraph.invalidateAll()
            apiHandler = null
            mockModule = null
            console.log('[api-server] mock module reloaded')
          }
        })

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next()

          if (!apiHandler) {
            await loadMockModule()
          }

          apiHandler(req, res, next)
        })
      }
    }
  ],
  server: {
    port: 5173,
  }
})
