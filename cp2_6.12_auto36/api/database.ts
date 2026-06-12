import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'knowledge.db')

let db: Database | null = null

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  })

  ensureDir(DB_DIR)

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON;')
  createTables(db)

  if (isDatabaseEmpty(db)) {
    seedData(db)
    saveDatabase()
  }

  console.log('Database initialized')
  return db
}

function createTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
  database.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      paragraph_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      is_read INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT REFERENCES annotations(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

function isDatabaseEmpty(database: Database): boolean {
  const result = database.exec("SELECT COUNT(*) as cnt FROM knowledge_bases;")
  if (result.length === 0) return true
  return (result[0].values[0][0] as number) === 0
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function convertRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key]
  }
  return result as T
}

export function convertRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => convertRow<T>(row))
}

function seedData(database: Database) {
  const kbId = uuidv4()
  database.run(
    `INSERT INTO knowledge_bases (id, name, description) VALUES (?, ?, ?);`,
    [kbId, '团队技术知识库', '团队共享的技术文档与最佳实践']
  )

  const cat1Id = uuidv4()
  const cat2Id = uuidv4()
  database.run(
    `INSERT INTO categories (id, knowledge_base_id, name, "order") VALUES (?, ?, ?, ?);`,
    [cat1Id, kbId, '前端开发', 0]
  )
  database.run(
    `INSERT INTO categories (id, knowledge_base_id, name, "order") VALUES (?, ?, ?, ?);`,
    [cat2Id, kbId, '后端开发', 1]
  )

  const doc1Id = uuidv4()
  const doc2Id = uuidv4()
  const doc3Id = uuidv4()

  const content1 = '# React 最佳实践\n\n## 组件设计\n\n使用函数式组件和 Hooks 进行开发。\n\n## 状态管理\n\n推荐使用 Zustand 或 Jotai 进行状态管理。\n\n## 性能优化\n\n使用 React.memo、useMemo 和 useCallback 进行性能优化。'
  const content2 = '# TypeScript 类型体操\n\n## 基础类型\n\n掌握 TypeScript 的基础类型系统。\n\n## 泛型\n\n灵活使用泛型提高代码复用性。\n\n## 条件类型\n\n理解条件类型和映射类型的用法。'
  const content3 = '# Node.js 性能调优\n\n## 事件循环\n\n理解 Node.js 事件循环机制。\n\n## 内存管理\n\n使用 --max-old-space-size 调整内存限制。\n\n## 集群模式\n\n使用 cluster 模块充分利用多核 CPU。'

  database.run(
    `INSERT INTO documents (id, category_id, title, content) VALUES (?, ?, ?, ?);`,
    [doc1Id, cat1Id, 'React 最佳实践', content1]
  )
  database.run(
    `INSERT INTO documents (id, category_id, title, content) VALUES (?, ?, ?, ?);`,
    [doc2Id, cat1Id, 'TypeScript 类型体操', content2]
  )
  database.run(
    `INSERT INTO documents (id, category_id, title, content) VALUES (?, ?, ?, ?);`,
    [doc3Id, cat2Id, 'Node.js 性能调优', content3]
  )

  database.run(
    `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
    [uuidv4(), doc1Id, content1, 1]
  )
  database.run(
    `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
    [uuidv4(), doc2Id, content2, 1]
  )
  database.run(
    `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
    [uuidv4(), doc3Id, content3, 1]
  )

  console.log('Demo data seeded')
}

export function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  ensureDir(DB_DIR)
  fs.writeFileSync(DB_PATH, buffer)
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const database = getDb()
  const stmt = database.prepare(sql)
  stmt.bind(params)
  const results: T[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    results.push(convertRow<T>(row))
  }
  stmt.free()
  return results
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const results = all<T>(sql, params)
  return results[0]
}

export function run(sql: string, params: unknown[] = []): void {
  const database = getDb()
  database.run(sql, params)
  saveDatabase()
}

export { uuidv4 }
