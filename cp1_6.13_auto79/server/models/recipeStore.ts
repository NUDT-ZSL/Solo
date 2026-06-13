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
    await (recipeStore as any).ensureIndex({ fieldName: 'created_at' })
    await (recipeStore as any).ensureIndex({ fieldName: 'category' })
    await (recipeStore as any).ensureIndex({ fieldName: 'author_id' })
    await (recipeStore as any).ensureIndex({ fieldName: '_searchText' })
    console.log('[RecipeDB] Indexes ensured successfully (created_at, category, author_id, _searchText)')
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
  _ingredientKeywords?: string[]
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[，。！？、；：""''（）\\/\\[\\]()【】!.,?;:'\"-]/g, ' ')
    .trim()
}

const extractKeywords = (ingredients: string[]): string[] => {
  const keywords: Set<string> = new Set()
  ingredients.forEach(ing => {
    const normalized = normalizeText(ing)
    const parts = normalized.split(/\s+/).filter(w => w.length >= 1)
    parts.forEach(p => keywords.add(p))

    if (normalized.length >= 2) {
      keywords.add(normalized.replace(/\s+/g, ''))
    }
  })
  return Array.from(keywords)
}

const buildSearchDocument = (recipe: Omit<Recipe, '_id' | 'likes_count' | 'created_at' | '_searchText' | '_ingredientKeywords'>): {
  _searchText: string
  _ingredientKeywords: string[]
} => {
  const titleNorm = normalizeText(recipe.title)
  const categoryNorm = normalizeText(recipe.category)
  const ingredientKeywords = extractKeywords(recipe.ingredients)

  const parts: string[] = []
  parts.push(`T:${titleNorm}`)
  parts.push(`C:${categoryNorm}`)
  parts.push(`I:${ingredientKeywords.join(' I:')}`)
  parts.push(`K:${ingredientKeywords.join(' ')}`)
  parts.push(`A:${normalizeText(recipe.author_name)}`)

  return {
    _searchText: parts.join(' || '),
    _ingredientKeywords: ingredientKeywords
  }
}

export const createRecipe = async (
  recipe: Omit<Recipe, '_id' | 'created_at' | 'likes_count' | '_searchText' | '_ingredientKeywords'>
): Promise<Recipe> => {
  const searchDoc = buildSearchDocument(recipe)
  const newRecipe: Recipe = {
    ...recipe,
    likes_count: 0,
    created_at: Date.now(),
    ...searchDoc
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
  const startTime = process.hrtime()
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return getLatestRecipes(limit)
  }

  const keywords = normalizedQuery.split(/\s+/).filter(Boolean)

  if (keywords.length === 0) {
    return getLatestRecipes(limit)
  }

  const exactMatchPromises = keywords.map(kw => {
    const kwClean = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      `I:${kwClean}`,
      `K:${kwClean}`,
      `T:${kwClean}`,
      `C:${kwClean}`,
      kwClean
    ]
    return { _searchText: new RegExp(patterns.join('|'), 'i') }
  })

  try {
    const docs = await recipeStore
      .find({ $and: exactMatchPromises })
      .sort({ created_at: -1 })
      .limit(limit)

    const elapsed = process.hrtime(startTime)
    const elapsedMs = elapsed[0] * 1000 + elapsed[1] / 1000000

    if (docs.length > 0) {
      console.log(`[Search] FAST index query="${query}" matches=${docs.length} time=${elapsedMs.toFixed(2)}ms`)
      return docs as Recipe[]
    }

    const fuzzyConditions = keywords.map(kw => {
      const kwClean = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return { _searchText: new RegExp(kwClean, 'i') }
    })

    const fuzzyDocs = await recipeStore
      .find({ $and: fuzzyConditions })
      .sort({ created_at: -1 })
      .limit(limit)

    const elapsed2 = process.hrtime(startTime)
    const elapsedMs2 = elapsed2[0] * 1000 + elapsed2[1] / 1000000

    console.log(`[Search] FALLBACK fuzzy query="${query}" matches=${fuzzyDocs.length} time=${elapsedMs2.toFixed(2)}ms`)
    return fuzzyDocs as Recipe[]

  } catch (err) {
    console.error('[Search] Full scan fallback, query:', query, 'error:', (err as Error).message)
    const allDocs = await recipeStore.find({}).sort({ created_at: -1 }).limit(limit * 2)
    const filtered = (allDocs as Recipe[]).filter(r => {
      const text = `${r.title} ${r.category} ${r.ingredients.join(' ')}`.toLowerCase()
      return keywords.every(kw => text.includes(kw.toLowerCase()))
    }).slice(0, limit)

    const elapsed = process.hrtime(startTime)
    const elapsedMs = elapsed[0] * 1000 + elapsed[1] / 1000000
    console.log(`[Search] FULL SCAN query="${query}" matches=${filtered.length} time=${elapsedMs.toFixed(2)}ms`)
    return filtered
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

export const reindexAllRecipes = async (): Promise<number> => {
  const all = await recipeStore.find({})
  let count = 0
  for (const doc of all) {
    const recipe = doc as Recipe
    const searchDoc = buildSearchDocument({
      title: recipe.title,
      cover_image: recipe.cover_image,
      category: recipe.category,
      ingredients: recipe.ingredients,
      steps_html: recipe.steps_html,
      cook_time_minutes: recipe.cook_time_minutes,
      author_id: recipe.author_id,
      author_name: recipe.author_name
    })
    await recipeStore.update(
      { _id: recipe._id },
      { $set: searchDoc },
      {}
    )
    count++
  }
  console.log(`[Reindex] Completed ${count} recipes`)
  return count
}

export default {
  createRecipe,
  getRecipes,
  getRecipeById,
  searchRecipes,
  getLatestRecipes,
  likeRecipe,
  getRecipesByAuthor,
  reindexAllRecipes
}
