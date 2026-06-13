import type { Recipe } from '../../server/models/recipeStore'
import type { UserHistory } from '../../server/models/userStore'

export interface UserProfile {
  preference_tags: string[]
  history: UserHistory[]
  liked_recipes: string[]
  uploaded_recipes: string[]
}

const INGREDIENT_WEIGHTS: Record<string, number> = {
  '猪肉': 2.5, '牛肉': 2.5, '羊肉': 2.5, '鸡肉': 2.5, '鸭肉': 2.5,
  '鱼': 2.8, '虾': 2.8, '蟹': 2.8, '海鲜': 2.8, '鲍鱼': 3.0,
  '鸡蛋': 1.5, '豆腐': 1.5, '米饭': 1.2, '面条': 1.2,
  '辣椒': 2.0, '花椒': 2.0, '麻辣': 2.2, '小米椒': 2.0,
  '糖': 1.8, '蜂蜜': 1.8, '冰糖': 1.8,
  '芝士': 2.2, '奶油': 2.2, '黄油': 2.2, '奶酪': 2.2,
  '葱': 1.0, '姜': 1.0, '蒜': 1.0, '香菜': 1.0,
  '蔬菜': 1.2, '青菜': 1.2, '西兰花': 1.3, '胡萝卜': 1.2,
  '土豆': 1.2, '番茄': 1.5, '茄子': 1.3, '黄瓜': 1.2,
  '酱油': 1.0, '盐': 0.8, '醋': 1.0, '料酒': 1.0,
  '川菜': 2.0, '粤菜': 2.0, '西餐': 2.0, '烘焙': 2.0,
  '清淡': 1.5, '辣': 2.0, '甜': 1.8, '咸鲜': 1.5, '酸': 1.5, '麻': 2.0
}

const PREFERENCE_TO_KEYWORDS: Record<string, string[]> = {
  '清淡': ['蔬菜', '豆腐', '鸡蛋', '黄瓜', '西兰花', '蘑菇', '青菜', '木耳', '清蒸', '白灼', '清炒'],
  '辣': ['辣椒', '花椒', '小米椒', '泡椒', '豆瓣酱', '辣椒油', '麻辣', '香辣', '川菜', '剁椒'],
  '甜': ['糖', '蜂蜜', '冰糖', '红枣', '枸杞', '南瓜', '红薯', '紫薯', '糖醋', '拔丝'],
  '咸鲜': ['酱油', '蚝油', '生抽', '蒸鱼豉油', '海鲜', '虾米', '鱼露', '虾', '鱼', '蟹'],
  '酸': ['醋', '柠檬', '番茄', '山楂', '酸豆角', '酸菜', '泡菜', '糖醋', '酸辣'],
  '麻': ['花椒', '藤椒', '麻椒', '芝麻油', '麻辣', '麻婆'],
  '香': ['葱', '姜', '蒜', '香菜', '八角', '桂皮', '香叶', '孜然', '五香', '红烧'],
  '川菜': ['辣椒', '花椒', '郫县豆瓣', '花椒粉', '老干妈', '麻辣', '水煮', '鱼香', '宫保'],
  '粤菜': ['海鲜', '虾', '鱼', '鸡', '鲍鱼', '干贝', '瑶柱', '清蒸', '白灼', '煲汤'],
  '西餐': ['芝士', '黄油', '奶油', '意面', '牛排', '培根', '橄榄油', '迷迭香', '黑椒', '罗勒'],
  '家常菜': ['猪肉', '鸡蛋', '土豆', '番茄', '青椒', '白菜', '豆腐', '米饭', '炒菜', '红烧'],
  '烘焙': ['面粉', '黄油', '鸡蛋', '牛奶', '糖', '酵母', '奶油奶酪', '可可', '抹茶', '烤箱']
}

const HISTORY_WEIGHTS: Record<UserHistory['action'], number> = {
  'view': 1.0,
  'like': 3.0,
  'upload': 5.0
}

const calculateIngredientIDF = (allRecipes: Recipe[]): Map<string, number> => {
  const docFreq = new Map<string, number>()
  const totalDocs = allRecipes.length

  allRecipes.forEach(recipe => {
    const seen = new Set<string>()
    recipe.ingredients.forEach(ing => {
      const norm = ing.toLowerCase().trim()
      if (norm.length >= 1 && !seen.has(norm)) {
        seen.add(norm)
        docFreq.set(norm, (docFreq.get(norm) || 0) + 1)
      }
    })
    if (recipe.category) {
      const catNorm = recipe.category.toLowerCase().trim()
      if (!seen.has(`cat:${catNorm}`)) {
        docFreq.set(`cat:${catNorm}`, (docFreq.get(`cat:${catNorm}`) || 0) + 1)
      }
    }
  })

  const idfMap = new Map<string, number>()
  docFreq.forEach((freq, term) => {
    idfMap.set(term, Math.log((1 + totalDocs) / (1 + freq)) + 1)
  })

  return idfMap
}

