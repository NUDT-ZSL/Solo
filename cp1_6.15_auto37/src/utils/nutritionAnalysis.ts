import type { FoodRecord, NutritionSummary, DailyNutrition } from '../api/types';

export function calculateNutritionSummary(records: FoodRecord[]): NutritionSummary {
  return records.reduce(
    (acc, record) => ({
      protein: acc.protein + record.nutrition.protein,
      carbs: acc.carbs + record.nutrition.carbs,
      fat: acc.fat + record.nutrition.fat,
      fiber: acc.fiber + record.nutrition.fiber,
      vitaminC: acc.vitaminC + record.nutrition.vitaminC,
      calcium: acc.calcium + record.nutrition.calcium,
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0, vitaminC: 0, calcium: 0 }
  );
}

export function calculateDailyNutrition(records: FoodRecord[]): DailyNutrition[] {
  const groupedByDate = records.reduce<Record<string, FoodRecord[]>>((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = [];
    }
    acc[record.date].push(record);
    return acc;
  }, {});

  return Object.entries(groupedByDate)
    .map(([date, dayRecords]) => ({
      date,
      nutrition: calculateNutritionSummary(dayRecords),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateBalanceScore(
  total: NutritionSummary,
  recommended: NutritionSummary
): number {
  const nutrients: (keyof NutritionSummary)[] = [
    'protein',
    'carbs',
    'fat',
    'fiber',
    'vitaminC',
    'calcium',
  ];

  let totalDeviation = 0;

  nutrients.forEach((nutrient) => {
    const actual = total[nutrient];
    const target = recommended[nutrient];
    if (target > 0) {
      const ratio = actual / target;
      const deviation = Math.abs(ratio - 1);
      totalDeviation += Math.min(deviation, 1);
    }
  });

  const avgDeviation = totalDeviation / nutrients.length;
  const score = Math.round((1 - avgDeviation) * 100);

  return Math.max(0, Math.min(100, score));
}

export function calculateRecommendations(
  age: number,
  gender: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): NutritionSummary {
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    active: 1.3,
    very_active: 1.4,
  };

  const multiplier = activityMultipliers[activityLevel];
  const ageFactor = age < 30 ? 1.0 : age < 50 ? 0.95 : 0.9;

  const baseProtein = gender === 'male' ? 56 : 46;
  const baseCarbs = gender === 'male' ? 300 : 250;
  const baseFat = gender === 'male' ? 80 : 65;
  const baseFiber = 25;
  const baseVitaminC = 90;
  const baseCalcium = 1000;

  return {
    protein: Math.round(baseProtein * multiplier * ageFactor),
    carbs: Math.round(baseCarbs * multiplier * ageFactor),
    fat: Math.round(baseFat * multiplier * ageFactor),
    fiber: Math.round(baseFiber * multiplier * ageFactor),
    vitaminC: Math.round(baseVitaminC * multiplier * ageFactor),
    calcium: Math.round(baseCalcium * ageFactor),
  };
}

export function calculateWeeklyRecommendations(daily: NutritionSummary): NutritionSummary {
  return {
    protein: daily.protein * 7,
    carbs: daily.carbs * 7,
    fat: daily.fat * 7,
    fiber: daily.fiber * 7,
    vitaminC: daily.vitaminC * 7,
    calcium: daily.calcium * 7,
  };
}
