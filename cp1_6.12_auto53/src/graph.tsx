import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { graphviz } from 'd3-graphviz'
import type { FunctionNode, CallEdge } from './store'

interface GraphProps {
  nodes: FunctionNode[]
  edges: CallEdge[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  filterEntryPoint: boolean
  filterRecursive: boolean
}

const COMPLEXITY_COLORS: Record<string, string> = {
  low: '#a6e3a1',
  medium: '#f9e2af',
  high: '#f38ba8',
}

function findCallChain(
  targetId: string,
  edges: CallEdge[],
  nodes: FunctionNode[]
): Set<string> {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.to)!.push(e.from)
  }

  const path = new Set<string>()
  const visited = new Set<string>()
  const queue = [targetId]
  visited.add(targetId)

  while (queue.length > 0) {
    const cur = queue.shift()!
    path.add(cur)
    const callers = adj.get(cur) || []
    for (const c of callers) {
      if (!visited.has(c)) {
        visited.add(c)
        queue.push(c)
      }
    }
  }

  return path
}

function generateDot(
  nodes: FunctionNode[],
  edges: CallEdge[],
  selectedNodeId: string | null,
  filterEntryPoint: boolean,
  filterRecursive: boolean
): string {
  let filteredNodes = [...nodes]
  let filteredEdges = [...edges]

  if (filterEntryPoint) {
    const entryIds = new Set(filteredNodes.filter((n) => n.isEntryPoint).map((n) => n.id))
    const reachable = new Set<string>()
    const queue = [...entryIds]
    for (const eid of entryIds) reachable.add(eid)
    while (queue.length > 0) {
      const cur = queue.shift()!
      const next = filteredEdges.filter((e) => e.from === cur).map((e) => e.to)
      for (const n of next) {
        if (!reachable.has(n)) {
          reachable.add(n)
          queue.push(n)
        }
      }
    }
    filteredNodes = filteredNodes.filter((n) => reachable.has(n.id))
    filteredEdges = filteredEdges.filter(
      (e) => reachable.has(e.from) && reachable.has(e.to)
    )
    const entryIdSet = new Set(entryIds)
    filteredNodes = filteredNodes.filter(
      (n) => entryIdSet.has(n.id) || filteredEdges.some((e) => e.to === n.id)
    )
  }

  const callChainNodeIds = selectedNodeId
    ? findCallChain(selectedNodeId, edges, nodes)
    : new Set<string>()

  const callChainEdgeKeys = new Set<string>()
  if (selectedNodeId) {
    const chainArr = Array.from(callChainNodeIds)
    for (const e of edges) {
      if (chainArr.includes(e.from) && chainArr.includes(e.to)) {
        callChainEdgeKeys.add(`${e.from}->${e.to}`)
      }
    }
  }

  const lines: string[] = ['digraph G {']
  lines.push('  rankdir=TB;')
  lines.push('  bgcolor="transparent";')
  lines.push('  node [shape=box, style="filled,rounded", fontname="JetBrains Mono", fontsize=12, penwidth=1.5, margin="0.2,0.1"];')
  lines.push('  edge [arrowsize=0.7, color="#585b70", fontname="JetBrains Mono", fontsize=10];')
  lines.push('')

  const nodeIds = new Set(filteredNodes.map((n) => n.id))

  for (const n of filteredNodes) {
    const color = COMPLEXITY_COLORS[n.complexity]
    let style = 'filled,rounded'
    let penwidth = 1.5
    let nodeColor = '#585b70'
    let fontColor = '#1e1e2e'
    let opacity = 1

    if (selectedNodeId) {
      if (n.id === selectedNodeId) {
        style = 'filled,rounded,bold'
        penwidth = 3
        nodeColor = '#89b4fa'
      } else if (callChainNodeIds.has(n.id)) {
        opacity = 1
        nodeColor = '#89b4fa'
        penwidth = 2
      } else {
        opacity = 0.35
      }
    }

    if (filterRecursive && n.isRecursive) {
      nodeColor = '#f38ba8'
      penwidth = 2.5
    }

    const safeId = n.id.replace(/@/g, '_at_')
    lines.push(
      `  ${safeId} [label="${n.name}\\n(L${n.startLine}, ${n.statementCount} stmts)", fillcolor="${color}", fontcolor="${fontColor}", color="${nodeColor}", penwidth=${penwidth}, style="${style}"${opacity < 1 ? `, opacity=${opacity}` : ''}];`
    )
  }

  lines.push('')

  for (const e of filteredEdges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue
    const safeFrom = e.from.replace(/@/g, '_at_')
    const safeTo = e.to.replace(/@/g, '_at_')
    const edgeKey = `${e.from}->${e.to}`
    let edgeColor = '#585b70'
    let edgePenwidth = 1
    let edgeStyle = ''
    let edgeOpacity = 1

    if (selectedNodeId) {
      if (callChainEdgeKeys.has(edgeKey)) {
        edgeColor = '#89b4fa'
        edgePenwidth = 2.5
      } else {
        edgeOpacity = 0.25
      }
    }

    if (filterRecursive && e.isRecursive) {
      edgeStyle = 'style="dashed"'
      edgeColor = '#f38ba8'
      edgePenwidth = 2
    }

    lines.push(
      `  ${safeFrom} -> ${safeTo} [color="${edgeColor}", penwidth=${edgePenwidth}${edgeStyle ? `, ${edgeStyle}` : ''}${edgeOpacity < 1 ? `, opacity=${edgeOpacity}` : ''}];`
    )
  }

  lines.push('}')
  return lines.join('\n')
}

export function Graph({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  filterEntryPoint,
  filterRecursive,
}: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gvRef = useRef<any>(null)
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  useEffect(() => {
    if (!containerRef.current) return
    if (nodes.length === 0) {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      return
    }

    const dot = generateDot(nodes, edges, selectedNodeId, filterEntryPoint, filterRecursive)

    try {
      if (!gvRef.current) {
        gvRef.current = graphviz(containerRef.current, {
          useWorker: false,
        })
          .transition(function () {
            return d3.transition().duration(400).ease(d3.easeCubicInOut) as any
          })
          .renderDot(dot)
      } else {
        gvRef.current
          .transition(function () {
            return d3.transition().duration(400).ease(d3.easeCubicInOut) as any
          })
          .renderDot(dot)
      }
    } catch {
      try {
        gvRef.current = null
        if (containerRef.current) containerRef.current.innerHTML = ''
        gvRef.current = graphviz(containerRef.current, {
          useWorker: false,
        }).renderDot(dot)
      } catch {
        // silently fail
      }
    }
  }, [nodes, edges, selectedNodeId, filterEntryPoint, filterRecursive])

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    const handleClick = (event: Event) => {
      const target = (event.target as Element).closest('.node')
      if (!target) return
      const title = target.querySelector('title')
      if (!title) return
      const rawId = title.textContent || ''
      const nodeId = rawId.replace(/_at_/g, '@')
      onNodeClickRef.current(nodeId)
    }

    const svg = containerRef.current.querySelector('svg')
    if (svg) {
      svg.addEventListener('click', handleClick)
      return () => svg.removeEventListener('click', handleClick)
    }
  }, [nodes, edges, selectedNodeId, filterEntryPoint, filterRecursive])

  return (
    <div className="graph-wrapper">
      {nodes.length === 0 && (
        <div className="graph-empty">
          <div className="graph-empty-icon">⬡</div>
          <div className="graph-empty-text">上传文件后在此显示调用关系图</div>
        </div>
      )}
      <div ref={containerRef} className="graph-container" />
    </div>
  )
}