const getIngredientWeight = (ingredient: string, idfMap: Map<string, number>): number => {
  const norm = ingredient.toLowerCase().trim()
  let weight = idfMap.get(norm) || 1.0

  Object.entries(INGREDIENT_WEIGHTS).forEach(([kw, w]) => {
    if (norm.includes(kw.toLowerCase())) {
      weight *= w
    }
  })

  return weight
}

const buildPreferenceVector = (
  preferences: string[],
  idfMap: Map<string, number>
): Map<string, number> => {
  const vector = new Map<string, number>()

  preferences.forEach(pref => {
    const keywords = PREFERENCE_TO_KEYWORDS[pref] || [pref]
    const prefWeight = 2.0

    keywords.forEach(kw => {
      const normKw = kw.toLowerCase().trim()
      const idf = idfMap.get(normKw) || 1.0
      const baseWeight = vector.get(normKw) || 0
      vector.set(normKw, baseWeight + prefWeight * idf)
    })
  })

  return vector
}

const buildHistoryVector = (
  history: UserHistory[],
  likedRecipes: string[],
  uploadedRecipes: string[],
  allRecipes: Recipe[],
  idfMap: Map<string, number>
): Map<string, number> => {
  const vector = new Map<string, number>()
  const now = Date.now()

  history.forEach(h => {
    const recipe = allRecipes.find(r => r._id === h.recipe_id)
    if (!recipe) return

    const ageDays = (now - h.timestamp) / (1000 * 60 * 60 * 24)
    const decayFactor = Math.exp(-ageDays / 30)
    const actionWeight = HISTORY_WEIGHTS[h.action]

    recipe.ingredients.forEach(ing => {
      const norm = ing.toLowerCase().trim()
      const idf = idfMap.get(norm) || 1.0
      const existing = vector.get(norm) || 0
      vector.set(norm, existing + actionWeight * decayFactor * idf)
    })

    if (recipe.category) {
      const catNorm = `cat:${recipe.category.toLowerCase().trim()}`
      const catWeight = idfMap.get(catNorm) || 1.0
      const existing = vector.get(catNorm) || 0
      vector.set(catNorm, existing + actionWeight * decayFactor * catWeight * 1.5)
    }
  })

  likedRecipes.forEach(id => {
    const recipe = allRecipes.find(r => r._id === id)
    if (!recipe) return
    recipe.ingredients.forEach(ing => {
      const norm = ing.toLowerCase().trim()
      const idf = idfMap.get(norm) || 1.0
      const existing = vector.get(norm) || 0
      vector.set(norm, existing + 2.0 * idf)
    })
  })

  uploadedRecipes.forEach(id => {
    const recipe = allRecipes.find(r => r._id === id)
    if (!recipe) return
    recipe.ingredients.forEach(ing => {
      const norm = ing.toLowerCase().trim()
      const idf = idfMap.get(norm) || 1.0
      const existing = vector.get(norm) || 0
      vector.set(norm, existing + 3.0 * idf)
    })
  })

  return vector
}

const calculateRecipeScore = (
  recipe: Recipe,
  preferenceVector: Map<string, number>,
  historyVector: Map<string, number>,
  idfMap: Map<string, number>
): number => {
  let score = 0
  const matchedTerms: Set<string> = new Set()

  recipe.ingredients.forEach(ing => {
    const norm = ing.toLowerCase().trim()
    const weight = getIngredientWeight(norm, idfMap)

    if (preferenceVector.has(norm)) {
      score += preferenceVector.get(norm)! * weight
      matchedTerms.add(norm)
    }

    if (historyVector.has(norm)) {
      score += historyVector.get(norm)! * weight
      matchedTerms.add(`hist:${norm}`)
    }
  })

  if (recipe.category) {
    const catNorm = `cat:${recipe.category.toLowerCase().trim()}`
    if (preferenceVector.has(catNorm)) {
      score += preferenceVector.get(catNorm)! * 2.0
      matchedTerms.add(catNorm)
    }
    if (historyVector.has(catNorm)) {
      score += historyVector.get(catNorm)! * 2.0
    }
  }

  score += Math.min(recipe.likes_count * 0.05, 10)

  const recencyDays = (Date.now() - recipe.created_at) / (1000 * 60 * 60 * 24)
  if (recencyDays < 7) score += 8
  else if (recencyDays < 30) score += 4
  else if (recencyDays < 90) score += 2

  return score
}

