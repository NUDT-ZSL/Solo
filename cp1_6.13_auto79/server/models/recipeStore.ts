import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/recipes.db')

const recipeStore = Datastore.create({
  filename: dbPath,
  autoload: true
})

export interface Recipe {
  _id?: string
  title: string
  cover: string
  category: string
  ingredients: string[]
  steps: string
  likes: number
  cookTime: number
  authorId: string
  authorName: string
  createdAt: number
}

export const createRecipe = async (recipe: Omit<Recipe, '_id' | 'createdAt' | 'likes'>): Promise<Recipe> => {
  const newRecipe: Recipe = {
    ...recipe,
    likes: 0,
    createdAt: Date.now()
  }
  const inserted = await recipeStore.insert(newRecipe)
  return inserted as Recipe
}

export const getRecipes = async (limit: number = 100): Promise<Recipe[]> => {
  const docs = await recipeStore.find({}).sort({ createdAt: -1 }).limit(limit)
  return docs as Recipe[]
}

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  const doc = await recipeStore.findOne({ _id: id })
  return doc as Recipe | null
}

export const searchRecipes = async (query: string, limit: number = 50): Promise<Recipe[]> => {
  const regex = new RegExp(query, 'i')
  const docs = await recipeStore.find({
    $or: [
      { ingredients: { $elemMatch: regex } },
      { title: regex },
      { category: regex }
    ]
  }).sort({ createdAt: -1 }).limit(limit)
  return docs as Recipe[]
}

export const getLatestRecipes = async (limit: number = 20): Promise<Recipe[]> => {
  const docs = await recipeStore.find({}).sort({ createdAt: -1 }).limit(limit)
  return docs as Recipe[]
}

export const likeRecipe = async (id: string): Promise<Recipe | null> => {
  const numAffected = await recipeStore.update({ _id: id }, { $inc: { likes: 1 } }, {})
  if (numAffected === 0) return null
  return await getRecipeById(id)
}

export default {
  createRecipe,
  getRecipes,
  getRecipeById,
  searchRecipes,
  getLatestRecipes,
  likeRecipe
}
