import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import letterRoutes from './routes/letterRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { errorHandler } from './middleware/error.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/letters', letterRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`TimeLetter Server running on http://localhost:${PORT}`)
  console.log(`Data directory: ${new URL('./data/', import.meta.url).pathname}`)
})
