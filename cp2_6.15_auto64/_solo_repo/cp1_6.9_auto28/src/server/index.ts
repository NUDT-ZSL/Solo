import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }))

export interface FrequencyBand {
  low: number[]
  mid: number[]
  high: number[]
}

export interface RecordingData {
  id: string
  createdAt: number
  dateLabel: string
  bands: FrequencyBand
  energyRates: FrequencyBand
  totalEnergy: { low: number; mid: number; high: number }
  audioBase64: string
}

const storage: Map<string, RecordingData> = new Map()

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

app.post('/api/upload', (req, res) => {
  try {
    const { audioBase64, bands, energyRates } = req.body as {
      audioBase64: string
      bands: FrequencyBand
      energyRates: FrequencyBand
    }

    if (!audioBase64 || !bands) {
      return res.status(400).json({ error: '缺少必要数据' })
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const totalEnergy = {
      low: sum(bands.low),
      mid: sum(bands.mid),
      high: sum(bands.high)
    }

    const id = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const record: RecordingData = {
      id,
      createdAt: Date.now(),
      dateLabel: formatDate(Date.now()),
      bands,
      energyRates,
      totalEnergy,
      audioBase64
    }

    storage.set(id, record)
    console.log(`[Server] 上传成功: ${id}, 共 ${storage.size} 条记录`)
    res.json({ success: true, id, totalEnergy })
  } catch (e) {
    console.error('[Server] 上传错误:', e)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.get('/api/list', (_req, res) => {
  const list = Array.from(storage.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      dateLabel: r.dateLabel,
      totalEnergy: r.totalEnergy
    }))
  res.json({ list })
})

app.get('/api/data/:id', (req, res) => {
  const id = req.params.id
  const record = storage.get(id)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }
  res.json({ record })
})

app.listen(PORT, () => {
  console.log(`[Server] 波形花园 API 服务运行于 http://localhost:${PORT}`)
})

export default app
