import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import recipeRoutes from './routes/recipeRoutes.js'
import userRoutes from './routes/userRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/recipes', recipeRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`RecipeRadar server running on http://localhost:${PORT}`)
})

export default app
