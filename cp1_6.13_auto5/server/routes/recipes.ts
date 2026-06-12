import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { recipesDb, type Recipe } from '../database.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const recipes = await recipesDb.find<Recipe>({}).sort({ createdAt: -1 })
    res.json(recipes)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

router.post('/', async (req, res) => {
  try {
    const recipeData: Omit<Recipe, 'id' | 'createdAt'> = req.body
    const newRecipe: Recipe = {
      ...recipeData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }
    const inserted = await recipesDb.insert<Recipe>(newRecipe)
    res.status(201).json(inserted)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create recipe' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData: Partial<Recipe> = req.body
    const updated = await recipesDb.update<Recipe>(
      { id },
      { $set: updateData },
      { returnUpdatedDocs: true }
    )
    if (!updated) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update recipe' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const numRemoved = await recipesDb.remove({ id }, {})
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete recipe' })
  }
})

export default router
