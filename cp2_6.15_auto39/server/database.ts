import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { Recipe, Ingredient, RecipeStep } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', 'kitchen-data.json');

const UNIT_CONVERSION: Record<string, { toKg?: number; toMl?: number }> = {
  g: { toKg: 0.001 },
  kg: { toKg: 1 },
  mg: { toKg: 0.000001 },
  ml: { toMl: 1 },
  l: { toMl: 1000 },
  个: {},
  只: {},
  片: {},
  勺: { toMl: 15 },
  茶匙: { toMl: 5 },
  杯: { toMl: 240 },
};

interface StoredData {
  nextId: number;
  recipes: Recipe[];
}

let data: StoredData = {
  nextId: 1,
  recipes: [],
};

function saveData() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // ignore write errors for demo
  }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      data = JSON.parse(raw);
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export function initDatabase(): void {
  loadData();
}

export function getAllRecipes(search?: string): Recipe[] {
  let list = [...data.recipes].sort((a, b) => b.id - a.id);
  if (search) {
    const kw = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(kw)),
    );
  }
  return list;
}

export function getRecipeById(id: number): Recipe | null {
  return data.recipes.find((r) => r.id === id) || null;
}

export function createRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
  const newId = data.nextId++;
  const newRecipe: Recipe = {
    ...recipe,
    id: newId,
    ingredients: recipe.ingredients.map((ing, idx) => ({ ...ing, id: newId * 1000 + idx })),
    steps: [...recipe.steps],
  };
  data.recipes.push(newRecipe);
  saveData();
  return newRecipe;
}

export function updateRecipe(id: number, recipe: Partial<Recipe>): Recipe | null {
  const idx = data.recipes.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  data.recipes[idx] = { ...data.recipes[idx], ...recipe };
  saveData();
  return data.recipes[idx];
}

export function deleteRecipe(id: number): void {
  data.recipes = data.recipes.filter((r) => r.id !== id);
  saveData();
}

export function aggregateIngredients(
  recipeIds: number[],
  scales: Record<number, number>,
): Array<{ name: string; quantity: number; unit: string; category: string; pricePerUnit: number }> {
  if (recipeIds.length === 0) return [];

  const selected = data.recipes.filter((r) => recipeIds.includes(r.id));

  const grouped: Record<
    string,
    { kg: number; ml: number; unit: string; category: string; pricePerUnit: number; names: string[] }
  > = {};

  selected.forEach((recipe) => {
    const scale = scales[recipe.id] ?? 1;
    recipe.ingredients.forEach((ing) => {
      const key = ing.name.toLowerCase();
      const conv = UNIT_CONVERSION[ing.unit] || {};

      if (!grouped[key]) {
        grouped[key] = {
          kg: 0,
          ml: 0,
          unit: ing.unit,
          category: ing.category,
          pricePerUnit: ing.pricePerUnit ?? 0,
          names: [],
        };
      }
      if (conv.toKg) {
        grouped[key].kg += ing.quantity * conv.toKg * scale;
        grouped[key].unit = 'kg';
      } else if (conv.toMl) {
        grouped[key].ml += ing.quantity * conv.toMl * scale;
        grouped[key].unit = 'ml';
      } else {
        grouped[key].kg += ing.quantity * scale;
      }
      grouped[key].category = ing.category;
      if (ing.pricePerUnit) {
        grouped[key].pricePerUnit = ing.pricePerUnit;
      }
      if (!grouped[key].names.includes(ing.name)) {
        grouped[key].names.push(ing.name);
      }
    });
  });

  return Object.entries(grouped).map(([key, v]) => ({
    name: v.names[0] || key,
    quantity: v.unit === 'ml' ? Number(v.ml.toFixed(2)) : Number(v.kg.toFixed(3)),
    unit: v.unit,
    category: v.category,
    pricePerUnit: v.pricePerUnit,
  }));
}

