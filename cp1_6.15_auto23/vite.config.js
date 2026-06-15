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

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next()

          if (!apiHandler) {
            const { default: express } = await import('express')
            const app = express()
            app.use(express.json())

            const mockModule = await server.ssrLoadModule(
              path.resolve(__dirname, 'server/mock.ts')
            )
            const router = express.Router()
            mockModule.registerRoutes(router)
            app.use(router)

            apiHandler = app
          }

          apiHandler(req, res, next)
        })
      }
    }
  ]
})
