import { useRef, useEffect, useCallback } from 'react'
import { useLevelStore } from '@/store/useLevelStore'
import { type LevelElement, type EnemyEntity, isEnemyElement, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE } from '@/types'

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#2c2c34'
  ctx.lineWidth = 1
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(CANVAS_WIDTH, y + 0.5)
    ctx.stroke()
  }
}

function drawGround(ctx: CanvasRenderingContext2D, el: LevelElement) {
  const grad = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height)
  grad.addColorStop(0, '#4ade80')
  grad.addColorStop(1, '#22c55e')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, 3)
  ctx.fill()
  ctx.strokeStyle = '#16a34a'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawMovingPlatform(ctx: CanvasRenderingContext2D, el: LevelElement) {
  const grad = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height)
  grad.addColorStop(0, '#fb923c')
  grad.addColorStop(1, '#f97316')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(el.x, el.y, el.width, el.height, 3)
  ctx.fill()
  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = 1
  ctx.stroke()

  if (isEnemyElement(el)) return
  const enemy = el as unknown as EnemyEntity
  if (enemy.pathPoints && enemy.pathPoints.length > 1) {
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(enemy.pathPoints[0].x, enemy.pathPoints[0].y)
    for (let i = 1; i < enemy.pathPoints.length; i++) {
      ctx.lineTo(enemy.pathPoints[i].x, enemy.pathPoints[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    enemy.pathPoints.forEach(pt => {
      ctx.fillStyle = '#93c5fd'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

function drawSpike(ctx: CanvasRenderingContext2D, el: LevelElement) {
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(el.x, el.y + el.height)
  ctx.lineTo(el.x + el.width / 2, el.y)
  ctx.lineTo(el.x + el.width, el.y + el.height)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#991b1b'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawFlag(ctx: CanvasRenderingContext2D, el: LevelElement) {
  ctx.fillStyle = '#92400e'
  ctx.fillRect(el.x + 2, el.y, 3, el.height)
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(el.x + 5, el.y)
  ctx.lineTo(el.x + el.width, el.y + 8)
  ctx.lineTo(el.x + 5, el.y + 16)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#d97706'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawSlime(ctx: CanvasRenderingContext2D, el: LevelElement) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const r = el.width / 2

  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#16a34a'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx - 5, cy - 3, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 5, cy - 3, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1a1a2e'
  ctx.beginPath()
  ctx.arc(cx - 4, cy - 3, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 6, cy - 3, 2, 0, Math.PI * 2)
  ctx.fill()

  if (isEnemyElement(el)) {
    const enemy = el as EnemyEntity
    if (enemy.pathPoints && enemy.pathPoints.length > 1) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(enemy.pathPoints[0].x, enemy.pathPoints[0].y)
      for (let i = 1; i < enemy.pathPoints.length; i++) {
        ctx.lineTo(enemy.pathPoints[i].x, enemy.pathPoints[i].y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      enemy.pathPoints.forEach(pt => {
        ctx.fillStyle = '#93c5fd'
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

function drawDragon(ctx: CanvasRenderingContext2D, el: LevelElement) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2

  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.ellipse(cx, cy, el.width / 2, el.height / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b91c1c'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const wingOffset = Math.sin(Date.now() / 200) * 4
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(cx - el.width / 2, cy)
  ctx.lineTo(cx - el.width / 2 - 10, cy - 8 + wingOffset)
  ctx.lineTo(cx - el.width / 2 + 4, cy - 4)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + el.width / 2, cy)
  ctx.lineTo(cx + el.width / 2 + 10, cy - 8 - wingOffset)
  ctx.lineTo(cx + el.width / 2 - 4, cy - 4)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(cx - 4, cy - 2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 4, cy - 2, 2, 0, Math.PI * 2)
  ctx.fill()

  if (isEnemyElement(el)) {
    const enemy = el as EnemyEntity
    if (enemy.pathPoints && enemy.pathPoints.length > 1) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(enemy.pathPoints[0].x, enemy.pathPoints[0].y)
      for (let i = 1; i < enemy.pathPoints.length; i++) {
        ctx.lineTo(enemy.pathPoints[i].x, enemy.pathPoints[i].y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      enemy.pathPoints.forEach(pt => {
        ctx.fillStyle = '#93c5fd'
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

function drawElement(ctx: CanvasRenderingContext2D, el: LevelElement) {
  switch (el.type) {
    case 'ground': drawGround(ctx, el); break
    case 'movingPlatform': drawMovingPlatform(ctx, el); break
    case 'spike': drawSpike(ctx, el); break
    case 'flag': drawFlag(ctx, el); break
    case 'slime': drawSlime(ctx, el); break
    case 'dragon': drawDragon(ctx, el); break
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, el: LevelElement) {
  ctx.strokeStyle = '#60a5fa'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.strokeRect(el.x - 3, el.y - 3, el.width + 6, el.height + 6)
  ctx.setLineDash([])
}

export default function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elements = useLevelStore(s => s.elements)
  const selectedId = useLevelStore(s => s.selectedId)
  const addElement = useLevelStore(s => s.addElement)
  const selectElement = useLevelStore(s => s.selectElement)
  const animFrameRef = useRef<number>(0)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1e1e24'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    drawGrid(ctx)

    elements.forEach(el => {
      drawElement(ctx, el)
    })

    const selected = elements.find(el => el.id === selectedId)
    if (selected) {
      drawSelection(ctx, selected)
    }

    const hasDragon = elements.some(el => el.type === 'dragon')
    if (hasDragon) {
      animFrameRef.current = requestAnimationFrame(render)
    }
  }, [elements, selectedId])

  useEffect(() => {
    render()
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [render])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('element-type') as LevelElement['type']
    if (!type) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    addElement(type, x, y)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    let found: LevelElement | null = null
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (mx >= el.x && mx <= el.x + el.width && my >= el.y && my <= el.y + el.height) {
        found = el
        break
      }
    }

    selectElement(found ? found.id : null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      style={{
        borderRadius: 8,
        cursor: 'pointer',
        maxWidth: '100%',
        height: 'auto',
        transition: 'all 0.2s',
      }}
    />
  )
}