export const recommendRecipes = (
  allRecipes: Recipe[],
  userProfile: UserProfile | null,
  isLoggedIn: boolean,
  limit: number = 20,
  excludeId?: string
): { recipes: Recipe[]; scores?: Map<string, number>; debug?: any } => {
  if (!isLoggedIn || !userProfile) {
    const latest = allRecipes
      .filter(r => !excludeId || r._id !== excludeId)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit)
    return { recipes: latest }
  }

  if (allRecipes.length === 0) {
    return { recipes: [] }
  }

  const idfMap = calculateIngredientIDF(allRecipes)

  const preferenceVector = buildPreferenceVector(userProfile.preference_tags || [], idfMap)
  const historyVector = buildHistoryVector(
    userProfile.history || [],
    userProfile.liked_recipes || [],
    userProfile.uploaded_recipes || [],
    allRecipes,
    idfMap
  )

  const hasUserData = preferenceVector.size > 0 || historyVector.size > 0

  if (!hasUserData) {
    const popular = allRecipes
      .filter(r => !excludeId || r._id !== excludeId)
      .sort((a, b) => b.likes_count - a.likes_count || b.created_at - a.created_at)
      .slice(0, limit)
    return { recipes: popular }
  }

  const scores = new Map<string, number>()
  const scored = allRecipes
    .filter(r => !excludeId || r._id !== excludeId)
    .map(recipe => {
      const score = calculateRecipeScore(recipe, preferenceVector, historyVector, idfMap)
      scores.set(recipe._id!, score)
      return { recipe, score }
    })
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score
      return b.recipe.created_at - a.recipe.created_at
    })

  return {
    recipes: scored.map(s => s.recipe).slice(0, limit),
    scores,
    debug: {
      preferenceSize: preferenceVector.size,
      historySize: historyVector.size,
      idfSize: idfMap.size,
      topScores: scored.slice(0, 5).map(s => ({ id: s.recipe._id, title: s.recipe.title, score: s.score.toFixed(2) }))
    }
  }
}

export const findSimilarRecipes = (
  targetRecipe: Recipe,
  allRecipes: Recipe[],
  limit: number = 4
): Recipe[] => {
  const targetIngredients = new Set(
    targetRecipe.ingredients.map(i => i.toLowerCase().trim())
  )

  return allRecipes
    .filter(r => r._id !== targetRecipe._id)
    .map(recipe => {
      let sharedCount = 0
      let weightedMatch = 0

      recipe.ingredients.forEach(ing => {
        const norm = ing.toLowerCase().trim()
        if (targetIngredients.has(norm)) {
          sharedCount++
          weightedMatch += INGREDIENT_WEIGHTS[norm] || 1.0
        }
      })

      if (recipe.category === targetRecipe.category) {
        weightedMatch += 2.0
        sharedCount += 1
      }

      return { recipe, sharedCount, weightedMatch }
    })
    .filter(item => item.sharedCount >= 2)
    .sort((a, b) => {
      if (b.weightedMatch !== a.weightedMatch) return b.weightedMatch - a.weightedMatch
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount
      return b.recipe.likes_count - a.recipe.likes_count
    })
    .map(item => item.recipe)
    .slice(0, limit)
}

export const categoryColors: Record<string, { bg: string; text: string }> = {
  '川菜': { bg: '#fee2e2', text: '#991b1b' },
  '粤菜': { bg: '#dbeafe', text: '#1e40af' },
  '西餐': { bg: '#ede9fe', text: '#5b21b6' },
  '家常菜': { bg: '#fef3c7', text: '#92400e' },
  '烘焙': { bg: '#fce7f3', text: '#9d174d' }
}

export const defaultCategories = ['川菜', '粤菜', '西餐', '家常菜', '烘焙']

export const defaultPreferences = ['清淡', '辣', '甜', '咸鲜', '酸', '麻', '香']

export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('recipeRadarToken')
}

export default {
  recommendRecipes,
  findSimilarRecipes,
  isLoggedIn,
  categoryColors,
  defaultCategories,
  defaultPreferences
}
