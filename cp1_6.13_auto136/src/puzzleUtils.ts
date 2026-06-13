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
  imageData: ImageData | null
}

export interface PuzzleConfig {
  cols: number
  rows: number
  boardWidth: number
  boardHeight: number
  theme: string
}

const TAB_SIZE_RATIO = 0.2

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generatePuzzleEdges(cols: number, rows: number, seed: number) {
  const rand = seededRandom(seed)
  const edges: {
    top: ('flat' | 'tab' | 'blank')[]
    right: ('flat' | 'tab' | 'blank')[]
    bottom: ('flat' | 'tab' | 'blank')[]
    left: ('flat' | 'tab' | 'blank')[]
  } = {
    top: [],
    right: [],
    bottom: [],
    left: [],
  }

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    if (row === 0) {
      edges.top[i] = 'flat'
    } else {
      edges.top[i] = edges.bottom[i - cols] === 'tab' ? 'blank' : 'tab'
    }

    if (col === cols - 1) {
      edges.right[i] = 'flat'
    } else {
      edges.right[i] = rand() > 0.5 ? 'tab' : 'blank'
    }

    if (row === rows - 1) {
      edges.bottom[i] = 'flat'
    } else {
      edges.bottom[i] = edges.top[i + cols] === 'tab' ? 'blank' : 'tab'
    }

    if (col === 0) {
      edges.left[i] = 'flat'
    } else {
      edges.left[i] = edges.right[i - 1] === 'tab' ? 'blank' : 'tab'
    }
  }

  return edges
}

function drawPuzzlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  edges: PuzzlePieceData['edges'],
  tabSize: number
) {
  ctx.beginPath()
  ctx.moveTo(x, y)

  if (edges.top === 'flat') {
    ctx.lineTo(x + width, y)
  } else {
    const tabDir = edges.top === 'tab' ? -1 : 1
    const tabW = width * 0.4
    const tabH = tabSize
    const cx = x + width / 2
    ctx.lineTo(cx - tabW / 2, y)
    ctx.bezierCurveTo(
      cx - tabW / 2,
      y + tabDir * tabH * 0.5,
      cx + tabW / 2,
      y + tabDir * tabH * 0.5,
      cx + tabW / 2,
      y
    )
    ctx.lineTo(x + width, y)
  }

  if (edges.right === 'flat') {
    ctx.lineTo(x + width, y + height)
  } else {
    const tabDir = edges.right === 'tab' ? 1 : -1
    const tabW = tabSize
    const tabH = height * 0.4
    const cy = y + height / 2
    ctx.lineTo(x + width, cy - tabH / 2)
    ctx.bezierCurveTo(
      x + width + tabDir * tabW * 0.5,
      cy - tabH / 2,
      x + width + tabDir * tabW * 0.5,
      cy + tabH / 2,
      x + width,
      cy + tabH / 2
    )
    ctx.lineTo(x + width, y + height)
  }

  if (edges.bottom === 'flat') {
    ctx.lineTo(x, y + height)
  } else {
    const tabDir = edges.bottom === 'tab' ? 1 : -1
    const tabW = width * 0.4
    const tabH = tabSize
    const cx = x + width / 2
    ctx.lineTo(cx + tabW / 2, y + height)
    ctx.bezierCurveTo(
      cx + tabW / 2,
      y + height + tabDir * tabH * 0.5,
      cx - tabW / 2,
      y + height + tabDir * tabH * 0.5,
      cx - tabW / 2,
      y + height
    )
    ctx.lineTo(x, y + height)
  }

  if (edges.left === 'flat') {
    ctx.lineTo(x, y)
  } else {
    const tabDir = edges.left === 'tab' ? -1 : 1
    const tabW = tabSize
    const tabH = height * 0.4
    const cy = y + height / 2
    ctx.lineTo(x, cy + tabH / 2)
    ctx.bezierCurveTo(
      x + tabDir * tabW * 0.5,
      cy + tabH / 2,
      x + tabDir * tabW * 0.5,
      cy - tabH / 2,
      x,
      cy - tabH / 2
    )
    ctx.lineTo(x, y)
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
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(0.3, '#feca57')
      gradient.addColorStop(0.6, '#ff9ff3')
      gradient.addColorStop(1, '#48dbfb')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      
      ctx.fillStyle = '#ffeaa7'
      ctx.beginPath()
      ctx.arc(width * 0.7, height * 0.35, 60, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      for (let i = 0; i < 5; i++) {
        const cx = (i + 0.5) * width / 5
        const cy = height * 0.7 + Math.sin(i) * 20
        ctx.beginPath()
        ctx.arc(cx, cy, 30 + i * 5, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }

    case 'ocean': {
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#74b9ff')
      gradient.addColorStop(0.5, '#0984e3')
      gradient.addColorStop(1, '#0652DD')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 3
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        const y = height * (0.3 + i * 0.08)
        for (let x = 0; x <= width; x += 20) {
          const waveY = y + Math.sin((x + i * 50) * 0.02) * 15
          if (x === 0) ctx.moveTo(x, waveY)
          else ctx.lineTo(x, waveY)
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
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#a8e6cf')
      gradient.addColorStop(0.4, '#88d8b0')
      gradient.addColorStop(1, '#56ab2f')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      const trees = [
        { x: 0.1, y: 0.6, h: 0.35 },
        { x: 0.25, y: 0.55, h: 0.4 },
        { x: 0.4, y: 0.62, h: 0.32 },
        { x: 0.55, y: 0.58, h: 0.38 },
        { x: 0.7, y: 0.6, h: 0.36 },
        { x: 0.85, y: 0.56, h: 0.42 },
        { x: 0.15, y: 0.75, h: 0.25 },
        { x: 0.5, y: 0.78, h: 0.22 },
        { x: 0.8, y: 0.76, h: 0.24 },
      ]

      trees.forEach((tree, i) => {
        const tx = tree.x * width
        const ty = tree.y * height
        const th = tree.h * height
        const tw = th * 0.4

        ctx.fillStyle = '#6d4c41'
        ctx.fillRect(tx - tw * 0.1, ty, tw * 0.2, th * 0.4)

        const green = ['#2e7d32', '#388e3c', '#43a047'][i % 3]
        ctx.fillStyle = green
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
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.7
      )
      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(0.5, '#16213e')
      gradient.addColorStop(1, '#0f0f1a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < 200; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const r = Math.random() * 2 + 0.5
        const alpha = Math.random() * 0.8 + 0.2
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      const nebula = ctx.createRadialGradient(
        width * 0.3, height * 0.4, 0,
        width * 0.3, height * 0.4, width * 0.3
      )
      nebula.addColorStop(0, 'rgba(156, 89, 182, 0.6)')
      nebula.addColorStop(0.5, 'rgba(156, 89, 182, 0.2)')
      nebula.addColorStop(1, 'transparent')
      ctx.fillStyle = nebula
      ctx.fillRect(0, 0, width, height)

      const nebula2 = ctx.createRadialGradient(
        width * 0.7, height * 0.6, 0,
        width * 0.7, height * 0.6, width * 0.25
      )
      nebula2.addColorStop(0, 'rgba(236, 64, 122, 0.5)')
      nebula2.addColorStop(0.5, 'rgba(236, 64, 122, 0.15)')
      nebula2.addColorStop(1, 'transparent')
      ctx.fillStyle = nebula2
      ctx.fillRect(0, 0, width, height)
      break
    }

    case 'cityscape': {
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#2c3e50')
      gradient.addColorStop(0.6, '#34495e')
      gradient.addColorStop(1, '#1a252f')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = '#f39c12'
      ctx.beginPath()
      ctx.arc(width * 0.8, height * 0.2, 40, 0, Math.PI * 2)
      ctx.fill()

      const buildings = [
        { x: 0.02, w: 0.08, h: 0.55 },
        { x: 0.11, w: 0.06, h: 0.7 },
        { x: 0.18, w: 0.1, h: 0.45 },
        { x: 0.29, w: 0.07, h: 0.65 },
        { x: 0.37, w: 0.09, h: 0.8 },
        { x: 0.47, w: 0.06, h: 0.5 },
        { x: 0.54, w: 0.1, h: 0.75 },
        { x: 0.65, w: 0.07, h: 0.55 },
        { x: 0.73, w: 0.09, h: 0.7 },
        { x: 0.83, w: 0.07, h: 0.6 },
        { x: 0.91, w: 0.08, h: 0.5 },
      ]

      buildings.forEach((b) => {
        const bx = b.x * width
        const bw = b.w * width
        const bh = b.h * height
        const by = height - bh

        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(bx, by, bw, bh)

        ctx.fillStyle = '#ffeaa7'
        const windowW = bw * 0.12
        const windowH = bh * 0.04
        const gapX = bw * 0.1
        const gapY = bh * 0.05
        const cols = Math.floor((bw - gapX) / (windowW + gapX))
        const rows = Math.floor((bh - gapY) / (windowH + gapY))

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.3) {
              const wx = bx + gapX + c * (windowW + gapX)
              const wy = by + gapY + r * (windowH + gapY)
              ctx.fillRect(wx, wy, windowW, windowH)
            }
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
        const gradient = ctx.createRadialGradient(
          s.x * width, s.y * height, 0,
          s.x * width, s.y * height, s.r * width
        )
        gradient.addColorStop(0, s.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      })

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      for (let i = 0; i < 10; i++) {
        ctx.beginPath()
        ctx.moveTo(0, (i / 10) * height)
        ctx.bezierCurveTo(
          width * 0.3, (i / 10) * height + 50,
          width * 0.6, (i / 10) * height - 50,
          width, (i / 10) * height
        )
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

  const edges = generatePuzzleEdges(cols, rows, theme.length)
  
  const imageCanvas = generateThemeImage(theme, boardWidth, boardHeight)
  const imgCtx = imageCanvas.getContext('2d')!

  const pieces: PuzzlePieceData[] = []

  for (let i = 0; i < cols * rows; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    const pieceEdges = {
      top: edges.top[i],
      right: edges.right[i],
      bottom: edges.bottom[i],
      left: edges.left[i],
    }

    const pieceCanvas = document.createElement('canvas')
    pieceCanvas.width = pieceWidth + tabSize * 2
    pieceCanvas.height = pieceHeight + tabSize * 2
    const pieceCtx = pieceCanvas.getContext('2d')!

    drawPuzzlePath(
      pieceCtx,
      tabSize,
      tabSize,
      pieceWidth,
      pieceHeight,
      pieceEdges,
      tabSize
    )
    pieceCtx.clip()

    const srcX = col * pieceWidth - tabSize
    const srcY = row * pieceHeight - tabSize
    const srcW = pieceWidth + tabSize * 2
    const srcH = pieceHeight + tabSize * 2

    pieceCtx.drawImage(
      imageCanvas,
      srcX, srcY, srcW, srcH,
      0, 0, pieceCanvas.width, pieceCanvas.height
    )

    const imageData = pieceCtx.getImageData(0, 0, pieceCanvas.width, pieceCanvas.height)

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
      imageData,
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
  return (
    Math.abs(pieceX - correctX) < threshold &&
    Math.abs(pieceY - correctY) < threshold
  )
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function getShakeOffset(progress: number, amplitude: number = 8): number {
  const shakes = 3
  const phase = progress * shakes * Math.PI * 2
  return Math.sin(phase) * amplitude * (1 - progress)
}

export function getAdjacentPieces(
  pieceIndex: number,
  cols: number,
  rows: number
): number[] {
  const col = pieceIndex % cols
  const row = Math.floor(pieceIndex / cols)
  const adjacent: number[] = []

  if (row > 0) adjacent.push(pieceIndex - cols)
  if (col < cols - 1) adjacent.push(pieceIndex + 1)
  if (row < rows - 1) adjacent.push(pieceIndex + cols)
  if (col > 0) adjacent.push(pieceIndex - 1)

  return adjacent
}
