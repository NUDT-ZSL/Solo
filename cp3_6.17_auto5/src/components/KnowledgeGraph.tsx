import { useRef, useEffect, useState, useCallback } from 'react'
import type { KnowledgePoint, Relation } from '../types'
import { DIFFICULTY_COLORS } from '../types'

interface Props {
  points: KnowledgePoint[]
  relations: Relation[]
  recommendPath: string[]
  filterTag: string
  isTeacher: boolean
  onPointClick: (point: KnowledgePoint) => void
  onPointMove: (id: string, x: number, y: number) => void
  onRelationCreate: (sourceId: string, targetId: string) => void
}

const NODE_RADIUS = 18
const HOVER_SCALE = 1.2
const ARROW_SIZE = 8

interface AnimState {
  hoveredId: string | null
  draggingId: string | null
  draggingRelationSourceId: string | null
  mouseX: number
  mouseY: number
  flashPhase: number
}

export default function KnowledgeGraph({
  points,
  relations,
  recommendPath,
  filterTag,
  isTeacher,
  onPointClick,
  onPointMove,
  onRelationCreate
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const stateRef = useRef<AnimState>({
    hoveredId: null,
    draggingId: null,
    draggingRelationSourceId: null,
    mouseX: 0,
    mouseY: 0,
    flashPhase: 0
  })
  const [dims, setDims] = useState({ w: 800, h: 600 })

  const visibleIds = useCallback(() => {
    if (!filterTag) return new Set(points.map(p => p.id))
    return new Set(points.filter(p => p.tags.includes(filterTag)).map(p => p.id))
  }, [points, filterTag])

  const hitTest = useCallback(
    (mx: number, my: number): KnowledgePoint | null => {
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        const dx = mx - p.x
        const dy = my - p.y
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS * HOVER_SCALE * HOVER_SCALE) {
          return p
        }
      }
      return null
    },
    [points]
  )

  const drawArrow = useCallback(
    (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
      const angle = Math.atan2(toY - fromY, toX - fromX)
      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(
        toX - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
        toY - ARROW_SIZE * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        toX - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
        toY - ARROW_SIZE * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    },
    []
  )

  const drawBezier = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      dashed: boolean,
      highlight: boolean
    ) => {
      const dx = x2 - x1
      const dy = y2 - y1
      const cx1 = x1 + dx * 0.5
      const cy1 = y1 - dy * 0.2 - 30
      const cx2 = x2 - dx * 0.5
      const cy2 = y2 + dy * 0.2 - 30

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = highlight ? 3 : 1.8
      if (dashed) ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2)
      ctx.stroke()
      ctx.restore()

      const t = 0.85
      const mt = 1 - t
      const arrowX = mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2
      const arrowY = mt * mt * mt * y1 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y2
      const prevT = 0.8
      const pm = 1 - prevT
      const prevX =
        pm * pm * pm * x1 + 3 * pm * pm * prevT * cx1 + 3 * pm * prevT * prevT * cx2 + prevT * prevT * prevT * x2
      const prevY =
        pm * pm * pm * y1 + 3 * pm * pm * prevT * cy1 + 3 * pm * prevT * prevT * cy2 + prevT * prevT * prevT * y2

      ctx.save()
      ctx.fillStyle = color
      drawArrow(ctx, prevX, prevY, arrowX, arrowY)
      ctx.restore()
    },
    [drawArrow]
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dims.w * dpr
    canvas.height = dims.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, dims.w, dims.h)

    const st = stateRef.current
    const visible = visibleIds()
    const pathSet = new Set(recommendPath)
    const pathRelationSet = new Set<string>()
    for (let i = 0; i < recommendPath.length - 1; i++) {
      const key = `${recommendPath[i]}->${recommendPath[i + 1]}`
      pathRelationSet.add(key)
    }

    st.flashPhase = (st.flashPhase + 0.05) % (Math.PI * 2)

    const pointMap = new Map(points.map(p => [p.id, p]))

    for (const rel of relations) {
      const src = pointMap.get(rel.sourceId)
      const tgt = pointMap.get(rel.targetId)
      if (!src || !tgt) continue

      const bothVisible = visible.has(src.id) && visible.has(tgt.id)
      const isPathRel = pathRelationSet.has(`${src.id}->${tgt.id}`)

      if (!bothVisible) {
        if (!filterTag) {
          drawBezier(ctx, src.x, src.y, tgt.x, tgt.y, 'rgba(189,189,189,0.2)', false, false)
        }
        continue
      }

      if (isPathRel) {
        drawBezier(ctx, src.x, src.y, tgt.x, tgt.y, '#f44336', true, true)
      } else {
        drawBezier(ctx, src.x, src.y, tgt.x, tgt.y, '#1976d2', false, true)
      }
    }

    if (st.draggingRelationSourceId) {
      const src = pointMap.get(st.draggingRelationSourceId)
      if (src) {
        drawBezier(ctx, src.x, src.y, st.mouseX, st.mouseY, '#00bcd4', true, true)
      }
    }

    for (const p of points) {
      const isVisible = visible.has(p.id)
      const isHovered = st.hoveredId === p.id
      const isInPath = pathSet.has(p.id)
      const color = DIFFICULTY_COLORS[p.difficulty]

      const scale = isHovered ? HOVER_SCALE : 1
      const r = NODE_RADIUS * scale
      let drawColor = color
      let alpha = 1

      if (!isVisible) {
        drawColor = '#9e9e9e'
        alpha = filterTag ? 0.3 : 0.5
      }

      ctx.save()
      ctx.globalAlpha = alpha

      if (isHovered) {
        ctx.shadowColor = 'rgba(0,0,0,0.25)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = drawColor
      ctx.fill()

      if (isInPath && isVisible) {
        const flashIntensity = (Math.sin(st.flashPhase) + 1) / 2
        ctx.strokeStyle = `rgba(255,193,7,${0.5 + flashIntensity * 0.5})`
        ctx.lineWidth = 3 + flashIntensity * 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2)
        ctx.stroke()
      } else if (isVisible) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.restore()

      if (isVisible) {
        ctx.save()
        ctx.fillStyle = '#212121'
        ctx.font = '12px -apple-system, "PingFang SC", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(p.title, p.x, p.y + r + 6)
        ctx.restore()
      }
    }

    animRef.current = requestAnimationFrame(render)
  }, [dims, points, relations, recommendPath, filterTag, visibleIds, drawBezier])

  useEffect(() => {
    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setDims({ w: rect.width, h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e)
    const hit = hitTest(x, y)
    stateRef.current.mouseX = x
    stateRef.current.mouseY = y

    if (hit) {
      if (isTeacher && e.shiftKey) {
        stateRef.current.draggingRelationSourceId = hit.id
      } else {
        stateRef.current.draggingId = hit.id
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e)
    const st = stateRef.current
    st.mouseX = x
    st.mouseY = y

    if (st.draggingId) {
      onPointMove(st.draggingId, x, y)
    } else if (!st.draggingRelationSourceId) {
      const hit = hitTest(x, y)
      st.hoveredId = hit ? hit.id : null
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e)
    const st = stateRef.current

    if (st.draggingRelationSourceId) {
      const hit = hitTest(x, y)
      if (hit && hit.id !== st.draggingRelationSourceId) {
        onRelationCreate(st.draggingRelationSourceId, hit.id)
      }
    } else if (!st.draggingId) {
      const hit = hitTest(x, y)
      if (hit) onPointClick(hit)
    }

    st.draggingId = null
    st.draggingRelationSourceId = null
  }

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        style={{ width: dims.w, height: dims.h, display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          stateRef.current.draggingId = null
          stateRef.current.draggingRelationSourceId = null
          stateRef.current.hoveredId = null
        }}
      />
      {isTeacher && (
        <div className="toolbar-hint">
          💡 拖拽节点移动位置 | Shift+拖拽节点到另一节点创建关系
        </div>
      )}
    </div>
  )
}
