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

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, cover, category, ingredients, steps, cookTime, authorId, authorName } = req.body

    if (!title || !category || !ingredients || !steps || !authorId || !authorName) {
      return res.status(400).json({ error: '缺少必填字段' })
    }

    const recipe = await createRecipe({
      title,
      cover: cover || '',
      category,
      ingredients,
      steps,
      cookTime: Number(cookTime) || 0,
      authorId,
      authorName
    })

    res.status(201).json(recipe)
  } catch (err) {
    res.status(500).json({ error: '创建食谱失败' })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100
    const recipes = await getRecipes(limit)
    res.json(recipes)
  } catch (err) {
    res.status(500).json({ error: '获取食谱列表失败' })
  }
})

router.get('/latest', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20
    const recipes = await getLatestRecipes(limit)
    res.json(recipes)
  } catch (err) {
    res.status(500).json({ error: '获取最新食谱失败' })
  }
})

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string
    if (!query) {
      return res.status(400).json({ error: '搜索关键词不能为空' })
    }
    const limit = Number(req.query.limit) || 50
    const recipes = await searchRecipes(query, limit)
    res.json(recipes)
  } catch (err) {
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
    res.json(recipe)
  } catch (err) {
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
    res.json(recipe)
  } catch (err) {
    res.status(500).json({ error: '点赞失败' })
  }
})

export default router
