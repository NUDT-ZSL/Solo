import { useEffect, useRef, useState, useCallback } from 'react'
import type { KnowledgePoint, Relation } from '../types'

interface KnowledgeGraphProps {
  knowledgePoints: KnowledgePoint[]
  relations: Relation[]
  highlightPath?: string[]
  selectedTag?: string | null
  onNodeClick?: (kp: KnowledgePoint) => void
  onNodeMove?: (id: string, x: number, y: number) => void
  onRelationCreate?: (from: string, to: string) => void
  isTeacher?: boolean
}

const NODE_RADIUS = 18
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#81c784',
  intermediate: '#ffb74d',
  advanced: '#e57373'
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
}

export default function KnowledgeGraph({
  knowledgePoints,
  relations,
  highlightPath = [],
  selectedTag = null,
  onNodeClick,
  onNodeMove,
  onRelationCreate,
  isTeacher = false
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [connecting, setConnecting] = useState<{ from: string; mouseX: number; mouseY: number } | null>(null)
  const animFrameRef = useRef<number>(0)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const isNodeFiltered = useCallback(
    (kp: KnowledgePoint) => {
      if (!selectedTag) return false
      return !kp.tags.includes(selectedTag)
    },
    [selectedTag]
  )

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setSize({ w: rect.width, h: rect.height })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = size.w + 'px'
    canvas.style.height = size.h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, size.w, size.h)

    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < size.w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size.h)
      ctx.stroke()
    }
    for (let y = 0; y < size.h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size.w, y)
      ctx.stroke()
    }

    const pathSet = new Set(highlightPath)
    const pathEdgeSet = new Set<string>()
    for (let i = 0; i < highlightPath.length - 1; i++) {
      pathEdgeSet.add(`${highlightPath[i]}->${highlightPath[i + 1]}`)
    }

    relations.forEach(rel => {
      const fromKp = knowledgePoints.find(k => k.id === rel.from)
      const toKp = knowledgePoints.find(k => k.id === rel.to)
      if (!fromKp || !toKp) return

      const fromFiltered = isNodeFiltered(fromKp)
      const toFiltered = isNodeFiltered(toKp)
      if (fromFiltered || toFiltered) return

      const isPathEdge = pathEdgeSet.has(`${rel.from}->${rel.to}`)

      drawCurve(ctx, fromKp.x, fromKp.y, toKp.x, toKp.y, {
        color: isPathEdge ? '#f44336' : '#bdbdbd',
        dashed: isPathEdge,
        highlight: pathSet.has(rel.from) && pathSet.has(rel.to),
        arrowColor: isPathEdge ? '#f44336' : '#bdbdbd'
      })
    })

    if (connecting) {
      const fromKp = knowledgePoints.find(k => k.id === connecting.from)
      if (fromKp) {
        drawCurve(ctx, fromKp.x, fromKp.y, connecting.mouseX, connecting.mouseY, {
          color: '#1976d2',
          dashed: true,
          arrow: false
        })
      }
    }

    knowledgePoints.forEach(kp => {
      const filtered = isNodeFiltered(kp)
      const isPathNode = pathSet.has(kp.id)
      const isHovered = hoveredNode === kp.id

      drawNode(ctx, kp, {
        filtered,
        isPathNode,
        isHovered,
        isTeacher
      })
    })
  }, [knowledgePoints, relations, highlightPath, selectedTag, hoveredNode, connecting, size, isNodeFiltered, isTeacher])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [draw])

  function drawNode(
    ctx: CanvasRenderingContext2D,
    kp: KnowledgePoint,
    opts: { filtered: boolean; isPathNode: boolean; isHovered: boolean; isTeacher: boolean }
  ) {
    const { filtered, isPathNode, isHovered } = opts
    const baseColor = DIFFICULTY_COLORS[kp.difficulty]
    const radius = isHovered ? NODE_RADIUS * 1.2 : NODE_RADIUS

    ctx.save()
    if (filtered) {
      ctx.globalAlpha = 0.3
    }

    if (isHovered) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2
    }

    ctx.beginPath()
    ctx.arc(kp.x, kp.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = filtered ? '#9e9e9e' : baseColor
    ctx.fill()

    if (isPathNode) {
      ctx.beginPath()
      ctx.arc(kp.x, kp.y, radius + 4, 0, Math.PI * 2)
      const time = Date.now() / 500
      const pulse = 0.5 + 0.5 * Math.sin(time)
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + 0.4 * pulse})`
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(kp.x, kp.y, radius + 1, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(kp.x, kp.y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.shadowColor = 'transparent'

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const displayText = kp.title.length > 4 ? kp.title.slice(0, 4) : kp.title
    ctx.fillText(displayText, kp.x, kp.y)

    ctx.fillStyle = filtered ? '#9e9e9e' : '#424242'
    ctx.font = '12px sans-serif'
    ctx.textBaseline = 'top'
    const titleText = kp.title.length > 8 ? kp.title.slice(0, 8) + '...' : kp.title
    ctx.fillText(titleText, kp.x, kp.y + radius + 6)

    ctx.restore()
  }

  function drawCurve(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts: { color: string; dashed?: boolean; highlight?: boolean; arrow?: boolean; arrowColor?: string }
  ) {
    const { color, dashed = false, arrow = true, arrowColor } = opts

    const dx = x2 - x1
    const dy = y2 - y1
    const cx = (x1 + x2) / 2 - dy * 0.1
    const cy = (y1 + y2) / 2 + dx * 0.1

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(cx, cy, x2, y2)
    ctx.strokeStyle = color
    ctx.lineWidth = dashed ? 2.5 : 2
    if (dashed) {
      ctx.setLineDash([8, 4])
    } else {
      ctx.setLineDash([])
    }
    ctx.stroke()
    ctx.setLineDash([])

    if (arrow) {
      const angle = Math.atan2(y2 - cy, x2 - cx)
      const arrowSize = 10
      const endX = x2 - NODE_RADIUS * Math.cos(angle)
      const endY = y2 - NODE_RADIUS * Math.sin(angle)

      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - Math.PI / 6),
        endY - arrowSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + Math.PI / 6),
        endY - arrowSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fillStyle = arrowColor || color
      ctx.fill()
    }
    ctx.restore()
  }

  function getMousePos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  function hitTest(mx: number, my: number): KnowledgePoint | null {
    for (let i = knowledgePoints.length - 1; i >= 0; i--) {
      const kp = knowledgePoints[i]
      const dx = mx - kp.x
      const dy = my - kp.y
      if (dx * dx + dy * dy <= (NODE_RADIUS + 4) * (NODE_RADIUS + 4)) {
        return kp
      }
    }
    return null
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getMousePos(e)
    const node = hitTest(x, y)
    if (!node) return

    if (isTeacher && e.shiftKey) {
      setConnecting({ from: node.id, mouseX: x, mouseY: y })
    } else {
      setDragging({ id: node.id, offsetX: x - node.x, offsetY: y - node.y })
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getMousePos(e)
    const node = hitTest(x, y)
    setHoveredNode(node ? node.id : null)

    if (dragging) {
      onNodeMove?.(dragging.id, x - dragging.offsetX, y - dragging.offsetY)
    }
    if (connecting) {
      setConnecting({ ...connecting, mouseX: x, mouseY: y })
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getMousePos(e)

    if (connecting) {
      const target = hitTest(x, y)
      if (target && target.id !== connecting.from) {
        onRelationCreate?.(connecting.from, target.id)
      }
      setConnecting(null)
    }
    setDragging(null)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getMousePos(e)
    const node = hitTest(x, y)
    if (node && !isNodeFiltered(node)) {
      onNodeClick?.(node)
    }
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setDragging(null)
          setConnecting(null)
          setHoveredNode(null)
        }}
        onClick={handleClick}
        style={{
          cursor: hoveredNode ? (isTeacher ? 'grab' : 'pointer') : 'default',
          display: 'block',
          transition: 'filter 0.3s ease'
        }}
      />
      {isTeacher && (
        <div style={hintStyle}>
          <span>💡 拖拽移动节点</span>
          <span style={{ marginLeft: 12 }}>🔗 按住 Shift + 拖拽创建关系</span>
        </div>
      )}
    </div>
  )
}

const hintStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: 12,
  background: 'rgba(26, 35, 126, 0.9)',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: 6,
  fontSize: 12,
  pointerEvents: 'none'
}

export { DIFFICULTY_COLORS, DIFFICULTY_LABELS }
