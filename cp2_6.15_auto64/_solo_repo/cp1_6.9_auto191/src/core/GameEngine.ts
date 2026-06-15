import {
  Cell,
  Ball,
  SoundWave,
  Fragment,
  Particle,
  TrailParticle,
  Difficulty,
  DIFFICULTY_CONFIGS,
  DifficultyConfig,
  GameState,
  GameStats,
  EngineSnapshot,
  WaveSegment,
} from './types'

const FRAGMENT_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA']

export class GameEngine {
  private maze: Cell[][] = []
  private ball: Ball
  private soundWaves: SoundWave[] = []
  private fragments: Fragment[] = []
  private particles: Particle[] = []
  private trail: TrailParticle[] = []
  private gameState: GameState = 'menu'
  private stats: GameStats
  private exitPosition: { x: number; y: number }
  private difficulty: Difficulty = 'normal'
  private config: DifficultyConfig
  private canvasSize: number
  private lastWaveTime: number = 0
  private waveInterval: number = 500
  private waveIdCounter: number = 0
  private particleIdCounter: number = 0
  private fragmentIdCounter: number = 0
  private startTime: number = 0
  private pauseTime: number = 0
  private totalPausedTime: number = 0
  private inputVector: { x: number; y: number } = { x: 0, y: 0 }
  private lastMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private onStatsChange: ((stats: GameStats) => void) | null = null
  private onGameStateChange: ((state: GameState) => void) | null = null

  constructor() {
    this.config = DIFFICULTY_CONFIGS.normal
    this.canvasSize = this.config.gridSize * this.config.cellSize
    this.ball = {
      x: this.config.cellSize * 0.5 + this.config.cellSize * 0.5,
      y: (this.config.gridSize - 0.5) * this.config.cellSize + this.config.cellSize * 0.5,
      radius: 12,
      speed: 3,
    }
    this.exitPosition = { x: 0, y: 0 }
    this.stats = { elapsedTime: 0, collectedFragments: 0, totalFragments: 0 }
  }

  setDifficulty(difficulty: Difficulty) {
    this.difficulty = difficulty
    this.config = DIFFICULTY_CONFIGS[difficulty]
    this.canvasSize = this.config.gridSize * this.config.cellSize
  }

  setCallbacks(
    onStatsChange: (stats: GameStats) => void,
    onGameStateChange: (state: GameState) => void
  ) {
    this.onStatsChange = onStatsChange
    this.onGameStateChange = onGameStateChange
  }

  setInputVector(x: number, y: number) {
    this.inputVector = { x, y }
  }

  setMousePosition(x: number, y: number) {
    this.lastMousePosition = { x, y }
  }

  startGame() {
    this.setDifficulty(this.difficulty)
    this.generateMaze()
    this.placeBallAndExit()
    this.generateFragments()
    this.soundWaves = []
    this.particles = []
    this.trail = []
    this.waveIdCounter = 0
    this.particleIdCounter = 0
    this.stats = {
      elapsedTime: 0,
      collectedFragments: 0,
      totalFragments: this.config.fragmentCount,
    }
    this.startTime = performance.now()
    this.totalPausedTime = 0
    this.gameState = 'playing'
    this.lastWaveTime = 0
    this.notifyStateChange()
    this.notifyStatsChange()
  }

