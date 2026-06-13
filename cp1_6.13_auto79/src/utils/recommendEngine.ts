import type { Recipe } from '../../server/models/recipeStore'

const preferenceToIngredients: Record<string, string[]> = {
  '清淡': ['蔬菜', '豆腐', '鸡蛋', '黄瓜', '西兰花', '蘑菇', '青菜', '木耳'],
  '辣': ['辣椒', '花椒', '小米椒', '泡椒', '豆瓣酱', '辣椒油', '芥末'],
  '甜': ['糖', '蜂蜜', '冰糖', '红枣', '枸杞', '南瓜', '红薯', '紫薯'],
  '咸鲜': ['酱油', '盐', '蚝油', '生抽', '蒸鱼豉油', '海鲜', '虾米', '鱼露'],
  '酸': ['醋', '柠檬', '番茄', '山楂', '酸豆角', '酸菜', '泡菜'],
  '麻': ['花椒', '藤椒', '麻椒', '芝麻油'],
  '香': ['葱', '姜', '蒜', '香菜', '八角', '桂皮', '香叶', '孜然'],
  '川菜': ['辣椒', '花椒', '郫县豆瓣', '花椒粉', '老干妈'],
  '粤菜': ['海鲜', '虾', '鱼', '鸡', '鲍鱼', '干贝', '瑶柱'],
  '西餐': ['芝士', '黄油', '奶油', '意面', '牛排', '培根', '橄榄油', '迷迭香'],
  '家常菜': ['猪肉', '鸡蛋', '土豆', '番茄', '青椒', '白菜', '豆腐', '米饭'],
  '烘焙': ['面粉', '黄油', '鸡蛋', '牛奶', '糖', '酵母', '奶油奶酪']
}

export const calculateMatchScore = (preferences: string[], recipe: Recipe): number => {
  if (!preferences || preferences.length === 0) return 0

  let score = 0
  const matchedKeywords: Set<string> = new Set()

  preferences.forEach(pref => {
    const relatedIngredients = preferenceToIngredients[pref] || []

    relatedIngredients.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase()
      recipe.ingredients.forEach(ing => {
        if (ing.toLowerCase().includes(lowerKeyword) && !matchedKeywords.has(lowerKeyword)) {
          matchedKeywords.add(lowerKeyword)
          score += 10
        }
      })

      if (recipe.category && recipe.category.toLowerCase().includes(lowerKeyword) && !matchedKeywords.has(`cat-${lowerKeyword}`)) {
        matchedKeywords.add(`cat-${lowerKeyword}`)
        score += 5
      }

      if (recipe.title && recipe.title.toLowerCase().includes(lowerKeyword) && !matchedKeywords.has(`title-${lowerKeyword}`)) {
        matchedKeywords.add(`title-${lowerKeyword}`)
        score += 3
      }
    })

    if (recipe.category === pref) {
      score += 15
    }
  })

  score += Math.min(recipe.likes * 0.1, 10)

  const recencyDays = (Date.now() - recipe.createdAt) / (1000 * 60 * 60 * 24)
  if (recencyDays < 7) score += 10
  else if (recencyDays < 30) score += 5

  return score
}

export const recommendRecipes = (
  allRecipes: Recipe[],
  userPreferences: string[],
  limit: number = 20,
  excludeId?: string
): Recipe[] => {
  if (!userPreferences || userPreferences.length === 0) {
    return allRecipes
      .filter(r => !excludeId || r._id !== excludeId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }

  return allRecipes
    .filter(r => !excludeId || r._id !== excludeId)
    .map(recipe => ({
      recipe,
      score: calculateMatchScore(userPreferences, recipe)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.recipe.createdAt - a.recipe.createdAt
    })
    .map(item => item.recipe)
    .slice(0, limit)
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
      const sharedCount = recipe.ingredients.filter(ing =>
        targetIngredients.has(ing.toLowerCase().trim())
      ).length
      return { recipe, sharedCount }
    })
    .filter(item => item.sharedCount >= 2)
    .sort((a, b) => {
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount
      return b.recipe.likes - a.recipe.likes
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
