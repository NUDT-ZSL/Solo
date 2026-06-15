export interface FoodItem {
  id: string
  name: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
  mealType?: MealType
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealTemplate {
  id: string
  name: string
  type: MealType
  foods: FoodItem[]
  description: string
}

export interface DailyLog {
  date: string
  meals: {
    breakfast: FoodItem[]
    lunch: FoodItem[]
    dinner: FoodItem[]
    snack: FoodItem[]
  }
}

export interface UserGoals {
  age: number
  gender: 'male' | 'female'
  height: number
  weight: number
  activityLevel: number
  bmr: number
  recommendedCalories: number
  recommendedProtein: number
  recommendedCarbs: number
  recommendedFat: number
}

export interface WeeklyTrend {
  date: string
  calories: number
}
