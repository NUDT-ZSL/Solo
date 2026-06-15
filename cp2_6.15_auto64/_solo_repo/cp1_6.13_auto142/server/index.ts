import express from 'express'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'color-schemes.db'),
  autoload: true
})

app.post('/api/color-schemes', async (req, res) => {
  try {
    const { name, ruleType, colors, createdAt } = req.body
    const doc = await db.insert({
      name: name || `方案-${Date.now()}`,
      ruleType,
      colors,
      createdAt: createdAt || Date.now()
    })
    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, error: '保存失败' })
  }
})

app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10)
    const docs = await db.find({}).sort({ createdAt: -1 }).limit(limit)
    res.json({ success: true, data: docs })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取历史失败' })
  }
})

app.delete('/api/color-schemes/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.remove({ _id: id }, {})
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除失败' })
  }
})

app.listen(PORT, () => {
  console.log(`ColorHarmony 服务器运行在 http://localhost:${PORT}`)
})
