import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/recipes.db')

const recipeStore = Datastore.create({
  filename: dbPath,
  autoload: true
})

recipeStore.on('load', async () => {
  try {
    await (recipeStore as any).ensureIndex({ fieldName: 'createdAt' })
    await (recipeStore as any).ensureIndex({ fieldName: 'category' })
    await (recipeStore as any).ensureIndex({ fieldName: 'authorId' })
    await (recipeStore as any).ensureIndex({ fieldName: '_searchText' })
    console.log('[RecipeDB] Indexes ensured successfully')
  } catch (err) {
    console.warn('[RecipeDB] Index warning (safe to ignore on first run):', (err as Error).message)
  }
})

export interface Recipe {
  _id?: string
  title: string
  cover_image: string
  category: string
  ingredients: string[]
  steps_html: string
  likes_count: number
  cook_time_minutes: number
  author_id: string
  author_name: string
  created_at: number
  _searchText?: string
}

const buildSearchText = (recipe: Omit<Recipe, '_id' | 'likes_count' | 'created_at' | '_searchText'>): string => {
  const parts: string[] = []
  parts.push(recipe.title.toLowerCase())
  parts.push(recipe.category.toLowerCase())
  parts.push(recipe.ingredients.map(i => i.toLowerCase().trim()).join(' '))
  return parts.join(' | ')
}

export const createRecipe = async (
  recipe: Omit<Recipe, '_id' | 'created_at' | 'likes_count' | '_searchText'>
): Promise<Recipe> => {
  const newRecipe: Recipe = {
    ...recipe,
    likes_count: 0,
    created_at: Date.now(),
    _searchText: buildSearchText(recipe)
  }
  const inserted = await recipeStore.insert(newRecipe)
  return inserted as Recipe
}

export const getRecipes = async (limit: number = 100): Promise<Recipe[]> => {
  const docs = await recipeStore.find({}).sort({ created_at: -1 }).limit(limit)
  return docs as Recipe[]
}

export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  const doc = await recipeStore.findOne({ _id: id })
  return doc as Recipe | null
}

export const searchRecipes = async (query: string, limit: number = 50): Promise<Recipe[]> => {
  const keywords = query.toLowerCase().trim().split(/\s+/).filter(Boolean)

  if (keywords.length === 0) {
    return getLatestRecipes(limit)
  }

  const andConditions = keywords.map(kw => ({
    _searchText: new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }))

  try {
    const docs = await recipeStore
      .find({ $and: andConditions })
      .sort({ created_at: -1 })
      .limit(limit)
    return docs as Recipe[]
  } catch {
    const fallbackRegex = new RegExp(keywords.join('|'), 'i')
    const docs = await recipeStore
      .find({
        $or: [
          { ingredients: { $elemMatch: fallbackRegex } },
          { title: fallbackRegex },
          { category: fallbackRegex }
        ]
      })
      .sort({ created_at: -1 })
      .limit(limit)
    return docs as Recipe[]
  }
}

export const getLatestRecipes = async (limit: number = 20): Promise<Recipe[]> => {
  const docs = await recipeStore.find({}).sort({ created_at: -1 }).limit(limit)
  return docs as Recipe[]
}

export const likeRecipe = async (id: string): Promise<Recipe | null> => {
  const numAffected = await recipeStore.update({ _id: id }, { $inc: { likes_count: 1 } }, {})
  if (numAffected === 0) return null
  return await getRecipeById(id)
}

export const getRecipesByAuthor = async (authorId: string, limit: number = 50): Promise<Recipe[]> => {
  const docs = await recipeStore.find({ author_id: authorId }).sort({ created_at: -1 }).limit(limit)
  return docs as Recipe[]
}

export default {
  createRecipe,
  getRecipes,
  getRecipeById,
  searchRecipes,
  getLatestRecipes,
  likeRecipe,
  getRecipesByAuthor
}
