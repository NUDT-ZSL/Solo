import express from 'express'
import cors from 'cors'
import type { FoodItem, MealTemplate, DailyLog, UserGoals, MealType, WeeklyTrend } from '../src/types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const mealTemplates: MealTemplate[] = [
  {
    id: 'bf-1',
    name: '营养早餐套餐',
    type: 'breakfast',
    description: '燕麦粥配鸡蛋和水果',
    foods: [
      { id: 'f-1', name: '燕麦片', serving: '50g', calories: 190, protein: 6, carbs: 33, fat: 3.5 },
      { id: 'f-2', name: '水煮蛋', serving: '1个(50g)', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
      { id: 'f-3', name: '香蕉', serving: '1根(120g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    ],
  },
  {
    id: 'bf-2',
    name: '全麦三明治',
    type: 'breakfast',
    description: '全麦面包配火腿和生菜',
    foods: [
      { id: 'f-4', name: '全麦面包', serving: '2片(60g)', calories: 160, protein: 6, carbs: 28, fat: 3 },
      { id: 'f-5', name: '火腿片', serving: '2片(40g)', calories: 50, protein: 7, carbs: 1, fat: 2 },
      { id: 'f-6', name: '生菜番茄', serving: '50g', calories: 10, protein: 0.5, carbs: 2, fat: 0.1 },
    ],
  },
  {
    id: 'bf-3',
    name: '豆浆油条',
    type: 'breakfast',
    description: '经典中式早餐',
    foods: [
      { id: 'f-7', name: '豆浆', serving: '300ml', calories: 120, protein: 6, carbs: 10, fat: 5 },
      { id: 'f-8', name: '油条', serving: '1根(50g)', calories: 230, protein: 4, carbs: 25, fat: 13 },
    ],
  },
  {
    id: 'bf-4',
    name: '希腊酸奶碗',
    type: 'breakfast',
    description: '希腊酸奶配坚果和莓果',
    foods: [
      { id: 'f-9', name: '希腊酸奶', serving: '200g', calories: 100, protein: 18, carbs: 6, fat: 2 },
      { id: 'f-10', name: '混合坚果', serving: '20g', calories: 120, protein: 4, carbs: 5, fat: 10 },
      { id: 'f-11', name: '蓝莓', serving: '50g', calories: 30, protein: 0.5, carbs: 7, fat: 0.2 },
    ],
  },
  {
    id: 'ln-1',
    name: '鸡胸肉沙拉',
    type: 'lunch',
    description: '高蛋白低脂健康午餐',
    foods: [
      { id: 'f-12', name: '鸡胸肉', serving: '150g', calories: 165, protein: 31, carbs: 0, fat: 3.5 },
      { id: 'f-13', name: '混合生菜', serving: '150g', calories: 25, protein: 2, carbs: 4, fat: 0.5 },
      { id: 'f-14', name: '橄榄油醋汁', serving: '20g', calories: 160, protein: 0, carbs: 2, fat: 17 },
      { id: 'f-15', name: '樱桃番茄', serving: '100g', calories: 20, protein: 1, carbs: 4, fat: 0.2 },
    ],
  },
  {
    id: 'ln-2',
    name: '牛肉糙米饭',
    type: 'lunch',
    description: '营养均衡的中式午餐',
    foods: [
      { id: 'f-16', name: '糙米饭', serving: '200g', calories: 220, protein: 5, carbs: 46, fat: 2 },
      { id: 'f-17', name: '牛肉片', serving: '120g', calories: 250, protein: 26, carbs: 0, fat: 15 },
      { id: 'f-18', name: '西兰花', serving: '100g', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    ],
  },
  {
    id: 'ln-3',
    name: '三文鱼寿司卷',
    type: 'lunch',
    description: '日式轻食午餐',
    foods: [
      { id: 'f-19', name: '三文鱼寿司卷', serving: '6个(200g)', calories: 320, protein: 12, carbs: 40, fat: 12 },
      { id: 'f-20', name: '味增汤', serving: '200ml', calories: 40, protein: 3, carbs: 5, fat: 1.5 },
    ],
  },
  {
    id: 'ln-4',
    name: '素食三明治',
    type: 'lunch',
    description: '健康素食选择',
    foods: [
      { id: 'f-21', name: '全麦面包', serving: '2片(60g)', calories: 160, protein: 6, carbs: 28, fat: 3 },
      { id: 'f-22', name: '牛油果', serving: '半个(80g)', calories: 128, protein: 1.5, carbs: 5, fat: 12 },
      { id: 'f-23', name: '番茄生菜', serving: '80g', calories: 15, protein: 1, carbs: 3, fat: 0.2 },
      { id: 'f-24', name: '鹰嘴豆泥', serving: '50g', calories: 85, protein: 3.5, carbs: 10, fat: 4 },
    ],
  },
  {
    id: 'dn-1',
    name: '清蒸鱼配蔬菜',
    type: 'dinner',
    description: '低脂高蛋白晚餐',
    foods: [
      { id: 'f-25', name: '清蒸鲈鱼', serving: '150g', calories: 180, protein: 34, carbs: 0, fat: 5 },
      { id: 'f-26', name: '时蔬拼盘', serving: '200g', calories: 50, protein: 3, carbs: 10, fat: 0.5 },
      { id: 'f-27', name: '小米粥', serving: '200ml', calories: 92, protein: 2.5, carbs: 19, fat: 0.8 },
    ],
  },
  {
    id: 'dn-2',
    name: '番茄意面',
    type: 'dinner',
    description: '经典意式晚餐',
    foods: [
      { id: 'f-28', name: '意大利面', serving: '100g(干)', calories: 370, protein: 13, carbs: 73, fat: 2 },
      { id: 'f-29', name: '番茄肉酱', serving: '150g', calories: 220, protein: 15, carbs: 10, fat: 12 },
      { id: 'f-30', name: '帕玛森奶酪', serving: '10g', calories: 40, protein: 3.5, carbs: 0, fat: 3 },
    ],
  },
  {
    id: 'dn-3',
    name: '韩式拌饭',
    type: 'dinner',
    description: '营养丰富的韩式料理',
    foods: [
      { id: 'f-31', name: '白米饭', serving: '200g', calories: 260, protein: 5, carbs: 55, fat: 0.5 },
      { id: 'f-32', name: '牛肉末', serving: '80g', calories: 160, protein: 16, carbs: 0, fat: 10 },
      { id: 'f-33', name: '蔬菜什锦', serving: '150g', calories: 40, protein: 3, carbs: 8, fat: 0.5 },
      { id: 'f-34', name: '鸡蛋', serving: '1个(50g)', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
    ],
  },
  {
    id: 'dn-4',
    name: '蔬菜汤配烤鸡',
    type: 'dinner',
    description: '清淡营养的晚餐选择',
    foods: [
      { id: 'f-35', name: '烤鸡腿', serving: '120g', calories: 210, protein: 24, carbs: 0, fat: 12 },
      { id: 'f-36', name: '蔬菜汤', serving: '300ml', calories: 80, protein: 3, carbs: 12, fat: 2 },
      { id: 'f-37', name: '全麦面包', serving: '1片(30g)', calories: 80, protein: 3, carbs: 14, fat: 1.5 },
    ],
  },
  {
    id: 'sk-1',
    name: '水果拼盘',
    type: 'snack',
    description: '新鲜水果组合',
    foods: [
      { id: 'f-38', name: '苹果', serving: '1个(180g)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
      { id: 'f-39', name: '橙子', serving: '1个(140g)', calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
    ],
  },
  {
    id: 'sk-2',
    name: '能量蛋白棒',
    type: 'snack',
    description: '运动后快速补充',
    foods: [
      { id: 'f-40', name: '蛋白棒', serving: '1根(50g)', calories: 190, protein: 20, carbs: 18, fat: 5 },
    ],
  },
  {
    id: 'sk-3',
    name: '坚果拼盘',
    type: 'snack',
    description: '健康脂肪来源',
    foods: [
      { id: 'f-41', name: '混合坚果', serving: '30g', calories: 180, protein: 5, carbs: 8, fat: 15 },
    ],
  },
  {
    id: 'sk-4',
    name: '酸奶杯',
    type: 'snack',
    description: '益生菌健康零食',
    foods: [
      { id: 'f-42', name: '酸奶', serving: '150g', calories: 80, protein: 5, carbs: 10, fat: 2.5 },
      { id: 'f-43', name: '蜂蜜', serving: '10g', calories: 30, protein: 0, carbs: 8, fat: 0 },
    ],
  },
]

const today = new Date().toISOString().split('T')[0]

let dailyLog: DailyLog = {
  date: today,
  meals: {
    breakfast: [
      { id: 'f-1', name: '燕麦片', serving: '50g', calories: 190, protein: 6, carbs: 33, fat: 3.5 },
    ],
    lunch: [],
    dinner: [],
    snack: [],
  },
}

let userGoals: UserGoals = {
  age: 30,
  gender: 'male',
  height: 175,
  weight: 70,
  activityLevel: 1.55,
  bmr: 0,
  recommendedCalories: 0,
  recommendedProtein: 0,
  recommendedCarbs: 0,
  recommendedFat: 0,
}

function calculateBMR(goals: Omit<UserGoals, 'bmr' | 'recommendedCalories' | 'recommendedProtein' | 'recommendedCarbs' | 'recommendedFat'>): UserGoals {
  let bmr: number
  if (goals.gender === 'male') {
    bmr = 88.362 + (13.397 * goals.weight) + (4.799 * goals.height) - (5.677 * goals.age)
  } else {
    bmr = 447.593 + (9.247 * goals.weight) + (3.098 * goals.height) - (4.330 * goals.age)
  }
  
  const recommendedCalories = bmr * goals.activityLevel
  const recommendedProtein = goals.weight * 1.6
  const recommendedCarbs = goals.weight * 5
  const recommendedFat = goals.weight * 0.8
  
  return {
    ...goals,
    bmr: Math.round(bmr),
    recommendedCalories: Math.round(recommendedCalories),
    recommendedProtein: Math.round(recommendedProtein),
    recommendedCarbs: Math.round(recommendedCarbs),
    recommendedFat: Math.round(recommendedFat),
  }
}

userGoals = calculateBMR(userGoals)

function generateWeeklyTrend(currentDate: string, todayCalories: number): WeeklyTrend[] {
  const trend: WeeklyTrend[] = []
  const baseDate = new Date(currentDate)
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    if (i === 0) {
      trend.push({ date: dateStr, calories: todayCalories })
    } else {
      const baseCalories = userGoals.recommendedCalories || 2000
      const variance = (Math.random() - 0.5) * 600
      trend.push({ date: dateStr, calories: Math.round(baseCalories + variance) })
    }
  }
  
  return trend
}

function getDailyTotal(log: DailyLog): { calories: number; protein: number; carbs: number; fat: number } {
  const allFoods = [...log.meals.breakfast, ...log.meals.lunch, ...log.meals.dinner, ...log.meals.snack]
  return allFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

app.get('/api/templates', (req, res) => {
  res.json(mealTemplates)
})

app.get('/api/templates/:type', (req, res) => {
  const type = req.params.type as MealType
  const templates = mealTemplates.filter((t) => t.type === type)
  res.json(templates)
})

app.get('/api/log', (req, res) => {
  res.json(dailyLog)
})

app.post('/api/log', (req, res) => {
  const newLog = req.body as DailyLog
  dailyLog = { ...dailyLog, ...newLog, date: today }
  res.json(dailyLog)
})

app.post('/api/log/:mealType', (req, res) => {
  const mealType = req.params.mealType as MealType
  const foods = req.body.foods as FoodItem[]
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    return res.status(400).json({ error: 'Invalid meal type' })
  }
  
  const foodsWithMealType = foods.map((f) => ({ ...f, mealType }))
  dailyLog.meals[mealType] = [...dailyLog.meals[mealType], ...foodsWithMealType]
  
  res.json(dailyLog)
})

app.delete('/api/log/:mealType/:foodId', (req, res) => {
  const mealType = req.params.mealType as MealType
  const foodId = req.params.foodId
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
    return res.status(400).json({ error: 'Invalid meal type' })
  }
  
  dailyLog.meals[mealType] = dailyLog.meals[mealType].filter((f) => f.id !== foodId)
  res.json(dailyLog)
})

app.put('/api/log/move', (req, res) => {
  const { foodId, fromMeal, toMeal } = req.body as { foodId: string; fromMeal: MealType; toMeal: MealType }
  
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(fromMeal) ||
      !['breakfast', 'lunch', 'dinner', 'snack'].includes(toMeal)) {
    return res.status(400).json({ error: 'Invalid meal type' })
  }
  
  const foodIndex = dailyLog.meals[fromMeal].findIndex((f) => f.id === foodId)
  if (foodIndex === -1) {
    return res.status(404).json({ error: 'Food not found' })
  }
  
  const [food] = dailyLog.meals[fromMeal].splice(foodIndex, 1)
  food.mealType = toMeal
  dailyLog.meals[toMeal].push(food)
  
  res.json(dailyLog)
})

app.get('/api/goals', (req, res) => {
  res.json(userGoals)
})

app.put('/api/goals', (req, res) => {
  const goalsData = req.body as Omit<UserGoals, 'bmr' | 'recommendedCalories' | 'recommendedProtein' | 'recommendedCarbs' | 'recommendedFat'>
  userGoals = calculateBMR(goalsData)
  res.json(userGoals)
})

app.get('/api/trend/weekly', (req, res) => {
  const totals = getDailyTotal(dailyLog)
  const trend = generateWeeklyTrend(today, totals.calories)
  res.json(trend)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
