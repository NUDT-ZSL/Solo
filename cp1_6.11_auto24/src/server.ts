import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Recipe, RecipeStep } from './types'

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'recipes.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8')
}

const readRecipes = (): Recipe[] => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data) as Recipe[]
  } catch {
    return []
  }
}

const writeRecipes = (recipes: Recipe[]): void => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8')
}

const parseRecipeText = (text: string, title: string): RecipeStep[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const steps: RecipeStep[] = []
  const stepRegex = /^步骤?\s*(\d+)\s*[:：.\-、]\s*(.*)$/i
  const durationRegex = /(\d+(?:\.\d+)?)\s*(分钟|分|min|秒|s|sec)/i
  const ingredientRegex = /加入\s*([^，,。；;]+?)(?=\s*[,，。；;]|$)/g

  let stepNumber = 0

  for (const line of lines) {
    const trimmed = line.trim()
    let match = trimmed.match(stepRegex)

    let currentStepNumber: number
    let actionText: string

    if (match) {
      currentStepNumber = parseInt(match[1], 10)
      actionText = match[2].trim()
      stepNumber = currentStepNumber
    } else {
      if (!trimmed) continue
      stepNumber++
      currentStepNumber = stepNumber
      actionText = trimmed
    }

    const durationMatch = actionText.match(durationRegex)
    let duration = 0
    if (durationMatch) {
      const value = parseFloat(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      if (unit === '秒' || unit === 's' || unit === 'sec') {
        duration = Math.round(value)
      } else {
        duration = Math.round(value * 60)
      }
    }

    const ingredients: string[] = []
    let ingredientMatch: RegExpExecArray | null
    while ((ingredientMatch = ingredientRegex.exec(actionText)) !== null) {
      const ingStr = ingredientMatch[1].trim()
      const parts = ingStr.split(/[和与、,\s]+/).filter(p => p.trim())
      ingredients.push(...parts)
    }

    steps.push({
      id: uuidv4(),
      stepNumber: currentStepNumber,
      action: actionText.replace(durationRegex, '').replace(/[。；;]\s*$/, '').trim(),
      duration,
      ingredients,
      detail: actionText,
      imageUrl: '',
      status: 'pending'
    })
  }

  return steps
}

app.get('/api/recipes', (_req, res) => {
  const recipes = readRecipes()
  res.json({ success: true, data: recipes })
})

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readRecipes()
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }
  res.json({ success: true, data: recipe })
})

app.post('/api/recipes', (req, res) => {
  const { title, rawText } = req.body as { title?: string; rawText?: string }

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, error: '菜谱内容不能为空' })
  }

  const steps = parseRecipeText(rawText, title || '未命名菜谱')

  if (steps.length === 0) {
    return res.status(400).json({ success: false, error: '未能解析出有效的步骤' })
  }

  const recipe: Recipe = {
    id: uuidv4(),
    title: title || '我的菜谱',
    rawText,
    steps,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  const recipes = readRecipes()
  recipes.unshift(recipe)
  writeRecipes(recipes)

  res.status(201).json({ success: true, data: recipe })
})

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readRecipes()
  const index = recipes.findIndex(r => r.id === req.params.id)

  if (index === -1) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }

  const { title, rawText, steps } = req.body as Partial<Recipe>

  if (title !== undefined) {
    recipes[index].title = title
  }
  if (rawText !== undefined) {
    recipes[index].rawText = rawText
  }
  if (steps !== undefined) {
    recipes[index].steps = steps
  }
  recipes[index].updatedAt = Date.now()

  writeRecipes(recipes)
  res.json({ success: true, data: recipes[index] })
})

app.delete('/api/recipes/:id', (req, res) => {
  const recipes = readRecipes()
  const filtered = recipes.filter(r => r.id !== req.params.id)

  if (filtered.length === recipes.length) {
    return res.status(404).json({ success: false, error: '菜谱不存在' })
  }

  writeRecipes(filtered)
  res.json({ success: true })
})

app.post('/api/parse', (req, res) => {
  const { title, rawText } = req.body as { title?: string; rawText?: string }

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, error: '菜谱内容不能为空' })
  }

  const steps = parseRecipeText(rawText, title || '未命名菜谱')

  if (steps.length === 0) {
    return res.status(400).json({ success: false, error: '未能解析出有效的步骤，请检查格式是否正确' })
  }

  res.json({ success: true, data: steps })
})

app.get('/api/health', (_req, res) => {
  res.json({ success: true, timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`🍳 回声食谱后端服务已启动: http://localhost:${PORT}`)
  console.log(`📁 数据存储位置: ${DATA_FILE}`)
})