  pauseGame() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused'
      this.pauseTime = performance.now()
      this.notifyStateChange()
    }
  }

  resumeGame() {
    if (this.gameState === 'paused') {
      this.totalPausedTime += performance.now() - this.pauseTime
      this.gameState = 'playing'
      this.notifyStateChange()
    }
  }

  getGameState(): GameState {
    return this.gameState
  }

  fireStrongPulse() {
    if (this.gameState !== 'playing') return

    const dx = this.lastMousePosition.x - this.ball.x
    const dy = this.lastMousePosition.y - this.ball.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return

    const dirX = dx / len
    const dirY = dy / len

    const wave: SoundWave = {
      id: this.waveIdCounter++,
      segments: [],
      maxLength: 250,
      currentLength: 0,
      color: '#FF00FF',
      bounceColor: '#FF00FF',
      birthTime: performance.now(),
      lifetime: 800,
      isStrongPulse: true,
      penetratedWalls: 0,
      directionX: dirX,
      directionY: dirY,
      startX: this.ball.x,
      startY: this.ball.y,
    }

    this.traceWave(wave)
    this.soundWaves.push(wave)
  }

  private generateMaze() {
    const size = this.config.gridSize
    this.maze = []

    for (let y = 0; y < size; y++) {
      const row: Cell[] = []
      for (let x = 0; x < size; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        })
      }
      this.maze.push(row)
    }

    const stack: Cell[] = []
    const startX = 0
    const startY = size - 1
    const startCell = this.maze[startY][startX]
    startCell.visited = true
    stack.push(startCell)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = this.getUnvisitedNeighbors(current)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        this.removeWall(current, next.cell, next.direction)
        next.cell.visited = true
        stack.push(next.cell)
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell) {
    const neighbors: { cell: Cell; direction: string }[] = []
    const { x, y } = cell

    if (y > 0 && !this.maze[y - 1][x].visited) {
      neighbors.push({ cell: this.maze[y - 1][x], direction: 'top' })
    }
    if (x < this.config.gridSize - 1 && !this.maze[y][x + 1].visited) {
      neighbors.push({ cell: this.maze[y][x + 1], direction: 'right' })
    }
    if (y < this.config.gridSize - 1 && !this.maze[y + 1][x].visited) {
      neighbors.push({ cell: this.maze[y + 1][x], direction: 'bottom' })
    }
    if (x > 0 && !this.maze[y][x - 1].visited) {
      neighbors.push({ cell: this.maze[y][x - 1], direction: 'left' })
    }

    return neighbors
  }

  private removeWall(current: Cell, next: Cell, direction: string) {
    switch (direction) {
      case 'top':
        current.walls.top = false
        next.walls.bottom = false
        break
      case 'right':
        current.walls.right = false
        next.walls.left = false
        break
      case 'bottom':
        current.walls.bottom = false
        next.walls.top = false
        break
      case 'left':
        current.walls.left = false
        next.walls.right = false
        break
    }
  }

  private placeBallAndExit() {
    const cs = this.config.cellSize
    this.ball = {
      x: cs * 0.5 + 2,
      y: (this.config.gridSize - 0.5) * cs + 2,
      radius: 12,
      speed: 3,
    }
    this.exitPosition = {
      x: (this.config.gridSize - 0.5) * cs + cs * 0.5,
      y: cs * 0.5 + cs * 0.5,
    }
  }

  private generateFragments() {
    this.fragments = []
    this.fragmentIdCounter = 0
    const cs = this.config.cellSize
    const count = this.config.fragmentCount
    const placedPositions = new Set<string>()
    const startKey = `0,${this.config.gridSize - 1}`
    const exitKey = `${this.config.gridSize - 1},0`
    placedPositions.add(startKey)
    placedPositions.add(exitKey)

    let attempts = 0
    while (this.fragments.length < count && attempts < count * 50) {
      attempts++
      const gx = Math.floor(Math.random() * this.config.gridSize)
      const gy = Math.floor(Math.random() * this.config.gridSize)
      const key = `${gx},${gy}`
      if (placedPositions.has(key)) continue
      placedPositions.add(key)

      const jitterX = (Math.random() - 0.5) * cs * 0.6
      const jitterY = (Math.random() - 0.5) * cs * 0.6

      this.fragments.push({
        id: this.fragmentIdCounter++,
        x: gx * cs + cs / 2 + jitterX + cs * 0.5,
        y: gy * cs + cs / 2 + jitterY + cs * 0.5,
        radius: 6,
        color: FRAGMENT_COLORS[Math.floor(Math.random() * FRAGMENT_COLORS.length)],
        collected: false,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  update(timestamp: number) {
    if (this.gameState !== 'playing') return

    const elapsedMs = timestamp - this.startTime - this.totalPausedTime
    this.stats.elapsedTime = Math.min(this.config.timeLimit, Math.floor(elapsedMs / 1000))
    this.notifyStatsChange()

    if (this.stats.elapsedTime >= this.config.timeLimit) {
      this.gameState = 'lost'
      this.notifyStateChange()
      return
    }

    this.updateBall()
    this.updateTrail()

    if (timestamp - this.lastWaveTime >= this.waveInterval) {
      this.emitRadialWaves(timestamp)
      this.lastWaveTime = timestamp
    }

    this.cleanupWaves(timestamp)
    this.updateParticles(timestamp)
    this.checkFragmentCollection()
    this.checkExitReached()
  }

  private updateBall() {
    const { x: ix, y: iy } = this.inputVector
    const len = Math.sqrt(ix * ix + iy * iy)
    if (len === 0) return

    const dx = (ix / len) * this.ball.speed
    const dy = (iy / len) * this.ball.speed

    const newX = this.ball.x + dx
    const newY = this.ball.y + dy

    if (!this.checkBallCollision(newX, this.ball.y)) {
      this.ball.x = newX
    }
    if (!this.checkBallCollision(this.ball.x, newY)) {
      this.ball.y = newY
    }
  }

  private checkBallCollision(x: number, y: number): boolean {
    const cs = this.config.cellSize
    const offset = cs * 0.5
    const r = this.ball.radius

    const gx = Math.floor((x - offset) / cs)
    const gy = Math.floor((y - offset) / cs)

    if (gx < 0 || gx >= this.config.gridSize || gy < 0 || gy >= this.config.gridSize) {
      return true
    }

    const cellCenterX = gx * cs + cs / 2 + offset
    const cellCenterY = gy * cs + cs / 2 + offset
    const localX = x - cellCenterX
    const localY = y - cellCenterY
    const half = cs / 2

    const cell = this.maze[gy][gx]

    if (cell.walls.top && localY - r < -half + 2) return true
    if (cell.walls.bottom && localY + r > half - 2) return true
    if (cell.walls.left && localX - r < -half + 2) return true
    if (cell.walls.right && localX + r > half - 2) return true

    return false
  }

  private updateTrail() {
    const { x: ix, y: iy } = this.inputVector
    if (ix !== 0 || iy !== 0) {
      this.trail.push({
        x: this.ball.x,
        y: this.ball.y,
        life: 1,
      })
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= 0.05
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1)
      }
    }

    if (this.trail.length > 20) {
      this.trail.splice(0, this.trail.length - 20)
    }
  }

  private emitRadialWaves(timestamp: number) {
    const directions = 8
    for (let i = 0; i < directions; i++) {
      const angle = (i / directions) * Math.PI * 2
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)

      const wave: SoundWave = {
        id: this.waveIdCounter++,
        segments: [],
        maxLength: 120,
        currentLength: 0,
        color: '#00FFFF',
        bounceColor: '#FF8800',
        birthTime: timestamp,
        lifetime: 600,
        isStrongPulse: false,
        penetratedWalls: 0,
        directionX: dirX,
        directionY: dirY,
        startX: this.ball.x,
        startY: this.ball.y,
      }

      this.traceWave(wave)
      this.soundWaves.push(wave)
    }
  }

  private traceWave(wave: SoundWave) {
    let x = wave.startX
    let y = wave.startY
    let dirX = wave.directionX
    let dirY = wave.directionY
    let remainingLength = wave.maxLength
    let currentColor = wave.color
    let bounceCount = 0
    const maxBounces = wave.isStrongPulse ? 2 : 1

    while (remainingLength > 0 && bounceCount <= maxBounces) {
      const result = this.castRay(x, y, dirX, dirY, remainingLength)

      const segment: WaveSegment = {
        x1: x,
        y1: y,
        x2: result.hitX,
        y2: result.hitY,
        color: currentColor,
      }
      wave.segments.push(segment)
      wave.currentLength += result.distance

      if (!result.hitWall) break

      if (wave.isStrongPulse && wave.penetratedWalls < 1 && result.wallThickness === 'thin') {
        wave.penetratedWalls++
        const nx = result.hitX + dirX * 4
        const ny = result.hitY + dirY * 4
        x = nx
        y = ny
        continue
      }

      bounceCount++
      if (bounceCount > maxBounces) break

      const reflect = this.reflectVector(dirX, dirY, result.normalX, result.normalY)
      dirX = reflect.dx
      dirY = reflect.dy
      x = result.hitX + dirX * 0.5
      y = result.hitY + dirY * 0.5
      remainingLength -= result.distance
      currentColor = wave.bounceColor
    }
  }

  private castRay(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    maxDist: number
  ): {
    hitX: number
    hitY: number
    distance: number
    hitWall: boolean
    normalX: number
    normalY: number
    wallThickness: string
  } {
    const cs = this.config.cellSize
    const offset = cs * 0.5
    const steps = Math.ceil(maxDist / 2)
    let prevX = startX
    let prevY = startY

    for (let i = 1; i <= steps; i++) {
      const t = Math.min((i * 2) / maxDist, 1)
      const px = startX + dirX * maxDist * t
      const py = startY + dirY * maxDist * t

      const gx = Math.floor((px - offset) / cs)
      const gy = Math.floor((py - offset) / cs)

      if (gx < 0 || gx >= this.config.gridSize || gy < 0 || gy >= this.config.gridSize) {
        return {
          hitX: prevX,
          hitY: prevY,
          distance: Math.sqrt((prevX - startX) ** 2 + (prevY - startY) ** 2),
          hitWall: true,
          normalX: -dirX,
          normalY: -dirY,
          wallThickness: 'thick',
        }
      }

      const cell = this.maze[gy][gx]
      const cellCenterX = gx * cs + cs / 2 + offset
      const cellCenterY = gy * cs + cs / 2 + offset
      const localX = px - cellCenterX
      const localY = py - cellCenterY
      const half = cs / 2 - 1
      const thickness = 2

      let nx = 0
      let ny = 0
      let hit = false

      if (cell.walls.top && localY < -half + thickness && localY > -half - thickness) {
        ny = -1
        hit = true
      } else if (cell.walls.bottom && localY > half - thickness && localY < half + thickness) {
        ny = 1
        hit = true
      } else if (cell.walls.left && localX < -half + thickness && localX > -half - thickness) {
        nx = -1
        hit = true
      } else if (cell.walls.right && localX > half - thickness && localX < half + thickness) {
        nx = 1
        hit = true
      }

      if (hit) {
        return {
          hitX: prevX,
          hitY: prevY,
          distance: Math.sqrt((prevX - startX) ** 2 + (prevY - startY) ** 2),
          hitWall: true,
          normalX: nx,
          normalY: ny,
          wallThickness: 'thin',
        }
      }

      prevX = px
      prevY = py
    }

    return {
      hitX: startX + dirX * maxDist,
      hitY: startY + dirY * maxDist,
      distance: maxDist,
      hitWall: false,
      normalX: 0,
      normalY: 0,
      wallThickness: 'thin',
    }
  }

  private reflectVector(dx: number, dy: number, nx: number, ny: number) {
    const dot = dx * nx + dy * ny
    return {
      dx: dx - 2 * dot * nx,
      dy: dy - 2 * dot * ny,
    }
  }

  private cleanupWaves(timestamp: number) {
    this.soundWaves = this.soundWaves.filter(
      (w) => timestamp - w.birthTime < w.lifetime
    )
  }

  private updateParticles(timestamp: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const elapsed = timestamp - (p as any)._birthTime
      const t = elapsed / p.maxLife

      if (t >= 1) {
        this.particles.splice(i, 1)
        continue
      }

      p.x += p.vx
      p.y += p.vy
      p.life = 1 - t
    }
  }

  private checkFragmentCollection() {
    for (const frag of this.fragments) {
      if (frag.collected) continue

      const dx = this.ball.x - frag.x
      const dy = this.ball.y - frag.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 25) {
        frag.collected = true
        this.stats.collectedFragments++
        this.notifyStatsChange()
        this.spawnCollectParticles(frag.x, frag.y, frag.color)
      }
    }
  }

  private spawnCollectParticles(x: number, y: number, color: string) {
    const now = performance.now()
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2
      const speed = 1 + Math.random() * 2
      const p: Particle & { _birthTime: number } = {
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 500,
        color,
        size: 2 + Math.random() * 2,
        _birthTime: now,
      }
      this.particles.push(p)
    }
  }

  private checkExitReached() {
    const dx = this.ball.x - this.exitPosition.x
    const dy = this.ball.y - this.exitPosition.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 25) {
      this.gameState = 'won'
      this.notifyStateChange()
    }
  }

  private notifyStatsChange() {
    if (this.onStatsChange) {
      this.onStatsChange({ ...this.stats })
    }
  }

  private notifyStateChange() {
    if (this.onGameStateChange) {
      this.onGameStateChange(this.gameState)
    }
  }

  getSnapshot(): EngineSnapshot {
    return {
      maze: this.maze,
      ball: { ...this.ball },
      soundWaves: this.soundWaves.map((w) => ({
        ...w,
        segments: w.segments.map((s) => ({ ...s })),
      })),
      fragments: this.fragments.map((f) => ({ ...f })),
      particles: this.particles.map((p) => ({ ...p })),
      trail: this.trail.map((t) => ({ ...t })),
      stats: { ...this.stats },
      gameState: this.gameState,
      exitPosition: { ...this.exitPosition },
      difficulty: this.difficulty,
      canvasSize: this.canvasSize,
    }
  }

  getTimeLimit(): number {
    return this.config.timeLimit
  }
}
