export interface PuzzlePieceData {
  id: string
  index: number
  col: number
  row: number
  correctX: number
  correctY: number
  width: number
  height: number
  edges: {
    top: 'flat' | 'tab' | 'blank'
    right: 'flat' | 'tab' | 'blank'
    bottom: 'flat' | 'tab' | 'blank'
    left: 'flat' | 'tab' | 'blank'
  }
  tabSize: number
  canvas: HTMLCanvasElement | null
}

export interface PuzzleConfig {
  cols: number
  rows: number
  boardWidth: number
  boardHeight: number
  theme: string
}

const TAB_SIZE_RATIO = 0.22

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generatePuzzleEdges(cols: number, rows: number, seed: number) {
  const rand = seededRandom(seed)
  const top: ('flat' | 'tab' | 'blank')[] = []
  const right: ('flat' | 'tab' | 'blank')[] = []
  const bottom: ('flat' | 'tab' | 'blank')[] = []
  const left: ('flat' | 'tab' | 'blank')[] = []

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    top[i] = row === 0 ? 'flat' : (bottom[i - cols] === 'tab' ? 'blank' : 'tab')
    right[i] = col === cols - 1 ? 'flat' : (rand() > 0.5 ? 'tab' : 'blank')
    bottom[i] = row === rows - 1 ? 'flat' : (top[i + cols] === 'tab' ? 'blank' : 'tab')
    left[i] = col === 0 ? 'flat' : (right[i - 1] === 'tab' ? 'blank' : 'tab')
  }

  return { top, right, bottom, left }
}

function drawTabEdge(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  type: 'tab' | 'blank'
) {
  const dx = toX - fromX
  const dy = toY - fromY
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) { ctx.lineTo(toX, toY); return }

  const nx = -dy / len
  const ny = dx / len
  const sign = type === 'tab' ? 1 : -1
  const tabHeight = len * 0.22 * sign
  const tabWidth = len * 0.18

  const p1x = fromX + dx * 0.35 + nx * tabHeight * 0.05
  const p1y = fromY + dy * 0.35 + ny * tabHeight * 0.05

  const neck1x = fromX + dx * 0.38 + nx * tabHeight * 0.2
  const neck1y = fromY + dy * 0.38 + ny * tabHeight * 0.2

  const bulgeCx = fromX + dx * 0.5 + nx * tabHeight
  const bulgeCy = fromY + dy * 0.5 + ny * tabHeight

  const neck2x = fromX + dx * 0.62 + nx * tabHeight * 0.2
  const neck2y = fromY + dy * 0.62 + ny * tabHeight * 0.2

  const p2x = fromX + dx * 0.65 + nx * tabHeight * 0.05
  const p2y = fromY + dy * 0.65 + ny * tabHeight * 0.05

  ctx.lineTo(p1x, p1y)

  ctx.bezierCurveTo(
    neck1x, neck1y,
    bulgeCx - dx * tabWidth / len * 0.5,
    bulgeCy - dy * tabWidth / len * 0.5,
    bulgeCx, bulgeCy
  )

  ctx.bezierCurveTo(
    bulgeCx + dx * tabWidth / len * 0.5,
    bulgeCy + dy * tabWidth / len * 0.5,
    neck2x, neck2y,
    p2x, p2y
  )

  ctx.lineTo(toX, toY)
}

function drawPuzzlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  edges: PuzzlePieceData['edges']
) {
  ctx.beginPath()
  ctx.moveTo(x, y)

  if (edges.top === 'flat') {
    ctx.lineTo(x + width, y)
  } else {
    drawTabEdge(ctx, x, y, x + width, y, edges.top)
  }

  if (edges.right === 'flat') {
    ctx.lineTo(x + width, y + height)
  } else {
    drawTabEdge(ctx, x + width, y, x + width, y + height, edges.right)
  }

  if (edges.bottom === 'flat') {
    ctx.lineTo(x, y + height)
  } else {
    drawTabEdge(ctx, x + width, y + height, x, y + height, edges.bottom)
  }

  if (edges.left === 'flat') {
    ctx.lineTo(x, y)
  } else {
    drawTabEdge(ctx, x, y + height, x, y, edges.left)
  }

  ctx.closePath()
}

