import { useRef, useEffect, useCallback } from 'react'
import { useGraphStore } from '@/store/graphStore'
import { CATEGORY_COLORS } from '@/lib/types'
import type { GraphNode, Connection } from '@/lib/types'

const NODE_RADIUS = 35
const REPULSION = 8000
const ATTRACTION = 0.005
const CENTER_FORCE = 0.01
const DAMPING = 0.9
const MIN_VELOCITY = 0.01

interface SimNode extends GraphNode {
  vx: number
  vy: number
  fx: number
  fy: number
}

export default function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simNodesRef = useRef<SimNode[]>([])
  const animFrameRef = useRef<number>(0)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ nodeId: string | null; startX: number; startY: number; isPanning: boolean; panStartX: number; panStartY: number }>({
    nodeId: null, startX: 0, startY: 0, isPanning: false, panStartX: 0, panStartY: 0,
  })
  const tooltipRef = useRef<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0, y: 0, text: '', visible: false,
  })

  const { nodes, edges, selectedNodeId, hoveredNodeId, searchQuery, setSelectedNodeId, setHoveredNodeId } = useGraphStore()

  useEffect(() => {
    simNodesRef.current = nodes.map((n) => ({
      ...n,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
    }))
  }, [nodes])

  const getCanvasCoords = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { cx: 0, cy: 0 }
    const rect = canvas.getBoundingClientRect()
    const t = transformRef.current
    return {
      cx: (e.clientX - rect.left - t.x) / t.scale,
      cy: (e.clientY - rect.top - t.y) / t.scale,
    }
  }, [])

  const findNodeAt = useCallback((cx: number, cy: number): SimNode | null => {
    for (let i = simNodesRef.current.length - 1; i >= 0; i--) {
      const node = simNodesRef.current[i]
      const dx = node.x - cx
      const dy = node.y - cy
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return node
      }
    }
    return null
  }, [])

  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (!selectedNodeId) return false
    if (nodeId === selectedNodeId) return true
    return edges.some(
      (e: Connection) =>
        (e.source === selectedNodeId && e.target === nodeId) ||
        (e.target === selectedNodeId && e.source === nodeId)
    )
  }, [selectedNodeId, edges])

  const isEdgeHighlighted = useCallback((edge: Connection): boolean => {
    if (!selectedNodeId) return false
    return edge.source === selectedNodeId || edge.target === selectedNodeId
  }, [selectedNodeId])

  const isNodeSearched = useCallback((nodeId: string): boolean => {
    if (!searchQuery) return true
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return false
    return node.name.toLowerCase().includes(searchQuery.toLowerCase())
  }, [searchQuery, nodes])

  const simulate = useCallback(() => {
    const simNodes = simNodesRef.current
    if (simNodes.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const centerX = canvas.width / 2 / transformRef.current.scale - transformRef.current.x / transformRef.current.scale
    const centerY = canvas.height / 2 / transformRef.current.scale - transformRef.current.y / transformRef.current.scale

    simNodes.forEach((n) => { n.fx = 0; n.fy = 0 })

    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const dx = simNodes[j].x - simNodes[i].x
        const dy = simNodes[j].y - simNodes[i].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        simNodes[i].fx -= fx
        simNodes[i].fy -= fy
        simNodes[j].fx += fx
        simNodes[j].fy += fy
      }
    }

    edges.forEach((edge: Connection) => {
      const source = simNodes.find((n) => n.id === edge.source)
      const target = simNodes.find((n) => n.id === edge.target)
      if (!source || !target) return
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = dist * ATTRACTION
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.fx += fx
      source.fy += fy
      target.fx -= fx
      target.fy -= fy
    })

    simNodes.forEach((n) => {
      if (dragRef.current.nodeId === n.id) return
      n.fx += (centerX - n.x) * CENTER_FORCE
      n.fy += (centerY - n.y) * CENTER_FORCE
      n.vx = (n.vx + n.fx) * DAMPING
      n.vy = (n.vy + n.fy) * DAMPING
      if (Math.abs(n.vx) < MIN_VELOCITY) n.vx = 0
      if (Math.abs(n.vy) < MIN_VELOCITY) n.vy = 0
      n.x += n.vx
      n.y += n.vy
    })
  }, [edges])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = transformRef.current
    const simNodes = simNodesRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.scale(t.scale, t.scale)

    const hasSearch = searchQuery.length > 0

    edges.forEach((edge: Connection) => {
      const source = simNodes.find((n) => n.id === edge.source)
      const target = simNodes.find((n) => n.id === edge.target)
      if (!source || !target) return

      const highlighted = isEdgeHighlighted(edge)
      const sourceSearched = isNodeSearched(edge.source)
      const targetSearched = isNodeSearched(edge.target)

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)

      if (highlighted) {
        ctx.strokeStyle = '#ff7043'
        ctx.lineWidth = 3
        ctx.setLineDash([])
      } else if (hasSearch && (!sourceSearched || !targetSearched)) {
        ctx.strokeStyle = 'rgba(224,224,224,0.3)'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
      } else {
        ctx.strokeStyle = '#e0e0e0'
        ctx.lineWidth = 2
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])
    })

    simNodes.forEach((node) => {
      const color = CATEGORY_COLORS[node.category] || '#999'
      const highlighted = isNodeHighlighted(node.id)
      const isHovered = hoveredNodeId === node.id
      const searched = isNodeSearched(node.id)
      const hasSearchQ = searchQuery.length > 0

      let radius = NODE_RADIUS
      if (highlighted) radius = NODE_RADIUS * 1.3
      else if (hasSearchQ && searched) radius = NODE_RADIUS * 1.2

      let alpha = 1
      if (hasSearchQ && !searched) alpha = 0.3

      ctx.save()
      ctx.globalAlpha = alpha

      if (highlighted) {
        ctx.shadowColor = color
        ctx.shadowBlur = 20
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = hasSearchQ && !searched ? '#ccc' : color
      ctx.fill()

      ctx.shadowBlur = 0

      if (isHovered || highlighted) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      ctx.fillStyle = hasSearchQ && !searched ? '#999' : '#fff'
      ctx.font = `bold ${highlighted ? 14 : 12}px "Noto Sans SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.name.slice(0, 2), node.x, node.y)

      ctx.restore()
    })

    ctx.restore()

    const tooltip = tooltipRef.current
    if (tooltip.visible) {
      ctx.save()
      ctx.globalAlpha = 0.95
      ctx.fillStyle = '#333'
      const textWidth = ctx.measureText(tooltip.text).width
      const padding = 10
      const boxX = tooltip.x + 15
      const boxY = tooltip.y - 30
      const boxW = textWidth + padding * 2
      const boxH = 28
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 8)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = '13px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(tooltip.text, boxX + padding, boxY + boxH / 2)
      ctx.restore()
    }
  }, [hoveredNodeId, selectedNodeId, searchQuery, isEdgeHighlighted, isNodeHighlighted, isNodeSearched])

  const tick = useCallback(() => {
    simulate()
    draw()
    animFrameRef.current = requestAnimationFrame(tick)
  }, [simulate, draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [tick])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasCoords(e)
    const node = findNodeAt(cx, cy)
    if (node) {
      dragRef.current.nodeId = node.id
      dragRef.current.startX = cx
      dragRef.current.startY = cy
    } else {
      dragRef.current.isPanning = true
      dragRef.current.panStartX = e.clientX - transformRef.current.x
      dragRef.current.panStartY = e.clientY - transformRef.current.y
    }
  }, [getCanvasCoords, findNodeAt])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasCoords(e)

    if (dragRef.current.nodeId) {
      const node = simNodesRef.current.find((n) => n.id === dragRef.current.nodeId)
      if (node) {
        node.x = cx
        node.y = cy
        node.vx = 0
        node.vy = 0
      }
    } else if (dragRef.current.isPanning) {
      transformRef.current.x = e.clientX - dragRef.current.panStartX
      transformRef.current.y = e.clientY - dragRef.current.panStartY
    } else {
      const node = findNodeAt(cx, cy)
      if (node) {
        setHoveredNodeId(node.id)
        tooltipRef.current = {
          x: e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
          y: e.clientY - (canvasRef.current?.getBoundingClientRect().top || 0),
          text: node.name,
          visible: true,
        }
      } else {
        setHoveredNodeId(null)
        tooltipRef.current.visible = false
      }
    }
  }, [getCanvasCoords, findNodeAt, setHoveredNodeId])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.nodeId) {
      const { cx, cy } = getCanvasCoords(e)
      const dx = Math.abs(cx - dragRef.current.startX)
      const dy = Math.abs(cy - dragRef.current.startY)
      if (dx < 5 && dy < 5) {
        setSelectedNodeId(dragRef.current.nodeId)
      }
    }
    dragRef.current.nodeId = null
    dragRef.current.isPanning = false
  }, [getCanvasCoords, setSelectedNodeId])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const t = transformRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const newScale = Math.max(0.3, Math.min(3, t.scale * delta))
    const ratio = newScale / t.scale
    t.x = mx - (mx - t.x) * ratio
    t.y = my - (my - t.y) * ratio
    t.scale = newScale
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setHoveredNodeId(null)
        tooltipRef.current.visible = false
        dragRef.current.nodeId = null
        dragRef.current.isPanning = false
      }}
      onWheel={handleWheel}
    />
  )
}
