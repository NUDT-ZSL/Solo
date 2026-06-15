import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import type { Recipe, Ingredient, RecipeStep } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'kitchen.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '匿名',
      thumbnail TEXT,
      rating REAL DEFAULT 0,
      isFavorite INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '其他',
      pricePerUnit REAL,
      FOREIGN KEY (recipeId) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipeId INTEGER NOT NULL,
      orderNum INTEGER NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (recipeId) REFERENCES recipes(id)
    );
  `);
}

function assembleRecipes(
  recipeRows: any[],
  ingredientRows: any[],
  stepRows: any[],
): Recipe[] {
  const ingsByRecipe: Record<number, Ingredient[]> = {};
  ingredientRows.forEach((r) => {
    if (!ingsByRecipe[r.recipeId]) ingsByRecipe[r.recipeId] = [];
    ingsByRecipe[r.recipeId].push({
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
      category: r.category,
      pricePerUnit: r.pricePerUnit ?? undefined,
    });
  });

  const stepsByRecipe: Record<number, RecipeStep[]> = {};
  stepRows.forEach((r) => {
    if (!stepsByRecipe[r.recipeId]) stepsByRecipe[r.recipeId] = [];
    stepsByRecipe[r.recipeId].push({
      order: r.orderNum,
      description: r.description,
    });
  });

  return recipeRows.map((row) => ({
    id: row.id,
    name: row.name,
    author: row.author,
    thumbnail: row.thumbnail,
    rating: row.rating,
    isFavorite: row.isFavorite === 1,
    ingredients: ingsByRecipe[row.id] || [],
    steps: (stepsByRecipe[row.id] || []).sort((a, b) => a.order - b.order),
  }));
}

export function getAllRecipes(search?: string): Recipe[] {
  let recipeRows: any[];
  if (search) {
    recipeRows = db
      .prepare('SELECT * FROM recipes WHERE name LIKE ? ORDER BY id DESC')
      .all(`%${search}%`) as any[];
  } else {
    recipeRows = db.prepare('SELECT * FROM recipes ORDER BY id DESC').all() as any[];
  }

  if (recipeRows.length === 0) return [];

  const ids = recipeRows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');

  const ingredientRows = db
    .prepare(`SELECT * FROM ingredients WHERE recipeId IN (${placeholders})`)
    .all(...ids) as any[];
  const stepRows = db
    .prepare(`SELECT * FROM steps WHERE recipeId IN (${placeholders})`)
    .all(...ids) as any[];

  let recipes = assembleRecipes(recipeRows, ingredientRows, stepRows);

  if (search) {
    const kw = search.toLowerCase();
    const matchedIngredientRecipeIds = new Set<number>();
    ingredientRows.forEach((r) => {
      if (r.name.toLowerCase().includes(kw)) matchedIngredientRecipeIds.add(r.recipeId);
    });
    recipes = recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) || matchedIngredientRecipeIds.has(r.id),
    );
  }

  return recipes;
}

export function getRecipeById(id: number): Recipe | null {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!row) return null;

  const ingredientRows = db
    .prepare('SELECT * FROM ingredients WHERE recipeId = ?')
    .all(id) as any[];
  const stepRows = db
    .prepare('SELECT * FROM steps WHERE recipeId = ? ORDER BY orderNum')
    .all(id) as any[];

  return assembleRecipes([row], ingredientRows, stepRows)[0];
}

export function createRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO recipes (name, author, thumbnail, rating, isFavorite) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        recipe.name,
        recipe.author,
        recipe.thumbnail,
        recipe.rating,
        recipe.isFavorite ? 1 : 0,
      );
    const newId = Number(info.lastInsertRowid);

    const ingStmt = db.prepare(
      'INSERT INTO ingredients (recipeId, name, quantity, unit, category, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?)',
    );
    recipe.ingredients.forEach((ing) => {
      ingStmt.run(
        newId,
        ing.name,
        ing.quantity,
        ing.unit,
        ing.category,
        ing.pricePerUnit ?? null,
      );
    });

    const stepStmt = db.prepare(
      'INSERT INTO steps (recipeId, orderNum, description) VALUES (?, ?, ?)',
    );
    recipe.steps.forEach((s) => {
      stepStmt.run(newId, s.order, s.description);
    });

    return newId;
  });

  const newId = tx();
  return getRecipeById(newId) as Recipe;
}

export function updateRecipe(id: number, recipe: Partial<Recipe>): Recipe | null {
  const fields: string[] = [];
  const values: any[] = [];
  if (recipe.name !== undefined) {
    fields.push('name = ?');
    values.push(recipe.name);
  }
  if (recipe.author !== undefined) {
    fields.push('author = ?');
    values.push(recipe.author);
  }
  if (recipe.thumbnail !== undefined) {
    fields.push('thumbnail = ?');
    values.push(recipe.thumbnail);
  }
  if (recipe.rating !== undefined) {
    fields.push('rating = ?');
    values.push(recipe.rating);
  }
  if (recipe.isFavorite !== undefined) {
    fields.push('isFavorite = ?');
    values.push(recipe.isFavorite ? 1 : 0);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getRecipeById(id);
}

export function deleteRecipe(id: number): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM steps WHERE recipeId = ?').run(id);
    db.prepare('DELETE FROM ingredients WHERE recipeId = ?').run(id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  });
  tx();
}

export function aggregateIngredients(
  recipeIds: number[],
  scales: Record<number, number>,
): Array<{ name: string; quantity: number; unit: string; category: string; pricePerUnit: number }> {
  if (recipeIds.length === 0) return [];
  const placeholders = recipeIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM ingredients WHERE recipeId IN (${placeholders})`)
    .all(...recipeIds) as any[];

  const grouped: Record<
    string,
    { kg: number; ml: number; unit: string; category: string; pricePerUnit: number; names: string[] }
  > = {};

  rows.forEach((row) => {
    const scale = scales[row.recipeId] ?? 1;
    const key = row.name.toLowerCase();
    const conv = UNIT_CONVERSION[row.unit] || {};

    if (!grouped[key]) {
      grouped[key] = {
        kg: 0,
        ml: 0,
        unit: row.unit,
        category: row.category,
        pricePerUnit: row.pricePerUnit ?? 0,
        names: [],
      };
    }
    if (conv.toKg) {
      grouped[key].kg += row.quantity * conv.toKg * scale;
      grouped[key].unit = 'kg';
    } else if (conv.toMl) {
      grouped[key].ml += row.quantity * conv.toMl * scale;
      grouped[key].unit = 'ml';
    } else {
      grouped[key].kg += row.quantity * scale;
    }
    grouped[key].category = row.category;
    if (row.pricePerUnit) {
      grouped[key].pricePerUnit = row.pricePerUnit;
    }
    if (!grouped[key].names.includes(row.name)) {
      grouped[key].names.push(row.name);
    }
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
  const row = db.prepare('SELECT COUNT(*) as cnt FROM recipes').get() as any;
  if (row.cnt > 0) return;

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
