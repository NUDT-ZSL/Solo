import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { graphviz } from 'd3-graphviz'
import { Graphviz as HPCCGraphviz } from '@hpcc-js/wasm'
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
  const inDegree = new Map<string, number>()
  for (const n of nodes) inDegree.set(n.id, 0)
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1)
  }
  const entryPoints = nodes
    .filter((n) => (inDegree.get(n.id) || 0) === 0)
    .map((n) => n.id)

  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, [])
    adj.get(e.from)!.push(e.to)
  }

  const reachableFromEntries = new Set<string>()
  const queue = [...entryPoints]
  for (const ep of entryPoints) reachableFromEntries.add(ep)
  while (queue.length > 0) {
    const cur = queue.shift()!
    const next = adj.get(cur) || []
    for (const n of next) {
      if (!reachableFromEntries.has(n)) {
        reachableFromEntries.add(n)
        queue.push(n)
      }
    }
  }

  if (!reachableFromEntries.has(targetId)) {
    return new Set<string>()
  }

  const reverseAdj = new Map<string, string[]>()
  for (const e of edges) {
    if (!reverseAdj.has(e.to)) reverseAdj.set(e.to, [])
    reverseAdj.get(e.to)!.push(e.from)
  }

  const allCallers = new Set<string>()
  const rqueue = [targetId]
  allCallers.add(targetId)
  while (rqueue.length > 0) {
    const cur = rqueue.shift()!
    const callers = reverseAdj.get(cur) || []
    for (const c of callers) {
      if (!allCallers.has(c) && reachableFromEntries.has(c)) {
        allCallers.add(c)
        rqueue.push(c)
      }
    }
  }

  return allCallers
}

