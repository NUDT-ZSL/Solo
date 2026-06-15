import express from 'express'
import { registerRoutes } from './mock'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

const router = express.Router()
registerRoutes(router)
app.use(router)

app.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`)
})

export default app
