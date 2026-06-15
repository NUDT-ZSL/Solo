import { Router, Request, Response } from 'express'
import {
  createRecipe,
  getRecipes,
  getRecipeById,
  searchRecipes,
  getLatestRecipes,
  likeRecipe,
  Recipe
} from '../models/recipeStore.js'
import { addUserHistory, getUserFullData } from '../models/userStore.js'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      cover_image,
      category,
      ingredients,
      steps_html,
      cook_time_minutes,
      author_id,
      author_name
    } = req.body

    if (!title || !category || !ingredients || !steps_html || !author_id || !author_name) {
      return res.status(400).json({ error: '缺少必填字段' })
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: '食材列表不能为空' })
    }

    const recipe = await createRecipe({
      title: String(title).trim(),
      cover_image: cover_image || '',
      category: String(category),
      ingredients: ingredients.map((i: string) => String(i).trim()).filter(Boolean),
      steps_html: String(steps_html),
      cook_time_minutes: Number(cook_time_minutes) || 0,
      author_id: String(author_id),
      author_name: String(author_name)
    })

    if (author_id) {
      await addUserHistory(author_id, recipe._id!, 'upload')
    }

    res.status(201).json(recipe)
  } catch (err) {
    console.error('Create recipe error:', err)
    res.status(500).json({ error: '创建食谱失败' })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100
    const recipes = await getRecipes(limit)
    res.json(recipes)
  } catch (err) {
    console.error('Get recipes error:', err)
    res.status(500).json({ error: '获取食谱列表失败' })
  }
})

router.get('/latest', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20
    const recipes = await getLatestRecipes(limit)
    res.json(recipes)
  } catch (err) {
    console.error('Get latest recipes error:', err)
    res.status(500).json({ error: '获取最新食谱失败' })
  }
})

router.get('/search', async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const query = req.query.query as string
    if (!query || !query.trim()) {
      return res.status(400).json({ error: '搜索关键词不能为空' })
    }
    const limit = Number(req.query.limit) || 50
    const recipes = await searchRecipes(query, limit)
    const elapsed = Date.now() - startTime
    console.log(`[Search] query="${query}" results=${recipes.length} time=${elapsed}ms`)
    res.json(recipes)
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ error: '搜索失败' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const recipe = await getRecipeById(id)
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' })
    }

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { getUserByToken } = await import('../models/userStore.js')
      const user = await getUserByToken(token)
      if (user) {
        await addUserHistory(user._id, id, 'view')
      }
    }

    res.json(recipe)
  } catch (err) {
    console.error('Get recipe by id error:', err)
    res.status(500).json({ error: '获取食谱详情失败' })
  }
})

router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const recipe = await likeRecipe(id)
    if (!recipe) {
      return res.status(404).json({ error: '食谱不存在' })
    }

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { getUserByToken } = await import('../models/userStore.js')
      const user = await getUserByToken(token)
      if (user) {
        await addUserHistory(user._id, id, 'like')
      }
    }

    res.json(recipe)
  } catch (err) {
    console.error('Like recipe error:', err)
    res.status(500).json({ error: '点赞失败' })
  }
})

router.get('/recommend/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const user = await getUserFullData(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const allRecipes = await getRecipes(100)

    res.json({
      preference_tags: user.preference_tags,
      history: user.history,
      liked_recipes: user.liked_recipes,
      recipes: allRecipes
    })
  } catch (err) {
    console.error('Recommend error:', err)
    res.status(500).json({ error: '获取推荐失败' })
  }
})

export default router
