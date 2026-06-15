import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', '..', 'data.db')

interface PreparedStatement {
  run: (...params: any[]) => { changes: number; lastInsertRowid: number | bigint }
  get: (...params: any[]) => any
  all: (...params: any[]) => any[]
}

function createPreparedStatement(db: SqlJsDatabase, sql: string): PreparedStatement {
  return {
    run(...params: any[]) {
      const stmt = db.prepare(sql)
      try {
        stmt.bind(params)
        stmt.step()
        const changes = db.getRowsModified()
        return { changes, lastInsertRowid: 0 }
      } finally {
        stmt.free()
      }
    },
    get(...params: any[]) {
      const stmt = db.prepare(sql)
      try {
        stmt.bind(params)
        if (stmt.step()) {
          const row = stmt.getAsObject()
          const cols = stmt.getColumnNames()
          const result: any = {}
          for (let i = 0; i < cols.length; i++) {
            result[cols[i]] = (row as any)[i]
          }
          return result
        }
        return undefined
      } finally {
        stmt.free()
      }
    },
    all(...params: any[]) {
      const stmt = db.prepare(sql)
      try {
        stmt.bind(params)
        const rows: any[] = []
        const cols = stmt.getColumnNames()
        while (stmt.step()) {
          const row = stmt.getAsObject()
          const result: any = {}
          for (let i = 0; i < cols.length; i++) {
            result[cols[i]] = (row as any)[i]
          }
          rows.push(result)
        }
        return rows
      } finally {
        stmt.free()
      }
    },
  }
}

interface DatabaseWrapper {
  prepare: (sql: string) => PreparedStatement
  exec: (sql: string) => void
  transaction: <T extends (...args: any[]) => any>(fn: T) => (...args: Parameters<T>) => ReturnType<T>
}

