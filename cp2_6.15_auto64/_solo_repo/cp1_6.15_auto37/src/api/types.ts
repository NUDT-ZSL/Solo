export interface FoodRecord {
  id: string;
  date: string;
  time: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  portion: number;
  portionUnit: string;
  calories: number;
  imageUrl?: string;
  nutrition: NutritionItem;
  createdAt: string;
}

export interface NutritionItem {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  vitaminC: number;
  calcium: number;
}

export interface NutritionSummary {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  vitaminC: number;
  calcium: number;
}

export interface DailyNutrition {
  date: string;
  nutrition: NutritionSummary;
}

export interface UserSettings {
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface Recommendations {
  daily: NutritionSummary;
  weekly: NutritionSummary;
}

export interface StatsResponse {
  weeklyTotal: NutritionSummary;
  weeklyRecommended: NutritionSummary;
  balanceScore: number;
  dailyData: DailyNutrition[];
}

export interface RecordsResponse {
  weekStart: string;
  weekEnd: string;
  records: FoodRecord[];
}

export const NUTRIENT_NAMES: Record<keyof NutritionSummary, string> = {
  protein: '蛋白质',
  carbs: '碳水化合物',
  fat: '脂肪',
  fiber: '膳食纤维',
  vitaminC: '维生素C',
  calcium: '钙',
};

export const NUTRIENT_UNITS: Record<keyof NutritionSummary, string> = {
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  fiber: 'g',
  vitaminC: 'mg',
  calcium: 'mg',
};

export const ACTIVITY_LEVEL_LABELS: Record<UserSettings['activityLevel'], string> = {
  sedentary: '久坐不动',
  light: '轻度活动',
  moderate: '中度活动',
  active: '高度活动',
  very_active: '极高活动',
};

export const MEAL_TYPE_LABELS: Record<FoodRecord['mealType'], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};
