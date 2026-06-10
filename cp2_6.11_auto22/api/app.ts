import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import voiceprintRoutes from './routes/voiceprints.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

app.use('/api/auth', authRoutes)
app.use('/api/voiceprints', voiceprintRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof Error && error.message === 'Only WAV and MP3 files allowed') {
    res.status(400).json({
      success: false,
      error: error.message,
    })
    return
  }

  if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: 'File size exceeds 20MB limit',
    })
    return
  }

  if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: error.message,
    })
    return
  }

  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