export function seedSampleData(): void {
  if (data.recipes.length > 0) return;

  const samples: Omit<Recipe, 'id'>[] = [
    {
      name: '番茄炒蛋',
      author: '美食博主小王',
      thumbnail:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20egg%20stir%20fry%20chinese%20dish%20delicious&image_size=square',
      rating: 4.5,
      isFavorite: true,
      ingredients: [
        { id: 0, name: '番茄', quantity: 300, unit: 'g', category: '蔬菜', pricePerUnit: 8 },
        { id: 0, name: '鸡蛋', quantity: 3, unit: '个', category: '蛋类', pricePerUnit: 2 },
        { id: 0, name: '葱花', quantity: 10, unit: 'g', category: '调料', pricePerUnit: 20 },
        { id: 0, name: '盐', quantity: 3, unit: 'g', category: '调料', pricePerUnit: 5 },
        { id: 0, name: '食用油', quantity: 20, unit: 'ml', category: '调料', pricePerUnit: 20 },
      ],
      steps: [
        { order: 1, description: '番茄切块，鸡蛋打散备用' },
        { order: 2, description: '热锅下油，倒入蛋液快速翻炒至凝固盛出' },
        { order: 3, description: '锅中加油，放入番茄块炒出汁水' },
        { order: 4, description: '加入炒好的鸡蛋，加盐调味，撒上葱花即可' },
      ],
    },
    {
      name: '红烧肉',
      author: '大厨张三',
      thumbnail:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20chinese%20hong%20shao%20rou&image_size=square',
      rating: 5,
      isFavorite: false,
      ingredients: [
        { id: 0, name: '五花肉', quantity: 500, unit: 'g', category: '肉类', pricePerUnit: 45 },
        { id: 0, name: '生抽', quantity: 30, unit: 'ml', category: '调料', pricePerUnit: 15 },
        { id: 0, name: '老抽', quantity: 15, unit: 'ml', category: '调料', pricePerUnit: 18 },
        { id: 0, name: '冰糖', quantity: 30, unit: 'g', category: '调料', pricePerUnit: 12 },
        { id: 0, name: '八角', quantity: 2, unit: '个', category: '调料', pricePerUnit: 1 },
        { id: 0, name: '姜', quantity: 20, unit: 'g', category: '调料', pricePerUnit: 15 },
      ],
      steps: [
        { order: 1, description: '五花肉切块，冷水下锅焯水去血沫' },
        { order: 2, description: '锅中放少许油，加冰糖小火炒出糖色' },
        { order: 3, description: '放入五花肉翻炒上色，加生抽老抽' },
        { order: 4, description: '加水没过肉，放八角姜片，大火烧开转小火炖1小时' },
        { order: 5, description: '大火收汁即可出锅' },
      ],
    },
    {
      name: '蒜蓉西兰花',
      author: '健康厨房',
      thumbnail:
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=garlic%20broccoli%20healthy%20vegetable%20dish&image_size=square',
      rating: 4,
      isFavorite: true,
      ingredients: [
        { id: 0, name: '西兰花', quantity: 400, unit: 'g', category: '蔬菜', pricePerUnit: 10 },
        { id: 0, name: '大蒜', quantity: 20, unit: 'g', category: '调料', pricePerUnit: 12 },
        { id: 0, name: '盐', quantity: 3, unit: 'g', category: '调料', pricePerUnit: 5 },
        { id: 0, name: '食用油', quantity: 15, unit: 'ml', category: '调料', pricePerUnit: 20 },
      ],
      steps: [
        { order: 1, description: '西兰花切小朵，盐水浸泡10分钟后洗净' },
        { order: 2, description: '锅中烧开水，加少许盐和油，西兰花焯水1分钟捞出' },
        { order: 3, description: '热锅下油，爆香蒜末' },
        { order: 4, description: '倒入西兰花快速翻炒，加盐调味即可' },
      ],
    },
  ];

  samples.forEach((s) => createRecipe(s));
}
