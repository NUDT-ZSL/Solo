import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { recipesDb, inventoryDb, shoppingListsDb, type Recipe, type Ingredient } from '../database.js'
import { generateRecommendations, generateShoppingListForRecipes } from '../services/recommendation.js'

const router = Router()

router.post('/generate', async (_req, res) => {
  try {
    const [recipes, inventory] = await Promise.all([
      recipesDb.find<Recipe>({}),
      inventoryDb.find<Ingredient>({}),
    ])

    const result = generateRecommendations(recipes, inventory)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { recipeIds, checkedIngredientIds = [] } = req.body

    const [recipes, inventory] = await Promise.all([
      recipesDb.find<Recipe>({}),
      inventoryDb.find<Ingredient>({}),
    ])

    const { items } = generateShoppingListForRecipes(
      recipeIds,
      recipes,
      inventory,
      checkedIngredientIds
    )

    const shoppingList = {
      id: uuidv4(),
      recipeIds,
      items,
      createdAt: new Date().toISOString(),
    }

    await shoppingListsDb.insert(shoppingList)
    res.json({ items })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create shopping list' })
  }
})

export default router
