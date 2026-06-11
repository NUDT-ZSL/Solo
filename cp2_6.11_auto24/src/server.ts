import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Recipe, RecipesData } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

const DATA_DIR = path.resolve(__dirname, '../data')
const DATA_FILE = path.join(DATA_DIR, 'recipes.json')

app.use(cors())
app.use(express.json())

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ recipes: [] }, null, 2), 'utf-8')
  }
}

function readData(): RecipesData {
  ensureDataFile()
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { recipes: [] }
  }
}

function writeData(data: RecipesData): void {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/recipes', (_req: Request, res: Response) => {
  try {
    const data = readData()
    res.json(data.recipes)
  } catch (err) {
    res.status(500).json({ error: '读取菜谱失败' })
  }
})

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = readData()
    const recipe = data.recipes.find((r) => r.id === id)
    if (!recipe) {
      res.status(404).json({ error: '菜谱不存在' })
      return
    }
    res.json(recipe)
  } catch (err) {
    res.status(500).json({ error: '读取菜谱失败' })
  }
})

app.post('/api/recipes', (req: Request, res: Response) => {
  try {
    const { title, rawText, steps } = req.body
    if (!title || !rawText || !steps || !Array.isArray(steps)) {
      res.status(400).json({ error: '参数不完整' })
      return
    }
    const now = Date.now()
    const recipe: Recipe = {
      id: uuidv4(),
      title,
      rawText,
      steps: steps.map((s: any) => ({
        ...s,
        id: s.id || uuidv4()
      })),
      createdAt: now,
      updatedAt: now
    }
    const data = readData()
    data.recipes.unshift(recipe)
    writeData(data)
    res.status(201).json(recipe)
  } catch (err) {
    res.status(500).json({ error: '创建菜谱失败' })
  }
})

app.put('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = readData()
    const idx = data.recipes.findIndex((r) => r.id === id)
    if (idx === -1) {
      res.status(404).json({ error: '菜谱不存在' })
      return
    }
    const original = data.recipes[idx]
    data.recipes[idx] = {
      ...original,
      ...req.body,
      id: original.id,
      createdAt: original.createdAt,
      updatedAt: Date.now()
    }
    writeData(data)
    res.json(data.recipes[idx])
  } catch (err) {
    res.status(500).json({ error: '更新菜谱失败' })
  }
})

app.delete('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = readData()
    const idx = data.recipes.findIndex((r) => r.id === id)
    if (idx === -1) {
      res.status(404).json({ error: '菜谱不存在' })
      return
    }
    data.recipes.splice(idx, 1)
    writeData(data)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: '删除菜谱失败' })
  }
})

app.listen(PORT, () => {
  console.log(`[server] 回声食谱 API 服务器运行在 http://localhost:${PORT}`)
})
