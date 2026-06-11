import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import type { FunctionNode, CallEdge } from './store'

interface RawFunction {
  id: string
  name: string
  startLine: number
  endLine: number
  statementCount: number
  node: any
}

function getComplexity(count: number): 'low' | 'medium' | 'high' {
  if (count <= 5) return 'low'
  if (count <= 15) return 'medium'
  return 'high'
}

function countStatements(body: any): number {
  if (!body) return 0
  if (body.type === 'BlockStatement') return body.body.length
  return 1
}

function getCalleeName(callee: any): string | null {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression') {
    if (callee.property?.type === 'Identifier') return callee.property.name
  }
  return null
}

function findEnclosingFuncId(ancestors: any[], nodeMap: Map<any, string>): string | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const id = nodeMap.get(ancestors[i])
    if (id) return id
  }
  return null
}

export function parseCode(sourceCode: string): {
  nodes: FunctionNode[]
  edges: CallEdge[]
} {
  let ast: any
  try {
    ast = acorn.parse(sourceCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    })
  } catch {
    return { nodes: [], edges: [] }
  }

  const nodeMap = new Map<any, string>()
  const rawFunctions: RawFunction[] = []
  const rawCalls: { from: string; to: string }[] = []
  const calledIds = new Set<string>()
  const funcNameToIds = new Map<string, string[]>()

  function registerFunc(node: any, name: string | null, ancestors: any[]): string | null {
    if (!name) {
      const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null
      if (parent) {
        if (parent.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') {
          name = parent.id.name
        } else if (parent.type === 'Property' && parent.key?.type === 'Identifier') {
          name = parent.key.name
        } else if (parent.type === 'MethodDefinition' && parent.key?.type === 'Identifier') {
          name = parent.key.name
        } else if (parent.type === 'AssignmentExpression' && parent.left?.type === 'Identifier') {
          name = parent.left.name
        }
      }
    }
    if (!name) name = `anon@${node.loc.start.line}`

    const id = `${name}@${node.loc.start.line}`
    const stmtCount = countStatements(node.body)

    nodeMap.set(node, id)
    rawFunctions.push({
      id,
      name,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      statementCount: stmtCount,
      node,
    })

    if (!funcNameToIds.has(name)) funcNameToIds.set(name, [])
    funcNameToIds.get(name)!.push(id)

    return id
  }

  walk.ancestor(ast, {
    FunctionDeclaration(node: any, ancestors: any[]) {
      registerFunc(node, node.id?.name || null, ancestors)
    },
    FunctionExpression(node: any, ancestors: any[]) {
      registerFunc(node, node.id?.name || null, ancestors)
    },
    ArrowFunctionExpression(node: any, ancestors: any[]) {
      registerFunc(node, null, ancestors)
    },
    CallExpression(node: any, ancestors: any[]) {
      const calleeName = getCalleeName(node.callee)
      if (!calleeName) return

      const enclosingId = findEnclosingFuncId(ancestors, nodeMap)
      if (!enclosingId) return

      const calleeIds = funcNameToIds.get(calleeName)
      if (calleeIds && calleeIds.length > 0) {
        for (const cid of calleeIds) {
          rawCalls.push({ from: enclosingId, to: cid })
          calledIds.add(cid)
        }
      } else {
        rawCalls.push({ from: enclosingId, to: calleeName })
        calledIds.add(calleeName)
      }
    },
  } as any)

  const nodes: FunctionNode[] = rawFunctions.map((rf) => {
    const isEntryPoint = !calledIds.has(rf.id)
    const isRecursive = rawCalls.some((c) => c.from === rf.id && c.to === rf.id)
    return {
      id: rf.id,
      name: rf.name,
      startLine: rf.startLine,
      endLine: rf.endLine,
      statementCount: rf.statementCount,
      complexity: getComplexity(rf.statementCount),
      isEntryPoint,
      isRecursive,
    }
  })

  const edgeSet = new Set<string>()
  const edges: CallEdge[] = []
  for (const c of rawCalls) {
    const key = `${c.from}->${c.to}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push({
        from: c.from,
        to: c.to,
        isRecursive: c.from === c.to,
      })
    }
  }

  return { nodes, edges }
}
