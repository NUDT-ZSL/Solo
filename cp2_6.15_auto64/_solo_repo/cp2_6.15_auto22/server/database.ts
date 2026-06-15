import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'perfume.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables()
  }
  return db
}

function initTables() {
  const d = getDb()
  d.exec(`
    CREATE TABLE IF NOT EXISTS aromas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('floral', 'woody', 'fruity', 'fresh', 'spicy', 'herbal')),
      color TEXT NOT NULL,
      description TEXT NOT NULL,
      rgb TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipe_aromas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      aroma_id INTEGER NOT NULL REFERENCES aromas(id),
      ratio REAL NOT NULL CHECK(ratio > 0 AND ratio <= 1)
    );
  `)

  const count = d.prepare('SELECT COUNT(*) as cnt FROM aromas').get() as { cnt: number }
  if (count.cnt === 0) {
    const insert = d.prepare('INSERT INTO aromas (name, category, color, description, rgb) VALUES (?, ?, ?, ?, ?)')
    const aromas = [
      ['柑橘', 'fruity', '#FFA726', '清新明亮的柑橘果香，充满活力与阳光', '[255,167,38]'],
      ['佛手柑', 'fruity', '#FFB74D', '优雅的柑橘香气，带有淡淡的花香底蕴', '[255,183,77]'],
      ['柠檬', 'fresh', '#FFF176', '酸爽清透的柠檬气息，提神醒脑', '[255,241,118]'],
      ['薄荷', 'fresh', '#A5D6A7', '清凉沁人的薄荷香气，令人精神一振', '[165,214,167]'],
      ['迷迭香', 'herbal', '#81C784', '草本清香中带着木质底蕴，沉稳而提神', '[129,199,132]'],
      ['薰衣草', 'herbal', '#CE93D8', '温柔的花草香气，安神助眠的经典之选', '[206,147,216]'],
      ['玫瑰', 'floral', '#F48FB1', '浓郁浪漫的玫瑰花香，永恒的经典', '[244,143,177]'],
      ['茉莉', 'floral', '#F8BBD0', '甜美馥郁的茉莉花香，东方韵味的代表', '[248,187,208]'],
      ['牡丹', 'floral', '#EF9A9A', '富贵华丽的牡丹芬芳，雍容而柔美', '[239,154,154]'],
      ['铃兰', 'floral', '#F0F4C3', '清甜纯真的铃兰香气，如清晨的露珠', '[240,244,195]'],
      ['肉桂', 'spicy', '#D4A373', '温暖辛辣的肉桂芬芳，充满异域风情', '[212,163,115]'],
      ['胡椒', 'spicy', '#BCAAA4', '微辛的胡椒气息，为香水增添一抹大胆', '[188,170,164]'],
      ['雪松', 'woody', '#8D6E63', '沉稳宁静的雪松木香，大自然的呼吸', '[141,110,99]'],
      ['檀香', 'woody', '#A1887F', '醇厚温润的檀香，冥想与宁静的象征', '[161,136,127]'],
      ['橡木', 'woody', '#795548', '深邃的橡木桶香，岁月沉淀的味道', '[121,85,72]'],
      ['香根草', 'woody', '#6D4C41', '泥土与草根的原始气息，回归大地的味道', '[109,76,65]'],
    ] as const
    const insertMany = d.transaction((rows: readonly (readonly string[])[]) => {
      for (const row of rows) insert.run(...row)
    })
    insertMany(aromas)
  }
}

export interface AromaRow {
  id: number
  name: string
  category: string
  color: string
  description: string
  rgb: string
}

export interface RecipeRow {
  id: number
  name: string
  created_at: string
}

export interface RecipeAromaRow {
  id: number
  recipe_id: number
  aroma_id: number
  ratio: number
}

export function getAllAromas(): AromaRow[] {
  return getDb().prepare('SELECT * FROM aromas ORDER BY id').all() as AromaRow[]
}

export function createRecipe(name: string, aromas: { aromaId: number; ratio: number }[]): number {
  const d = getDb()
  const insertRecipe = d.prepare('INSERT INTO recipes (name) VALUES (?)')
  const insertRecipeAroma = d.prepare('INSERT INTO recipe_aromas (recipe_id, aroma_id, ratio) VALUES (?, ?, ?)')

  const transaction = d.transaction(() => {
    const result = insertRecipe.run(name)
    const recipeId = result.lastInsertRowid as number
    for (const a of aromas) {
      insertRecipeAroma.run(recipeId, a.aromaId, a.ratio)
    }
    return recipeId
  })

  return transaction()
}

export function getAllRecipes(): (RecipeRow & { aromas: (RecipeAromaRow & { name: string; color: string })[] })[] {
  const d = getDb()
  const recipes = d.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all() as RecipeRow[]
  return recipes.map((r) => {
    const aromaRows = d.prepare(
      `SELECT ra.*, a.name, a.color
       FROM recipe_aromas ra
       JOIN aromas a ON ra.aroma_id = a.id
       WHERE ra.recipe_id = ?`
    ).all(r.id) as (RecipeAromaRow & { name: string; color: string })[]
    return { ...r, aromas: aromaRows }
  })
}