function generateThemeImage(theme: string, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  switch (theme) {
    case 'sunset': {
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, '#ff6b6b')
      g.addColorStop(0.3, '#feca57')
      g.addColorStop(0.6, '#ff9ff3')
      g.addColorStop(1, '#48dbfb')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#ffeaa7'
      ctx.beginPath()
      ctx.arc(width * 0.7, height * 0.35, 60, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc((i + 0.5) * width / 5, height * 0.7 + Math.sin(i) * 20, 30 + i * 5, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'ocean': {
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, '#74b9ff')
      g.addColorStop(0.5, '#0984e3')
      g.addColorStop(1, '#0652DD')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 3
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        const yBase = height * (0.3 + i * 0.08)
        for (let x = 0; x <= width; x += 20) {
          const wy = yBase + Math.sin((x + i * 50) * 0.02) * 15
          x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy)
        }
        ctx.stroke()
      }
      ctx.fillStyle = '#fdcb6e'
      ctx.beginPath()
      ctx.moveTo(width * 0.2, height * 0.25)
      ctx.lineTo(width * 0.3, height * 0.15)
      ctx.lineTo(width * 0.4, height * 0.25)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'forest': {
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, '#a8e6cf')
      g.addColorStop(0.4, '#88d8b0')
      g.addColorStop(1, '#56ab2f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      const trees = [
        { x: 0.1, y: 0.6, h: 0.35 }, { x: 0.25, y: 0.55, h: 0.4 },
        { x: 0.4, y: 0.62, h: 0.32 }, { x: 0.55, y: 0.58, h: 0.38 },
        { x: 0.7, y: 0.6, h: 0.36 }, { x: 0.85, y: 0.56, h: 0.42 },
        { x: 0.15, y: 0.75, h: 0.25 }, { x: 0.5, y: 0.78, h: 0.22 },
        { x: 0.8, y: 0.76, h: 0.24 },
      ]
      trees.forEach((tree, i) => {
        const tx = tree.x * width, ty = tree.y * height, th = tree.h * height, tw = th * 0.4
        ctx.fillStyle = '#6d4c41'
        ctx.fillRect(tx - tw * 0.1, ty, tw * 0.2, th * 0.4)
        ctx.fillStyle = ['#2e7d32', '#388e3c', '#43a047'][i % 3]
        for (let j = 0; j < 3; j++) {
          ctx.beginPath()
          ctx.moveTo(tx, ty - j * th * 0.2)
          ctx.lineTo(tx - tw * (1 - j * 0.2), ty + th * 0.15 - j * th * 0.15)
          ctx.lineTo(tx + tw * (1 - j * 0.2), ty + th * 0.15 - j * th * 0.15)
          ctx.closePath()
          ctx.fill()
        }
      })
      break
    }
    case 'galaxy': {
      const g = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7)
      g.addColorStop(0, '#1a1a2e')
      g.addColorStop(0.5, '#16213e')
      g.addColorStop(1, '#0f0f1a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`
        ctx.beginPath()
        ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      const n1 = ctx.createRadialGradient(width * 0.3, height * 0.4, 0, width * 0.3, height * 0.4, width * 0.3)
      n1.addColorStop(0, 'rgba(156,89,182,0.6)')
      n1.addColorStop(0.5, 'rgba(156,89,182,0.2)')
      n1.addColorStop(1, 'transparent')
      ctx.fillStyle = n1
      ctx.fillRect(0, 0, width, height)
      const n2 = ctx.createRadialGradient(width * 0.7, height * 0.6, 0, width * 0.7, height * 0.6, width * 0.25)
      n2.addColorStop(0, 'rgba(236,64,122,0.5)')
      n2.addColorStop(0.5, 'rgba(236,64,122,0.15)')
      n2.addColorStop(1, 'transparent')
      ctx.fillStyle = n2
      ctx.fillRect(0, 0, width, height)
      break
    }
    case 'cityscape': {
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, '#2c3e50')
      g.addColorStop(0.6, '#34495e')
      g.addColorStop(1, '#1a252f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#f39c12'
      ctx.beginPath()
      ctx.arc(width * 0.8, height * 0.2, 40, 0, Math.PI * 2)
      ctx.fill()
      const bldgs = [
        { x: 0.02, w: 0.08, h: 0.55 }, { x: 0.11, w: 0.06, h: 0.7 },
        { x: 0.18, w: 0.1, h: 0.45 }, { x: 0.29, w: 0.07, h: 0.65 },
        { x: 0.37, w: 0.09, h: 0.8 }, { x: 0.47, w: 0.06, h: 0.5 },
        { x: 0.54, w: 0.1, h: 0.75 }, { x: 0.65, w: 0.07, h: 0.55 },
        { x: 0.73, w: 0.09, h: 0.7 }, { x: 0.83, w: 0.07, h: 0.6 },
        { x: 0.91, w: 0.08, h: 0.5 },
      ]
      bldgs.forEach((b) => {
        const bx = b.x * width, bw = b.w * width, bh = b.h * height, by = height - bh
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(bx, by, bw, bh)
        ctx.fillStyle = '#ffeaa7'
        const ww = bw * 0.12, wh = bh * 0.04, gx = bw * 0.1, gy = bh * 0.05
        for (let r = 0; r < Math.floor((bh - gy) / (wh + gy)); r++) {
          for (let c = 0; c < Math.floor((bw - gx) / (ww + gx)); c++) {
            if (Math.random() > 0.3) ctx.fillRect(bx + gx + c * (ww + gx), by + gy + r * (wh + gy), ww, wh)
          }
        }
      })
      break
    }
    case 'abstract': {
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, width, height)
      const shapes = [
        { x: 0.2, y: 0.3, r: 0.15, color: '#e74c3c' },
        { x: 0.7, y: 0.4, r: 0.12, color: '#3498db' },
        { x: 0.5, y: 0.7, r: 0.18, color: '#2ecc71' },
        { x: 0.8, y: 0.75, r: 0.08, color: '#f1c40f' },
        { x: 0.15, y: 0.7, r: 0.1, color: '#9b59b6' },
      ]
      shapes.forEach((s) => {
        const sg = ctx.createRadialGradient(s.x * width, s.y * height, 0, s.x * width, s.y * height, s.r * width)
        sg.addColorStop(0, s.color)
        sg.addColorStop(1, 'transparent')
        ctx.fillStyle = sg
        ctx.fillRect(0, 0, width, height)
      })
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 2
      for (let i = 0; i < 10; i++) {
        ctx.beginPath()
        ctx.moveTo(0, (i / 10) * height)
        ctx.bezierCurveTo(width * 0.3, (i / 10) * height + 50, width * 0.6, (i / 10) * height - 50, width, (i / 10) * height)
        ctx.stroke()
      }
      break
    }
    default: {
      ctx.fillStyle = '#6366f1'
      ctx.fillRect(0, 0, width, height)
    }
  }
  return canvas
}

