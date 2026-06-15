import express from 'express';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { FoodRecord, UserSettings, NutritionSummary, StatsResponse, RecordsResponse } from './types';
import {
  calculateNutritionSummary,
  calculateDailyNutrition,
  calculateBalanceScore,
  calculateRecommendations,
  calculateWeeklyRecommendations,
} from '../utils/nutritionAnalysis.ts';
import { getWeekRange, formatDate } from '../utils/timeHelpers.ts';

const app = express();
const PORT = 3001;

app.use(express.json());

let records: FoodRecord[] = [];
let userSettings: UserSettings = {
  age: 28,
  gender: 'male',
  activityLevel: 'moderate',
};

function generateMockData() {
  const { startStr } = getWeekRange(0);
  const days = 7;
  const foods = [
    { name: '全麦面包', protein: 8, carbs: 40, fat: 3, fiber: 5, vitaminC: 0, calcium: 50, calories: 200 },
    { name: '鸡蛋', protein: 13, carbs: 1, fat: 10, fiber: 0, vitaminC: 0, calcium: 50, calories: 150 },
    { name: '牛奶', protein: 8, carbs: 12, fat: 8, fiber: 0, vitaminC: 2, calcium: 300, calories: 150 },
    { name: '鸡胸肉', protein: 31, carbs: 0, fat: 4, fiber: 0, vitaminC: 0, calcium: 10, calories: 165 },
    { name: '糙米饭', protein: 5, carbs: 45, fat: 1, fiber: 2, vitaminC: 0, calcium: 10, calories: 200 },
    { name: '西兰花', protein: 4, carbs: 7, fat: 0, fiber: 3, vitaminC: 80, calcium: 40, calories: 50 },
    { name: '苹果', protein: 0, carbs: 25, fat: 0, fiber: 5, vitaminC: 10, calcium: 10, calories: 100 },
    { name: '三文鱼', protein: 20, carbs: 0, fat: 13, fiber: 0, vitaminC: 0, calcium: 10, calories: 200 },
  ];
  const mealTypes: FoodRecord['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

  for (let day = 0; day < days; day++) {
    const date = new Date(startStr);
    date.setDate(date.getDate() + day);
    const dateStr = formatDate(date);
    const recordsPerDay = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < recordsPerDay; i++) {
      const food = foods[Math.floor(Math.random() * foods.length)];
      const mealType = mealTypes[Math.min(i, 3)];
      const hour = 7 + i * 4 + Math.floor(Math.random() * 2);
      const minute = Math.floor(Math.random() * 60);
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const portion = Math.random() > 0.5 ? 1 : 0.5;

      records.push({
        id: uuidv4(),
        date: dateStr,
        time,
        mealType,
        foodName: food.name,
        portion,
        portionUnit: '份',
        calories: Math.round(food.calories * portion),
        imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(`delicious ${food.name} food photography`)}&image_size=square`,
        nutrition: {
          protein: Math.round(food.protein * portion * 10) / 10,
          carbs: Math.round(food.carbs * portion * 10) / 10,
          fat: Math.round(food.fat * portion * 10) / 10,
          fiber: Math.round(food.fiber * portion * 10) / 10,
          vitaminC: Math.round(food.vitaminC * portion * 10) / 10,
          calcium: Math.round(food.calcium * portion * 10) / 10,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }
}

generateMockData();

app.get('/api/records', (req: Request, res: Response<RecordsResponse>) => {
  const weekOffset = parseInt(req.query.week as string) || 0;
  const { start, end, startStr, endStr } = getWeekRange(weekOffset);

  const weekRecords = records.filter((r) => {
    const recordDate = new Date(r.date);
    return recordDate >= start && recordDate <= end;
  });

  res.json({
    weekStart: startStr,
    weekEnd: endStr,
    records: weekRecords,
  });
});

app.post('/api/records', (req: Request, res: Response<FoodRecord>) => {
  const { date, time, mealType, foodName, portion, portionUnit, calories, imageUrl, nutrition } =
    req.body;

  const newRecord: FoodRecord = {
    id: uuidv4(),
    date,
    time,
    mealType,
    foodName,
    portion,
    portionUnit,
    calories,
    imageUrl,
    nutrition,
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);
  res.json(newRecord);
});

app.get('/api/stats', (req: Request, res: Response<StatsResponse>) => {
  const weekOffset = parseInt(req.query.week as string) || 0;
  const { start, end } = getWeekRange(weekOffset);

  const weekRecords = records.filter((r) => {
    const recordDate = new Date(r.date);
    return recordDate >= start && recordDate <= end;
  });

  const weeklyTotal = calculateNutritionSummary(weekRecords);
  const dailyData = calculateDailyNutrition(weekRecords);
  const dailyRecommended = calculateRecommendations(
    userSettings.age,
    userSettings.gender,
    userSettings.activityLevel
  );
  const weeklyRecommended = calculateWeeklyRecommendations(dailyRecommended);
  const balanceScore = calculateBalanceScore(weeklyTotal, weeklyRecommended);

  res.json({
    weeklyTotal,
    weeklyRecommended,
    balanceScore,
    dailyData,
  });
});

app.get('/api/recommendations', (_req: Request, res: Response<{ daily: NutritionSummary; weekly: NutritionSummary }>) => {
  const daily = calculateRecommendations(
    userSettings.age,
    userSettings.gender,
    userSettings.activityLevel
  );
  const weekly = calculateWeeklyRecommendations(daily);
  res.json({ daily, weekly });
});

app.post('/api/settings', (req: Request, res: Response<UserSettings>) => {
  const { age, gender, activityLevel } = req.body;
  userSettings = { age, gender, activityLevel };
  res.json(userSettings);
});

app.get('/api/settings', (_req: Request, res: Response<UserSettings>) => {
  res.json(userSettings);
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
