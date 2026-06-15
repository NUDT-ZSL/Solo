import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import type { Recipe, Ingredient, RecipeStep } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'kitchen.db');

const db = new sqlite3.Database(DB_PATH);

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

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '匿名',
        thumbnail TEXT,
        rating REAL DEFAULT 0,
        isFavorite INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipeId INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '其他',
        pricePerUnit REAL,
        FOREIGN KEY (recipeId) REFERENCES recipes(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipeId INTEGER NOT NULL,
        orderNum INTEGER NOT NULL,
        description TEXT NOT NULL,
        FOREIGN KEY (recipeId) REFERENCES recipes(id)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function rowToRecipe(row: any, ingredients: Ingredient[], steps: RecipeStep[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    thumbnail: row.thumbnail,
    rating: row.rating,
    isFavorite: row.isFavorite === 1,
    ingredients,
    steps: steps.sort((a, b) => a.order - b.order),
  };
}

export function getAllRecipes(search?: string): Promise<Recipe[]> {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM recipes';
    const params: any[] = [];
    if (search) {
      sql += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY id DESC';

    db.all(sql, params, (err, recipeRows: any[]) => {
      if (err) return reject(err);
      if (recipeRows.length === 0) return resolve([]);

      const ids = recipeRows.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(',');

      db.all(
        `SELECT * FROM ingredients WHERE recipeId IN (${placeholders})`,
        ids,
        (err2, ingRows: any[]) => {
          if (err2) return reject(err2);

          db.all(
            `SELECT * FROM steps WHERE recipeId IN (${placeholders})`,
            ids,
            (err3, stepRows: any[]) => {
              if (err3) return reject(err3);

              const ingsByRecipe: Record<number, Ingredient[]> = {};
              ingRows.forEach((r) => {
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

              if (search) {
                const matchedIds = new Set<number>();
                ingRows.forEach((r) => {
                  if (r.name.includes(search)) matchedIds.add(r.recipeId);
                });
                recipeRows = recipeRows.filter(
                  (r) => r.name.includes(search) || matchedIds.has(r.id),
                );
              }

              resolve(
                recipeRows.map((r) =>
                  rowToRecipe(r, ingsByRecipe[r.id] || [], stepsByRecipe[r.id] || []),
                ),
              );
            },
          );
        },
      );
    });
  });
}

export function getRecipeById(id: number): Promise<Recipe | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row: any) => {
      if (err) return reject(err);
      if (!row) return resolve(null);

      db.all(
        'SELECT * FROM ingredients WHERE recipeId = ?',
        [id],
        (err2, ingRows: any[]) => {
          if (err2) return reject(err2);

          db.all(
            'SELECT * FROM steps WHERE recipeId = ? ORDER BY orderNum',
            [id],
            (err3, stepRows: any[]) => {
              if (err3) return reject(err3);

              resolve(
                rowToRecipe(
                  row,
                  ingRows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    quantity: r.quantity,
                    unit: r.unit,
                    category: r.category,
                    pricePerUnit: r.pricePerUnit ?? undefined,
                  })),
                  stepRows.map((r) => ({ order: r.orderNum, description: r.description })),
                ),
              );
            },
          );
        },
      );
    });
  });
}

export function createRecipe(
  recipe: Omit<Recipe, 'id'>,
): Promise<Recipe> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO recipes (name, author, thumbnail, rating, isFavorite) VALUES (?, ?, ?, ?, ?)',
      [
        recipe.name,
        recipe.author,
        recipe.thumbnail,
        recipe.rating,
        recipe.isFavorite ? 1 : 0,
      ],
      function (err) {
        if (err) return reject(err);
        const newId = (this as any).lastID;

        const stmt = db.prepare(
          'INSERT INTO ingredients (recipeId, name, quantity, unit, category, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?)',
        );
        recipe.ingredients.forEach((ing) => {
          stmt.run([newId, ing.name, ing.quantity, ing.unit, ing.category, ing.pricePerUnit ?? null]);
        });
        stmt.finalize();

        const stepStmt = db.prepare(
          'INSERT INTO steps (recipeId, orderNum, description) VALUES (?, ?, ?)',
        );
        recipe.steps.forEach((s) => {
          stepStmt.run([newId, s.order, s.description]);
        });
        stepStmt.finalize((e) => {
          if (e) return reject(e);
          getRecipeById(newId).then((r) => resolve(r as Recipe));
        });
      },
    );
  });
}

export function updateRecipe(id: number, recipe: Partial<Recipe>): Promise<Recipe | null> {
  return new Promise((resolve, reject) => {
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
    if (fields.length === 0) {
      return getRecipeById(id).then(resolve);
    }
    values.push(id);
    db.run(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
      if (err) return reject(err);
      getRecipeById(id).then(resolve);
    });
  });
}

export function deleteRecipe(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM steps WHERE recipeId = ?', [id], (err) => {
      if (err) return reject(err);
      db.run('DELETE FROM ingredients WHERE recipeId = ?', [id], (err2) => {
        if (err2) return reject(err2);
        db.run('DELETE FROM recipes WHERE id = ?', [id], (err3) => {
          if (err3) reject(err3);
          else resolve();
        });
      });
    });
  });
}

export function aggregateIngredients(
  recipeIds: number[],
  scales: Record<number, number>,
): Promise<Array<{ name: string; quantity: number; unit: string; category: string; pricePerUnit: number }>> {
  return new Promise((resolve, reject) => {
    if (recipeIds.length === 0) return resolve([]);
    const placeholders = recipeIds.map(() => '?').join(',');

    db.all(
      `SELECT * FROM ingredients WHERE recipeId IN (${placeholders})`,
      recipeIds,
      (err, rows: any[]) => {
        if (err) return reject(err);

        const grouped: Record<string, { kg: number; ml: number; unit: string; category: string; pricePerUnit: number; count: number; names: string[] }> = {};

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
              count: 0,
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
          grouped[key].count++;
          if (!grouped[key].names.includes(row.name)) {
            grouped[key].names.push(row.name);
          }
        });

        const result = Object.entries(grouped).map(([key, v]) => ({
          name: v.names[0] || key,
          quantity: v.unit === 'ml' ? Number(v.ml.toFixed(2)) : Number(v.kg.toFixed(3)),
          unit: v.unit,
          category: v.category,
          pricePerUnit: v.pricePerUnit,
        }));

        resolve(result);
      },
    );
  });
}

export function seedSampleData(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    db.get('SELECT COUNT(*) as cnt FROM recipes', (err, row: any) => {
      if (err) return reject(err);
      if (row.cnt > 0) return resolve();

      const samples: Omit<Recipe, 'id'>[] = [
        {
          name: '番茄炒蛋',
          author: '美食博主小王',
          thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20egg%20stir%20fry%20chinese%20dish%20delicious&image_size=square',
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
          thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=braised%20pork%20belly%20chinese%20hong%20shao%20rou&image_size=square',
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
          thumbnail: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=garlic%20broccoli%20healthy%20vegetable%20dish&image_size=square',
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

      let pending = samples.length;
      samples.forEach((s) => {
        createRecipe(s).then(() => {
          pending--;
          if (pending === 0) resolve();
        }).catch(reject);
      });
    });
  });
}
