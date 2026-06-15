import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import classesRoutes from './routes/classes.js'
import bookingsRoutes from './routes/bookings.js'
import statsRoutes from './routes/stats.js'
import changesRoutes from './routes/changes.js'
import { seedDatabase } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/classes', classesRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/changes', changesRoutes)

app.use('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

seedDatabase().catch(console.error)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
