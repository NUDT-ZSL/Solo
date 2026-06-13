import express from 'express'
import cors from 'cors'
import eventsRouter from './routes/events.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api', eventsRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CampusEventHub API is running' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

export default app
