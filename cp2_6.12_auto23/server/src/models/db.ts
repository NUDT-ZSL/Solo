import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', '..', 'data.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
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

  CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
  CREATE INDEX IF NOT EXISTS idx_flow_instances_status ON flow_instances(status);
  CREATE INDEX IF NOT EXISTS idx_flow_nodes_handler ON flow_nodes(handler_id, status);
`)

function seedData() {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM flow_instances').get() as { cnt: number }
  if (countRow.cnt > 0) return

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
        { name: '经理', handlerId: 'u003', handlerName: '王经理', status: 'skipped', orderIndex: 1 },
        { name: 'HR', handlerId: 'u004', handlerName: '赵HR', status: 'skipped', orderIndex: 2 },
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

  const insertFlow = db.prepare(`
    INSERT INTO flow_instances (id, type, title, form_data, creator_id, creator_name, status, current_node_index, created_at, updated_at)
    VALUES (@id, @type, @title, @formData, @creatorId, @creatorName, @status, @currentNodeIndex, @createdAt, @updatedAt)
  `)

  const insertNode = db.prepare(`
    INSERT INTO flow_nodes (id, flow_id, name, handler_id, handler_name, status, comment, handled_at, order_index)
    VALUES (@id, @flowId, @name, @handlerId, @handlerName, @status, @comment, @handledAt, @orderIndex)
  `)

  const tx = db.transaction((flows: typeof sampleFlows) => {
    for (const flow of flows) {
      const flowId = uuidv4()
      insertFlow.run({
        id: flowId,
        type: flow.type,
        title: flow.title,
        formData: flow.formData,
        creatorId: flow.creatorId,
        creatorName: flow.creatorName,
        status: flow.status,
        currentNodeIndex: flow.currentNodeIndex,
        createdAt: now,
        updatedAt: now,
      })
      for (const node of flow.nodes) {
        insertNode.run({
          id: uuidv4(),
          flowId,
          name: node.name,
          handlerId: node.handlerId,
          handlerName: node.handlerName,
          status: node.status,
          comment: node.comment || null,
          handledAt: node.handledAt || null,
          orderIndex: node.orderIndex,
        })
      }
    }
  })

  tx(sampleFlows)
}

seedData()

export default db
