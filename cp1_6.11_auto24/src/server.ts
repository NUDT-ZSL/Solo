import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Recipe, RecipeStep } from './types'
import { parseRecipeText } from './utils/recipeParser'

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'recipes.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use((err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    _res.status(400).json({
      success: false,
      error: '请求体JSON格式无效',
      detail: err.message
    })
    return
  }
  next(err)
})

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8')
    }
  } catch (e) {
    console.error('初始化数据目录失败:', (e as Error).message)
  }
}

ensureDataDir()

const readRecipes = (): { data: Recipe[] | null; error: string | null } => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) {
      return { data: null, error: '数据文件格式错误：期望数组' }
    }
    return { data: parsed as Recipe[], error: null }
  } catch (e) {
    const msg = (e as Error).message
    console.error('读取数据文件失败:', msg)
    return { data: null, error: `读取数据失败: ${msg}` }
  }
}

const writeRecipes = (recipes: Recipe[]): { success: boolean; error: string | null } => {
  try {
    const tmpFile = DATA_FILE + '.tmp'
    fs.writeFileSync(tmpFile, JSON.stringify(recipes, null, 2), 'utf-8')
    fs.renameSync(tmpFile, DATA_FILE)
    return { success: true, error: null }
  } catch (e) {
    const msg = (e as Error).message
    console.error('写入数据文件失败:', msg)
    return { success: false, error: `写入数据失败: ${msg}` }
  }
}

function validateRecipeInput(body: any): { valid: boolean; error: string | null } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体必须为JSON对象' }
  }

  if (body.rawText !== undefined) {
    if (typeof body.rawText !== 'string') {
      return { valid: false, error: 'rawText 必须为字符串' }
    }
    if (!body.rawText.trim()) {
      return { valid: false, error: '菜谱内容不能为空' }
    }
    if (body.rawText.length > 50000) {
      return { valid: false, error: '菜谱内容过长，请控制在50000字符以内' }
    }
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string') {
      return { valid: false, error: 'title 必须为字符串' }
    }
    if (body.title.length > 200) {
      return { valid: false, error: '菜谱标题过长，请控制在200字符以内' }
    }
  }

  if (body.steps !== undefined) {
    if (!Array.isArray(body.steps)) {
      return { valid: false, error: 'steps 必须为数组' }
    }
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i]
      if (!step || typeof step !== 'object') {
        return { valid: false, error: `steps[${i}] 必须为对象` }
      }
      if (typeof step.stepNumber !== 'number' || step.stepNumber < 0) {
        return { valid: false, error: `steps[${i}].stepNumber 必须为非负数` }
      }
      if (typeof step.duration !== 'number' || step.duration < 0) {
        return { valid: false, error: `steps[${i}].duration 必须为非负数` }
      }
    }
  }

  return { valid: true, error: null }
}

app.get('/api/recipes', (_req, res) => {
  const { data, error } = readRecipes()
  if (error) {
    return res.status(500).json({ success: false, error })
  }
  res.json({ success: true, data })
})

app.get('/api/recipes/:id', (req, res) => {
  const id = req.params.id
  if (!id || id.trim().length === 0) {
    return res.status(400).json({ success: false, error: '无效的菜谱ID' })
  }

  const { data, error } = readRecipes()
  if (error) {
    return res.status(500).json({ success: false, error })
  }

  const recipe = data!.find(r => r.id === id)
  if (!recipe) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }
  res.json({ success: true, data: recipe })
})

app.post('/api/recipes', (req, res) => {
  const validation = validateRecipeInput(req.body)
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error })
  }

  const { title, rawText } = req.body as { title?: string; rawText?: string }

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, error: '菜谱内容不能为空' })
  }

  const result = parseRecipeText(rawText)

  if (result.steps.length === 0) {
    return res.status(400).json({
      success: false,
      error: '未能解析出有效的步骤，请检查格式（步骤1: / Step 1 / 一、 / 1. 等）',
      warnings: result.warnings
    })
  }

  const recipe: Recipe = {
    id: uuidv4(),
    title: (title && title.trim()) || '我的菜谱',
    rawText,
    steps: result.steps,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  const { data, error: readError } = readRecipes()
  if (readError) {
    return res.status(500).json({ success: false, error: readError })
  }

  data!.unshift(recipe)

  const { success: writeOk, error: writeError } = writeRecipes(data!)
  if (!writeOk) {
    return res.status(500).json({ success: false, error: writeError })
  }

  res.status(201).json({
    success: true,
    data: recipe,
    warnings: result.warnings.length > 0 ? result.warnings : undefined
  })
})

app.put('/api/recipes/:id', (req, res) => {
  const id = req.params.id
  if (!id || id.trim().length === 0) {
    return res.status(400).json({ success: false, error: '无效的菜谱ID' })
  }

  const validation = validateRecipeInput(req.body)
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error })
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, error: '请求体不能为空，至少需要一个更新字段' })
  }

  const { data, error: readError } = readRecipes()
  if (readError) {
    return res.status(500).json({ success: false, error: readError })
  }

  const index = data!.findIndex(r => r.id === id)
  if (index === -1) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }

  const { title, rawText, steps } = req.body as Partial<Recipe>

  if (title !== undefined) {
    data![index].title = title.trim() || data![index].title
  }
  if (rawText !== undefined) {
    data![index].rawText = rawText
  }
  if (steps !== undefined) {
    data![index].steps = steps
  }
  data![index].updatedAt = Date.now()

  const { success: writeOk, error: writeError } = writeRecipes(data!)
  if (!writeOk) {
    return res.status(500).json({ success: false, error: writeError })
  }

  res.json({ success: true, data: data![index] })
})

app.delete('/api/recipes/:id', (req, res) => {
  const id = req.params.id
  if (!id || id.trim().length === 0) {
    return res.status(400).json({ success: false, error: '无效的菜谱ID' })
  }

  const { data, error: readError } = readRecipes()
  if (readError) {
    return res.status(500).json({ success: false, error: readError })
  }

  const filtered = data!.filter(r => r.id !== id)

  if (filtered.length === data!.length) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }

  const { success: writeOk, error: writeError } = writeRecipes(filtered)
  if (!writeOk) {
    return res.status(500).json({ success: false, error: writeError })
  }

  res.json({ success: true })
})

app.post('/api/parse', (req, res) => {
  const validation = validateRecipeInput(req.body)
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error })
  }

  const { title, rawText } = req.body as { title?: string; rawText?: string }

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, error: '菜谱内容不能为空' })
  }

  const result = parseRecipeText(rawText)

  if (result.steps.length === 0) {
    return res.status(400).json({
      success: false,
      error: '未能解析出有效的步骤，请检查格式是否正确',
      warnings: result.warnings
    })
  }

  res.json({
    success: true,
    data: result.steps,
    warnings: result.warnings.length > 0 ? result.warnings : undefined
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ success: true, timestamp: Date.now() })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err.message)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

app.listen(PORT, () => {
  console.log(`🍳 回声食谱后端服务已启动: http://localhost:${PORT}`)
  console.log(`📁 数据存储位置: ${DATA_FILE}`)
})
