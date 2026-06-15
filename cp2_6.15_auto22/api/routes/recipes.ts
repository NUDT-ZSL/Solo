import { Router, type Request, type Response } from 'express'
import { createRecipe, getAllRecipes } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const recipes = getAllRecipes()
    res.json(recipes)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, aromas } = req.body as {
      name: string
      aromas: { aromaId: number; ratio: number }[]
    }
    if (!name || !aromas || !Array.isArray(aromas) || aromas.length === 0) {
      res.status(400).json({ error: 'name and aromas array are required' })
      return
    }
    const id = createRecipe(name, aromas)
    res.status(201).json({ id, name, aromas })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save recipe' })
  }
})

export default router