export function generatePuzzlePieces(config: PuzzleConfig): PuzzlePieceData[] {
  const { cols, rows, boardWidth, boardHeight, theme } = config

  const pieceWidth = boardWidth / cols
  const pieceHeight = boardHeight / rows
  const tabSize = Math.min(pieceWidth, pieceHeight) * TAB_SIZE_RATIO
  const edgeData = generatePuzzleEdges(cols, rows, theme.length)

  const imageCanvas = generateThemeImage(theme, boardWidth, boardHeight)

  const padding = tabSize + 4
  const pieces: PuzzlePieceData[] = []

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const pieceEdges = {
      top: edgeData.top[i],
      right: edgeData.right[i],
      bottom: edgeData.bottom[i],
      left: edgeData.left[i],
    }

    const canvasW = Math.ceil(pieceWidth + padding * 2)
    const canvasH = Math.ceil(pieceHeight + padding * 2)

    const pieceCanvas = document.createElement('canvas')
    pieceCanvas.width = canvasW
    pieceCanvas.height = canvasH
    const pCtx = pieceCanvas.getContext('2d')!

    drawPuzzlePath(pCtx, padding, padding, pieceWidth, pieceHeight, pieceEdges)
    pCtx.clip()

    const srcX = col * pieceWidth - padding
    const srcY = row * pieceHeight - padding
    pCtx.drawImage(
      imageCanvas,
      srcX < 0 ? 0 : srcX, srcY < 0 ? 0 : srcY,
      canvasW, canvasH,
      srcX < 0 ? -srcX : 0, srcY < 0 ? -srcY : 0,
      canvasW, canvasH
    )

    const strokeCtx = pieceCanvas.getContext('2d')!
    drawPuzzlePath(strokeCtx, padding, padding, pieceWidth, pieceHeight, pieceEdges)
    strokeCtx.strokeStyle = 'rgba(0,0,0,0.25)'
    strokeCtx.lineWidth = 1.5
    strokeCtx.stroke()

    pieces.push({
      id: `piece-${i}`,
      index: i,
      col,
      row,
      correctX: col,
      correctY: row,
      width: pieceWidth,
      height: pieceHeight,
      edges: pieceEdges,
      tabSize,
      canvas: pieceCanvas,
    })
  }

  return pieces
}

export function isPieceInCorrectPosition(
  pieceX: number,
  pieceY: number,
  correctX: number,
  correctY: number,
  threshold: number = 0.3
): boolean {
  return Math.abs(pieceX - correctX) < threshold && Math.abs(pieceY - correctY) < threshold
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function shakeOffset(progress: number): number {
  const frequency = 3 * 2 * Math.PI
  const amp = 8
  return Math.sin(progress * frequency) * amp * (1 - progress)
}

export function getAdjacentPieceIndices(
  pieceIndex: number,
  cols: number,
  rows: number
): number[] {
  const col = pieceIndex % cols
  const row = Math.floor(pieceIndex / cols)
  const adj: number[] = []
  if (row > 0) adj.push(pieceIndex - cols)
  if (col < cols - 1) adj.push(pieceIndex + 1)
  if (row < rows - 1) adj.push(pieceIndex + cols)
  if (col > 0) adj.push(pieceIndex - 1)
  return adj
}
