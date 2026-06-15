export interface Mirror {
  col: number
  row: number
  angle: number
  isDragging: boolean
}

export interface Crystal {
  col: number
  row: number
  collected: boolean
}

export interface Exit {
  col: number
  row: number
  unlocked: boolean
}

export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface MazeCell {
  col: number
  row: number
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

export class Maze {
  cols: number
  rows: number
  cellSize: number
  cells: MazeCell[][]
  mirrors: Mirror[]
  crystals: Crystal[]
  exit: Exit
  laserSource: { col: number; row: number; direction: number }
  offsetX: number
  offsetY: number
  wallSegments: WallSegment[]
  pulseTime: number

  constructor(cols: number, rows: number, canvasWidth: number, canvasHeight: number) {
    this.cols = cols
    this.rows = rows
    this.cellSize = Math.floor(Math.min((canvasWidth * 0.8) / cols, (canvasHeight * 0.8) / rows))
    this.cells = []
    this.mirrors = []
    this.crystals = []
    this.pulseTime = 0
    this.laserSource = { col: 0, row: 0, direction: 0 }

    const mazeWidth = cols * this.cellSize
    const mazeHeight = rows * this.cellSize
    this.offsetX = Math.floor((canvasWidth - mazeWidth) / 2)
    this.offsetY = Math.floor((canvasHeight - mazeHeight) / 2)

    this.exit = { col: cols - 1, row: rows - 1, unlocked: false }

    this.generate()
    this.placeMirrors()
    this.placeCrystals()
    this.buildWallSegments()
  }

  generate() {
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = []
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = {
          col: c,
          row: r,
          walls: { top: true, right: true, bottom: true, left: true }
        }
      }
    }

    const visited: boolean[][] = Array.from({ length: this.rows }, () => Array(this.cols).fill(false))
    const stack: { col: number; row: number }[] = []
    const startR = 0
    const startC = 0
    visited[startR][startC] = true
    stack.push({ col: startC, row: startR })

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = this.getUnvisitedNeighbors(current.col, current.row, visited)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        this.removeWallBetween(current.col, current.row, next.col, next.row)
        visited[next.row][next.col] = true
        stack.push(next)
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.random() < 0.15) {
          const dirs = ['top', 'right', 'bottom', 'left'] as const
          const dir = dirs[Math.floor(Math.random() * dirs.length)]
          const nr = r + (dir === 'bottom' ? 1 : dir === 'top' ? -1 : 0)
          const nc = c + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            this.removeWallBetween(c, r, nc, nr)
          }
        }
      }
    }

    this.laserSource = { col: 0, row: 0, direction: Math.PI * 0.5 }
  }

  getUnvisitedNeighbors(col: number, row: number, visited: boolean[][]): { col: number; row: number }[] {
    const neighbors: { col: number; row: number }[] = []
    const dirs = [
      { dc: 0, dr: -1 },
      { dc: 1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 }
    ]
    for (const d of dirs) {
      const nc = col + d.dc
      const nr = row + d.dr
      if (nc >= 0 && nc < this.cols && nr >= 0 && nr < this.rows && !visited[nr][nc]) {
        neighbors.push({ col: nc, row: nr })
      }
    }
    return neighbors
  }

  removeWallBetween(c1: number, r1: number, c2: number, r2: number) {
    const dc = c2 - c1
    const dr = r2 - r1
    if (dc === 1) {
      this.cells[r1][c1].walls.right = false
      this.cells[r2][c2].walls.left = false
    } else if (dc === -1) {
      this.cells[r1][c1].walls.left = false
      this.cells[r2][c2].walls.right = false
    } else if (dr === 1) {
      this.cells[r1][c1].walls.bottom = false
      this.cells[r2][c2].walls.top = false
    } else if (dr === -1) {
      this.cells[r1][c1].walls.top = false
      this.cells[r2][c2].walls.bottom = false
    }
  }

  placeMirrors() {
    this.mirrors = []
    const count = Math.max(3, Math.floor(this.cols * this.rows * 0.12))
    const used = new Set<string>()
    used.add('0,0')
    used.add(`${this.exit.col},${this.exit.row}`)

    while (this.mirrors.length < count) {
      const c = Math.floor(Math.random() * this.cols)
      const r = Math.floor(Math.random() * this.rows)
      const key = `${c},${r}`
      if (!used.has(key)) {
        used.add(key)
        this.mirrors.push({
          col: c,
          row: r,
          angle: (Math.floor(Math.random() * 4) * Math.PI) / 4,
          isDragging: false
        })
      }
    }
  }

  placeCrystals() {
    this.crystals = []
    const count = Math.max(2, Math.floor(this.cols * this.rows * 0.08))
    const used = new Set<string>()
    used.add('0,0')
    used.add(`${this.exit.col},${this.exit.row}`)
    for (const m of this.mirrors) used.add(`${m.col},${m.row}`)

    while (this.crystals.length < count) {
      const c = Math.floor(Math.random() * this.cols)
      const r = Math.floor(Math.random() * this.rows)
      const key = `${c},${r}`
      if (!used.has(key)) {
        used.add(key)
        this.crystals.push({ col: c, row: r, collected: false })
      }
    }
  }

  buildWallSegments() {
    this.wallSegments = []
    const cs = this.cellSize
    const ox = this.offsetX
    const oy = this.offsetY

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c]
        const x = ox + c * cs
        const y = oy + r * cs
        if (cell.walls.top) {
          this.wallSegments.push({ x1: x, y1: y, x2: x + cs, y2: y })
        }
        if (cell.walls.right) {
          this.wallSegments.push({ x1: x + cs, y1: y, x2: x + cs, y2: y + cs })
        }
        if (cell.walls.bottom) {
          this.wallSegments.push({ x1: x, y1: y + cs, x2: x + cs, y2: y + cs })
        }
        if (cell.walls.left) {
          this.wallSegments.push({ x1: x, y1: y, x2: x, y2: y + cs })
        }
      }
    }
  }

  getCellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize / 2
    }
  }

  getMirrorAtPixel(px: number, py: number): Mirror | null {
    const hitRadius = this.cellSize * 0.4
    for (const m of this.mirrors) {
      const center = this.getCellCenter(m.col, m.row)
      const dx = px - center.x
      const dy = py - center.y
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        return m
      }
    }
    return null
  }

  checkWallCollision(px: number, py: number, radius: number): boolean {
    for (const seg of this.wallSegments) {
      const dist = this.pointToSegmentDist(px, py, seg.x1, seg.y1, seg.x2, seg.y2)
      if (dist < radius) return true
    }
    return false
  }

  pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.hypot(px - projX, py - projY)
  }

  checkCrystalCollection(px: number, py: number, radius: number): Crystal | null {
    for (const c of this.crystals) {
      if (c.collected) continue
      const center = this.getCellCenter(c.col, c.row)
      const dx = px - center.x
      const dy = py - center.y
      if (dx * dx + dy * dy < (radius + this.cellSize * 0.2) ** 2) {
        return c
      }
    }
    return null
  }

  checkExit(px: number, py: number, radius: number): boolean {
    if (!this.exit.unlocked) return false
    const center = this.getCellCenter(this.exit.col, this.exit.row)
    const dx = px - center.x
    const dy = py - center.y
    return dx * dx + dy * dy < (radius + this.cellSize * 0.3) ** 2
  }

  update(dt: number) {
    this.pulseTime += dt
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    const cs = this.cellSize
    const ox = this.offsetX
    const oy = this.offsetY

    this.renderWalls(ctx, time, cs, ox, oy)
    this.renderExit(ctx, time, cs, ox, oy)
    this.renderCrystals(ctx, time, cs, ox, oy)
    this.renderMirrors(ctx, time, cs, ox, oy)
  }

  renderWalls(ctx: CanvasRenderingContext2D, time: number, cs: number, ox: number, oy: number) {
    ctx.save()
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    const glowIntensity = 0.6 + 0.15 * Math.sin(time * 2)

    for (const seg of this.wallSegments) {
      const gradient = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2)
      gradient.addColorStop(0, `rgba(0, 180, 255, ${glowIntensity * 0.8})`)
      gradient.addColorStop(0.5, `rgba(0, 220, 255, ${glowIntensity})`)
      gradient.addColorStop(1, `rgba(0, 180, 255, ${glowIntensity * 0.8})`)

      ctx.strokeStyle = gradient
      ctx.shadowColor = 'rgba(0, 200, 255, 0.6)'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(seg.x1, seg.y1)
      ctx.lineTo(seg.x2, seg.y2)
      ctx.stroke()
    }

    ctx.shadowBlur = 0
    ctx.restore()
  }

  renderExit(ctx: CanvasRenderingContext2D, time: number, cs: number, ox: number, oy: number) {
    const center = this.getCellCenter(this.exit.col, this.exit.row)
    const pulse = 0.5 + 0.3 * Math.sin(time * 3)

    ctx.save()
    if (this.exit.unlocked) {
      ctx.shadowColor = 'rgba(0, 255, 100, 0.8)'
      ctx.shadowBlur = 20
      ctx.strokeStyle = `rgba(0, 255, 100, ${pulse})`
      ctx.lineWidth = 3
      ctx.strokeRect(center.x - cs * 0.35, center.y - cs * 0.35, cs * 0.7, cs * 0.7)

      ctx.fillStyle = `rgba(0, 255, 100, ${pulse * 0.3})`
      ctx.fillRect(center.x - cs * 0.35, center.y - cs * 0.35, cs * 0.7, cs * 0.7)
    } else {
      ctx.shadowColor = 'rgba(255, 50, 50, 0.6)'
      ctx.shadowBlur = 12
      ctx.strokeStyle = `rgba(255, 80, 80, ${pulse * 0.7})`
      ctx.lineWidth = 2
      ctx.strokeRect(center.x - cs * 0.35, center.y - cs * 0.35, cs * 0.7, cs * 0.7)

      ctx.fillStyle = `rgba(255, 50, 50, ${pulse * 0.15})`
      ctx.fillRect(center.x - cs * 0.35, center.y - cs * 0.35, cs * 0.7, cs * 0.7)
    }
    ctx.restore()
  }

  renderCrystals(ctx: CanvasRenderingContext2D, time: number, cs: number, ox: number, oy: number) {
    for (const crystal of this.crystals) {
      if (crystal.collected) continue
      const center = this.getCellCenter(crystal.col, crystal.row)
      const bob = Math.sin(time * 2.5 + crystal.col * 0.7 + crystal.row * 1.3) * 3

      ctx.save()
      ctx.shadowColor = 'rgba(255, 200, 0, 0.8)'
      ctx.shadowBlur = 15

      const size = cs * 0.15
      ctx.translate(center.x, center.y + bob)
      ctx.rotate(time * 1.5 + crystal.col)

      ctx.fillStyle = 'rgba(255, 220, 50, 0.9)'
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size * 0.7, 0)
      ctx.lineTo(0, size)
      ctx.lineTo(-size * 0.7, 0)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 150, 0.8)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()
    }
  }

  renderMirrors(ctx: CanvasRenderingContext2D, time: number, cs: number, ox: number, oy: number) {
    for (const mirror of this.mirrors) {
      const center = this.getCellCenter(mirror.col, mirror.row)
      const halfLen = cs * 0.35

      ctx.save()
      ctx.translate(center.x, center.y)
      ctx.rotate(mirror.angle)

      ctx.shadowColor = mirror.isDragging ? 'rgba(200, 200, 255, 1)' : 'rgba(150, 180, 255, 0.7)'
      ctx.shadowBlur = mirror.isDragging ? 18 : 10

      const grad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0)
      grad.addColorStop(0, 'rgba(180, 200, 255, 0.3)')
      grad.addColorStop(0.5, 'rgba(220, 230, 255, 0.9)')
      grad.addColorStop(1, 'rgba(180, 200, 255, 0.3)')

      ctx.strokeStyle = grad
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-halfLen, 0)
      ctx.lineTo(halfLen, 0)
      ctx.stroke()

      const shimmer = 0.3 + 0.2 * Math.sin(time * 4 + mirror.col * 2 + mirror.row * 3)
      ctx.strokeStyle = `rgba(255, 255, 255, ${shimmer})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-halfLen * 0.8, 0)
      ctx.lineTo(halfLen * 0.8, 0)
      ctx.stroke()

      ctx.fillStyle = 'rgba(200, 220, 255, 0.5)'
      ctx.beginPath()
      ctx.moveTo(0, -halfLen * 0.6)
      ctx.lineTo(halfLen * 0.15, 0)
      ctx.lineTo(0, halfLen * 0.6)
      ctx.lineTo(-halfLen * 0.15, 0)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }
  }

  renderMinimap(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, laserSegments: { startX: number; startY: number; endX: number; endY: number }[]) {
    const mazeWidth = this.cols * this.cellSize
    const mazeHeight = this.rows * this.cellSize
    const scale = size / Math.max(mazeWidth, mazeHeight)

    ctx.save()

    ctx.fillStyle = 'rgba(10, 5, 30, 0.7)'
    ctx.strokeStyle = 'rgba(100, 130, 200, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, size, size, 8)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.roundRect(x, y, size, size, 8)
    ctx.clip()

    const mx = x + (size - mazeWidth * scale) / 2
    const my = y + (size - mazeHeight * scale) / 2

    ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)'
    ctx.lineWidth = 1
    for (const seg of this.wallSegments) {
      ctx.beginPath()
      ctx.moveTo(mx + (seg.x1 - this.offsetX) * scale, my + (seg.y1 - this.offsetY) * scale)
      ctx.lineTo(mx + (seg.x2 - this.offsetX) * scale, my + (seg.y2 - this.offsetY) * scale)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(255, 100, 50, 0.8)'
    ctx.lineWidth = 1
    for (const seg of laserSegments) {
      ctx.beginPath()
      ctx.moveTo(mx + (seg.startX - this.offsetX) * scale, my + (seg.startY - this.offsetY) * scale)
      ctx.lineTo(mx + (seg.endX - this.offsetX) * scale, my + (seg.endY - this.offsetY) * scale)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(255, 220, 0, 0.9)'
    for (const m of this.mirrors) {
      const center = this.getCellCenter(m.col, m.row)
      ctx.fillRect(mx + (center.x - this.offsetX) * scale - 2, my + (center.y - this.offsetY) * scale - 2, 4, 4)
    }

    ctx.fillStyle = 'rgba(0, 255, 100, 0.8)'
    if (this.exit.unlocked) {
      const ec = this.getCellCenter(this.exit.col, this.exit.row)
      ctx.fillRect(mx + (ec.x - this.offsetX) * scale - 3, my + (ec.y - this.offsetY) * scale - 3, 6, 6)
    }

    ctx.restore()
  }
}
