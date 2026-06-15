import express from 'express'
import cors from 'cors'
import presetsRouter from './routes/presets.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/presets', presetsRouter)

app.get('/api/sounds', (req, res) => {
  const sounds = [
    { id: 'rain', name: '雨声', emoji: '🌧️', category: '自然', frequency: 'lf' },
    { id: 'waves', name: '海浪', emoji: '🌊', category: '自然', frequency: 'lf' },
    { id: 'fire', name: '篝火', emoji: '🔥', category: '自然', frequency: 'mf' },
    { id: 'birds', name: '鸟鸣', emoji: '🐦', category: '自然', frequency: 'hf' },
    { id: 'traffic', name: '车流', emoji: '🚗', category: '城市', frequency: 'lf' },
    { id: 'cafe', name: '咖啡馆', emoji: '☕', category: '城市', frequency: 'mf' },
    { id: 'fan', name: '风扇', emoji: '🌀', category: '室内', frequency: 'lf' },
    { id: 'forest', name: '森林', emoji: '🌲', category: '自然', frequency: 'mf' },
  ]
  res.json(sounds)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CitySoundBoard API is running' })
})

app.listen(PORT, () => {
  console.log(`CitySoundBoard Server running on http://localhost:${PORT}`)
})
