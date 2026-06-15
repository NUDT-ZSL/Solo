import { v4 as uuidv4 } from 'uuid'
import db from '../models/db.js'

type FlowType = 'leave' | 'expense' | 'business'
type FlowStatus = 'pending' | 'approved' | 'rejected'
type NodeStatus = 'pending' | 'approved' | 'rejected'

interface FlowNode {
  id: string
  flowId: string
  name: string
  handlerId: string
  handlerName: string
  status: NodeStatus
  comment?: string
  handledAt?: string
  orderIndex: number
}

interface FlowInstance {
  id: string
  type: FlowType
  title: string
  formData: any
  creatorId: string
  creatorName: string
  status: FlowStatus
  currentNodeIndex: number
  createdAt: string
  updatedAt: string
  nodes: FlowNode[]
}

const TYPE_TITLES: Record<FlowType, string> = {
  leave: '请假申请',
  expense: '报销申请',
  business: '出差申请',
}

const DEFAULT_NODES = [
  { name: '部门主管', handlerId: 'u002', handlerName: '李主管' },
  { name: '经理', handlerId: 'u003', handlerName: '王经理' },
  { name: 'HR', handlerId: 'u004', handlerName: '赵HR' },
]

function generateTitle(type: FlowType, creatorName: string): string {
  const dateStr = new Date().toISOString().slice(0, 10)
  const typeName = TYPE_TITLES[type] || '审批申请'
  return `${creatorName}-${typeName}-${dateStr}`
}

function mapFlowRow(row: any): FlowInstance {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    formData: JSON.parse(row.form_data),
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    status: row.status,
    currentNodeIndex: row.current_node_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nodes: [],
  }
}

function mapNodeRow(row: any): FlowNode {
  return {
    id: row.id,
    flowId: row.flow_id,
    name: row.name,
    handlerId: row.handler_id,
    handlerName: row.handler_name,
    status: row.status,
    comment: row.comment || undefined,
    handledAt: row.handled_at || undefined,
    orderIndex: row.order_index,
  }
}

function getNodesByFlowId(flowId: string): FlowNode[] {
  const rows = db
    .prepare('SELECT * FROM flow_nodes WHERE flow_id = ? ORDER BY order_index ASC')
    .all(flowId)
  return rows.map(mapNodeRow)
}

export function createFlow(
  type: FlowType,
  formData: any,
  creatorId: string,
  creatorName: string,
): FlowInstance {
  const now = new Date().toISOString()
  const flowId = uuidv4()
  const title = generateTitle(type, creatorName)

  const insertFlow = db.prepare(`
    INSERT INTO flow_instances (id, type, title, form_data, creator_id, creator_name, status, current_node_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
  `)

  const insertNode = db.prepare(`
    INSERT INTO flow_nodes (id, flow_id, name, handler_id, handler_name, status, order_index)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `)

  const tx = db.transaction(() => {
    insertFlow.run(flowId, type, title, JSON.stringify(formData), creatorId, creatorName, now, now)
    DEFAULT_NODES.forEach((node, index) => {
      insertNode.run(uuidv4(), flowId, node.name, node.handlerId, node.handlerName, index)
    })
  })

  tx()

  return getFlow(flowId)!
}

export function getFlow(id: string): FlowInstance | null {
  const row = db.prepare('SELECT * FROM flow_instances WHERE id = ?').get(id)
  if (!row) return null
  const flow = mapFlowRow(row)
  flow.nodes = getNodesByFlowId(id)
  return flow
}

export function getAllFlows(): FlowInstance[] {
  const rows = db.prepare('SELECT * FROM flow_instances ORDER BY created_at DESC').all()
  return rows.map((row: any) => {
    const flow = mapFlowRow(row)
    flow.nodes = getNodesByFlowId(flow.id)
    return flow
  })
}

export function getMyFlows(creatorId: string): FlowInstance[] {
  const rows = db
    .prepare('SELECT * FROM flow_instances WHERE creator_id = ? ORDER BY created_at DESC')
    .all(creatorId)
  return rows.map((row: any) => {
    const flow = mapFlowRow(row)
    flow.nodes = getNodesByFlowId(flow.id)
    return flow
  })
}

export function getTodos(handlerId: string): FlowInstance[] {
  const rows = db
    .prepare(
      `SELECT fi.* FROM flow_instances fi
       INNER JOIN flow_nodes fn ON fi.id = fn.flow_id
       WHERE fn.handler_id = ? AND fn.status = 'pending' AND fi.status = 'pending'
         AND fn.order_index = fi.current_node_index
       ORDER BY fi.created_at DESC`,
    )
    .all(handlerId)
  return rows.map((row: any) => {
    const flow = mapFlowRow(row)
    flow.nodes = getNodesByFlowId(flow.id)
    return flow
  })
}

export function approveFlow(flowId: string, handlerId: string, comment: string): FlowInstance | null {
  const flow = getFlow(flowId)
  if (!flow) return null
  if (flow.status !== 'pending') throw new Error('流程已结束，无法审批')

  const currentNode = flow.nodes[flow.currentNodeIndex]
  if (!currentNode) throw new Error('没有待审批节点')
  if (currentNode.handlerId !== handlerId) throw new Error('无权审批此节点')
  if (currentNode.status !== 'pending') throw new Error('此节点已处理')

  const now = new Date().toISOString()
  const nextIndex = flow.currentNodeIndex + 1
  const isLast = nextIndex >= flow.nodes.length
  const newStatus: FlowStatus = isLast ? 'approved' : 'pending'

  const updateNode = db.prepare(`
    UPDATE flow_nodes SET status = 'approved', comment = ?, handled_at = ? WHERE id = ?
  `)

  const updateFlow = db.prepare(`
    UPDATE flow_instances SET status = ?, current_node_index = ?, updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    updateNode.run(comment || null, now, currentNode.id)
    updateFlow.run(newStatus, nextIndex, now, flowId)
  })

  tx()

  return getFlow(flowId)
}

export function rejectFlow(flowId: string, handlerId: string, comment: string): FlowInstance | null {
  const flow = getFlow(flowId)
  if (!flow) return null
  if (flow.status !== 'pending') throw new Error('流程已结束，无法审批')

  const currentNode = flow.nodes[flow.currentNodeIndex]
  if (!currentNode) throw new Error('没有待审批节点')
  if (currentNode.handlerId !== handlerId) throw new Error('无权审批此节点')
  if (currentNode.status !== 'pending') throw new Error('此节点已处理')

  const now = new Date().toISOString()

  const updateCurrentNode = db.prepare(`
    UPDATE flow_nodes SET status = 'rejected', comment = ?, handled_at = ? WHERE id = ?
  `)

  const updateRemainingNodes = db.prepare(`
    UPDATE flow_nodes SET status = 'rejected' WHERE flow_id = ? AND order_index > ?
  `)

  const updateFlow = db.prepare(`
    UPDATE flow_instances SET status = 'rejected', updated_at = ? WHERE id = ?
  `)

  const tx = db.transaction(() => {
    updateCurrentNode.run(comment || null, now, currentNode.id)
    updateRemainingNodes.run(flowId, flow.currentNodeIndex)
    updateFlow.run(now, flowId)
  })

  tx()

  return getFlow(flowId)
}
