import express, { Request, Response } from 'express'
import crypto from 'crypto'

const app = express()
const PORT = 3001

app.use(express.json())

interface RecipeIngredient {
  id: string
  name: string
  icon: string
  category: string
  calories: number
  protein: number
  fat: number
  carbs: number
  amount: number
}

interface NutritionSnapshot {
  totalCalories: number
  protein: number
  fat: number
  carbs: number
  proteinPercent: number
  fatPercent: number
  carbsPercent: number
}

interface Recipe {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number
  description: string
  ingredients: RecipeIngredient[]
  nutrition: NutritionSnapshot
  createdAt: number
}

const recipeStore = new Map<string, Recipe>()

const generateId = (): string => {
  return crypto.randomBytes(4).toString('hex')
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.post('/api/recipes', (req: Request, res: Response) => {
  try {
    const { name, difficulty, duration, description, ingredients, nutrition } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '菜谱名称不能为空' })
    }

    if (name.length > 30) {
      return res.status(400).json({ error: '菜谱名称不能超过30字' })
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: '难度等级无效' })
    }

    if (typeof duration !== 'number' || duration < 5 || duration > 120) {
      return res.status(400).json({ error: '烹饪时长必须在5-120分钟之间' })
    }

    if (description && description.length > 200) {
      return res.status(400).json({ error: '描述不能超过200字' })
    }

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: '食材列表格式无效' })
    }

    const id = generateId()
    const recipe: Recipe = {
      id,
      name: name.trim(),
      difficulty,
      duration,
      description: description || '',
      ingredients,
      nutrition,
      createdAt: Date.now()
    }

    recipeStore.set(id, recipe)
    return res.status(201).json({ id })
  } catch (err) {
    console.error('保存菜谱失败:', err)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const recipe = recipeStore.get(id)

    if (!recipe) {
      return res.status(404).json({ error: '菜谱不存在' })
    }

    return res.status(200).json(recipe)
  } catch (err) {
    console.error('获取菜谱失败:', err)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

app.get('/api/recipes', (_req: Request, res: Response) => {
  try {
    const recipes = Array.from(recipeStore.values()).sort((a, b) => b.createdAt - a.createdAt)
    return res.status(200).json(recipes)
  } catch (err) {
    console.error('获取菜谱列表失败:', err)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

app.listen(PORT, () => {
  console.log(`🍳 电子菜谱后端服务已启动: http://localhost:${PORT}`)
})

export default app