function generateDot(
  nodes: FunctionNode[],
  edges: CallEdge[],
  selectedNodeId: string | null,
  filterEntryPoint: boolean,
  filterRecursive: boolean,
  callChainNodeIds: Set<string>,
  callChainEdgeKeys: Set<string>,
  entryFilterVisibleIds: Set<string>
): string {
  const lines: string[] = ['digraph G {']
  lines.push('  rankdir=TB;')
  lines.push('  bgcolor="transparent";')
  lines.push(
    '  node [shape=box, style="filled,rounded", fontname="JetBrains Mono", fontsize=12, penwidth=1.5, margin="0.2,0.1"];'
  )
  lines.push(
    '  edge [arrowsize=0.7, color="#585b70", fontname="JetBrains Mono", fontsize=10];'
  )
  lines.push('')

  const nodeIdSet = new Set(nodes.map((n) => n.id))

  for (const n of nodes) {
    const color = COMPLEXITY_COLORS[n.complexity]
    let style = 'filled,rounded'
    let penwidth = 1.5
    let nodeColor = '#585b70'
    let fontColor = '#1e1e2e'
    let opacity = 1

    const safeId = n.id.replace(/@/g, '_at_')

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

    let classes = `node-g node-${safeId}`
    if (filterEntryPoint && !entryFilterVisibleIds.has(n.id)) {
      classes += ' node-hidden'
    }
    if (filterRecursive && !n.isRecursive) {
      classes += ' node-dim'
    }

    lines.push(
      `  ${safeId} [label="${n.name}\\n(L${n.startLine}, ${n.statementCount} stmts)", fillcolor="${color}", fontcolor="${fontColor}", color="${nodeColor}", penwidth=${penwidth}, style="${style}"${opacity < 1 ? `, opacity=${opacity}` : ''}, class="${classes}"];`
    )
  }

  lines.push('')

  for (const e of edges) {
    if (!nodeIdSet.has(e.from) || !nodeIdSet.has(e.to)) continue
    const safeFrom = e.from.replace(/@/g, '_at_')
    const safeTo = e.to.replace(/@/g, '_at_')
    const edgeKey = `${e.from}->${e.to}`
    let edgeColor = '#585b70'
    let edgePenwidth = 1
    let edgeStyle = ''
    let edgeOpacity = 1

    const edgeClass = `edge-g edge-${safeFrom}-${safeTo}`
    let finalEdgeClass = edgeClass
    if (filterEntryPoint) {
      const fromOk = entryFilterVisibleIds.has(e.from)
      const toOk = entryFilterVisibleIds.has(e.to)
      if (!fromOk || !toOk) {
        finalEdgeClass += ' edge-hidden'
      }
    }

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
      `  ${safeFrom} -> ${safeTo} [color="${edgeColor}", penwidth=${edgePenwidth}${edgeStyle ? `, ${edgeStyle}` : ''}${edgeOpacity < 1 ? `, opacity=${edgeOpacity}` : ''}, class="${finalEdgeClass}"];`
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
  const wasmLoadedRef = useRef(false)
  const hasRenderedRef = useRef(false)

  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  useEffect(() => {
    ;(async () => {
      if (!wasmLoadedRef.current) {
        try {
          await HPCCGraphviz.load()
          wasmLoadedRef.current = true
        } catch {
          // silently fail
        }
      }
    })()
  }, [])

  const { dot, callChainEdgeKeys } = useMemo(() => {
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

    const entryFilterVisibleIds = new Set<string>()
    if (nodes.length > 0) {
      const inDegree = new Map<string, number>()
      for (const n of nodes) inDegree.set(n.id, 0)
      for (const e of edges) {
        inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1)
      }
      const entryPoints = nodes
        .filter((n) => (inDegree.get(n.id) || 0) === 0)
        .map((n) => n.id)
      const adj = new Map<string, string[]>()
      for (const e of edges) {
        if (!adj.has(e.from)) adj.set(e.from, [])
        adj.get(e.from)!.push(e.to)
      }
      const queue = [...entryPoints]
      for (const ep of entryPoints) entryFilterVisibleIds.add(ep)
      while (queue.length > 0) {
        const cur = queue.shift()!
        const next = adj.get(cur) || []
        for (const n of next) {
          if (!entryFilterVisibleIds.has(n)) {
            entryFilterVisibleIds.add(n)
            queue.push(n)
          }
        }
      }
    }

    const dot = generateDot(
      nodes,
      edges,
      selectedNodeId,
      filterEntryPoint,
      filterRecursive,
      callChainNodeIds,
      callChainEdgeKeys,
      entryFilterVisibleIds
    )

    return { dot, callChainEdgeKeys }
  }, [nodes, edges, selectedNodeId, filterEntryPoint, filterRecursive])

  useEffect(() => {
    if (!containerRef.current || !wasmLoadedRef.current) return
    if (nodes.length === 0) {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      hasRenderedRef.current = false
      return
    }

    try {
      if (!gvRef.current) {
        gvRef.current = graphviz(containerRef.current, {
          useWorker: false,
        })
          .transition(function () {
            return d3.transition().duration(400).ease(d3.easeCubicInOut) as any
          })
          .renderDot(dot)
        hasRenderedRef.current = true
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
        hasRenderedRef.current = false
        if (containerRef.current) containerRef.current.innerHTML = ''
        gvRef.current = graphviz(containerRef.current, {
          useWorker: false,
        }).renderDot(dot)
        hasRenderedRef.current = true
      } catch {
        // silently fail
      }
    }
  }, [dot, nodes, wasmLoadedRef.current])

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
  }, [nodes, dot, selectedNodeId, filterEntryPoint, filterRecursive])

  useEffect(() => {
    if (!containerRef.current || !hasRenderedRef.current) return
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return

    const nodeEls = svg.querySelectorAll('.node')
    nodeEls.forEach((el) => {
      const titleEl = el.querySelector('title')
      if (!titleEl) return
      const rawId = titleEl.textContent || ''
      const nodeId = rawId.replace(/_at_/g, '@')
      const safeId = nodeId.replace(/@/g, '_at_')

      el.classList.remove('node-hover-target')
      el.classList.add(`node-id-${safeId}`)
    })

    const style = document.getElementById('graph-dyn-style') || document.createElement('style')
    style.id = 'graph-dyn-style'
    document.head.appendChild(style)

    const css: string[] = []
    css.push('.node-hidden { opacity: 0.05 !important; pointer-events: none; }')
    css.push('.edge-hidden { opacity: 0.05 !important; pointer-events: none; }')
    css.push('.node-dim { opacity: 0.6; }')
    css.push(
      `.node-g:hover { transform: scale(1.2); transform-origin: center; cursor: pointer; transition: transform 0.15s ease; }`
    )
    style.textContent = css.join('\n')
  }, [hasRenderedRef.current, filterEntryPoint, filterRecursive])

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
