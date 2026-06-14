import express from 'express'
import cors from 'cors'
import { plants } from '../src/plantData'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/plants', (_req, res) => {
  res.json(plants)
})

app.listen(PORT, () => {
  console.log(`ParkBloom API server running on http://localhost:${PORT}`)
})