function createTransaction(db: SqlJsDatabase, saveToDisk: () => void, fn: (...args: any[]) => any) {
  return (...args: any[]) => {
    db.run('BEGIN')
    try {
      const result = fn(...args)
      db.run('COMMIT')
      saveToDisk()
      return result
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  }
}

const SQL = await initSqlJs({
  locateFile: (file: string) => {
    try {
      const resolved = require.resolve('sql.js.js')
      return path.join(path.dirname(resolved), file)
    } catch {
      return path.join(process.cwd(), 'node_modules', 'sql.js.js', file)
    }
  },
})

let data: Uint8Array | undefined
if (fs.existsSync(dbPath)) {
  data = fs.readFileSync(dbPath)
}

const dbInstance = new SQL.Database(data)

function saveToDisk() {
  const dataExport = dbInstance.export()
  fs.writeFileSync(dbPath, Buffer.from(dataExport))
}

dbInstance.run(`
  CREATE TABLE IF NOT EXISTS flow_instances (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    form_data TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_node_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

dbInstance.run(`
  CREATE TABLE IF NOT EXISTS flow_nodes (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    handler_id TEXT NOT NULL,
    handler_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    handled_at TEXT,
    order_index INTEGER NOT NULL,
    FOREIGN KEY (flow_id) REFERENCES flow_instances(id)
  );
`)

dbInstance.run('CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id)')
dbInstance.run('CREATE INDEX IF NOT EXISTS idx_flow_instances_status ON flow_instances(status)')
dbInstance.run('CREATE INDEX IF NOT EXISTS idx_flow_nodes_handler ON flow_nodes(handler_id, status)')

function seedData() {
  const stmt = dbInstance.prepare('SELECT COUNT(*) as cnt FROM flow_instances')
  stmt.step()
  const row = stmt.getAsObject()
  const cols = stmt.getColumnNames()
  let count = 0
  for (let i = 0; i < cols.length; i++) {
    if (cols[i] === 'cnt' || cols[i] === 'COUNT(*)') {
      count = Number((row as any)[i])
    }
  }
  stmt.free()
  if (count > 0) return

  const now = new Date().toISOString()

  const sampleFlows = [
    {
      type: 'leave',
      title: '张三-请假申请-2026-06-10',
      formData: JSON.stringify({
        startDate: '2026-06-15',
        endDate: '2026-06-17',
        days: 3,
        reason: '家中有事需要处理',
      }),
      creatorId: 'u001',
      creatorName: '张三',
      nodes: [
        { name: '部门主管', handlerId: 'u002', handlerName: '李主管', status: 'approved', comment: '同意，安排好工作交接', handledAt: now, orderIndex: 0 },
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'pending', orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'pending', orderIndex: 2 },
      ],
      status: 'pending',
      currentNodeIndex: 1,
    },
    {
      type: 'expense',
      title: '李四-报销申请-2026-06-09',
      formData: JSON.stringify({
        amount: 2580,
        category: '差旅',
        description: '上海出差机票酒店费用',
      }),
      creatorId: 'u005',
      creatorName: '李四',
      nodes: [
        { name: '部门主管', handlerId: 'u002', handlerName: '李主管', status: 'approved', comment: '情况属实', handledAt: now, orderIndex: 0 },
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'approved', comment: '同意报销', handledAt: now, orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'pending', orderIndex: 2 },
      ],
      status: 'pending',
      currentNodeIndex: 2,
    },
    {
      type: 'business',
      title: '王五-出差申请-2026-06-08',
      formData: JSON.stringify({
        location: '深圳',
        days: 5,
        budget: 8000,
      }),
      creatorId: 'u006',
      creatorName: '王五',
      nodes: [
        { name: '部门主管', handlerId: 'u002', handlerName: '李主管', status: 'approved', comment: '同意', handledAt: now, orderIndex: 0 },
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'approved', comment: '注意安全', handledAt: now, orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'approved', comment: '已备案', handledAt: now, orderIndex: 2 },
      ],
      status: 'approved',
      currentNodeIndex: 3,
    },
    {
      type: 'leave',
      title: '赵六-请假申请-2026-06-07',
      formData: JSON.stringify({
        startDate: '2026-06-10',
        endDate: '2026-06-10',
        days: 1,
        reason: '身体不适',
      }),
      creatorId: 'u007',
      creatorName: '赵六',
      nodes: [
        { name: '部门主管', handlerId: 'u002', handlerName: '李主管', status: 'rejected', comment: '项目紧张，改期', handledAt: now, orderIndex: 0 },
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'rejected', orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'rejected', orderIndex: 2 },
      ],
      status: 'rejected',
      currentNodeIndex: 0,
    },
    {
      type: 'expense',
      title: '孙七-报销申请-2026-06-11',
      formData: JSON.stringify({
        amount: 320,
        category: '办公用品',
        description: '采购打印纸和墨盒',
      }),
      creatorId: 'u008',
      creatorName: '孙七',
      nodes: [
        { name: '部门主管', handlerId: 'u002', handlerName: '李主管', status: 'pending', orderIndex: 0 },
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'pending', orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'pending', orderIndex: 2 },
      ],
      status: 'pending',
      currentNodeIndex: 0,
    },
  ]

  const insertFlow = createPreparedStatement(dbInstance, `
    INSERT INTO flow_instances (id, type, title, form_data, creator_id, creator_name, status, current_node_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertNode = createPreparedStatement(dbInstance, `
    INSERT INTO flow_nodes (id, flow_id, name, handler_id, handler_name, status, comment, handled_at, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const flow of sampleFlows) {
    const flowId = uuidv4()
    insertFlow.run(
      flowId,
      flow.type,
      flow.title,
      flow.formData,
      flow.creatorId,
      flow.creatorName,
      flow.status,
      flow.currentNodeIndex,
      now,
      now
    )
    for (const node of flow.nodes) {
      insertNode.run(
        uuidv4(),
        flowId,
        node.name,
        node.handlerId,
        node.handlerName,
        node.status,
        node.comment || null,
        node.handledAt || null,
        node.orderIndex
      )
    }
  }
}

seedData()
saveToDisk()

const db: DatabaseWrapper = {
  prepare: (sql: string) => createPreparedStatement(dbInstance, sql),
  exec: (sql: string) => {
    dbInstance.run(sql)
    saveToDisk()
  },
  transaction: (fn: any) => createTransaction(dbInstance, saveToDisk, fn),
}

export default db
