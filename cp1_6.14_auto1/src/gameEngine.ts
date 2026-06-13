export type AsteroidSize = 'large' | 'medium' | 'small'
export type MineralType = 'iron' | 'silicon' | 'rare'

export interface Ship {
  x: number
  y: number
  vx: number
  vy: number
  health: number
  maxHealth: number
  speedMultiplier: number
  weaponLevel: number
  minerals: Record<MineralType, number>
  ironSpeedBonus: number
}

export interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  size: AsteroidSize
  radius: number
  color: string
  alive: boolean
}

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  startX: number
  startY: number
  maxDistance: number
  alive: boolean
}

export interface MineralFragment {
  x: number
  y: number
  vx: number
  vy: number
  type: MineralType
  color: string
  radius: number
  lifetime: number
  age: number
  alive: boolean
}

export interface Star {
  x: number
  y: number
  size: number
}

export interface WaveAlert {
  active: boolean
  timer: number
  maxTimer: number
}

export interface GameState {
  ship: Ship
  asteroids: Asteroid[]
  bullets: Bullet[]
  fragments: MineralFragment[]
  stars: Star[]
  score: number
  waveAlert: WaveAlert
  waveTimer: number
  waveInterval: number
  lastFireTime: number
  fireRate: number
  gameOver: boolean
  asteroidSpawnTimer: number
  canvasWidth: number
  canvasHeight: number
  mouseX: number
  mouseY: number
  keys: Set<string>
  time: number
}

const ASTEROID_COLORS: Record<AsteroidSize, string> = {
  large: '#78716c',
  medium: '#a8a29e',
  small: '#fde047',
}

const ASTEROID_RADIUS_RANGE: Record<AsteroidSize, [number, number]> = {
  large: [20, 30],
  medium: [10, 17.5],
  small: [4, 9],
}

const MINERAL_COLORS: Record<MineralType, string> = {
  iron: '#fb923c',
  silicon: '#93c5fd',
  rare: '#c084fc',
}

const BULLET_COLORS: string[] = ['#67e8f9', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe']

const GRID_CELL_SIZE = 100

class SpatialGrid {
  cells: Map<number, number[]>
  cols: number
  rows: number

  constructor(public width: number, public height: number) {
    this.cols = Math.ceil(width / GRID_CELL_SIZE)
    this.rows = Math.ceil(height / GRID_CELL_SIZE)
    this.cells = new Map()
  }

  clear() {
    this.cells.clear()
  }

  private cellKey(col: number, row: number): number {
    return row * this.cols + col
  }

  insert(index: number, x: number, y: number) {
    const col = Math.floor(x / GRID_CELL_SIZE)
    const row = Math.floor(y / GRID_CELL_SIZE)
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return
    const key = this.cellKey(col, row)
    let cell = this.cells.get(key)
    if (!cell) {
      cell = []
      this.cells.set(key, cell)
    }
    cell.push(index)
  }

  query(x: number, y: number, radius: number): number[] {
    const result: number[] = []
    const minCol = Math.max(0, Math.floor((x - radius) / GRID_CELL_SIZE))
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / GRID_CELL_SIZE))
    const minRow = Math.max(0, Math.floor((y - radius) / GRID_CELL_SIZE))
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / GRID_CELL_SIZE))
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = this.cells.get(this.cellKey(c, r))
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            result.push(cell[i])
          }
        }
      }
    }
    return result
  }
}

function createAsteroid(canvasWidth: number, canvasHeight: number, size?: AsteroidSize, x?: number, y?: number, vx?: number, vy?: number): Asteroid {
  const sz = size || (['large', 'medium', 'small'] as AsteroidSize)[Math.floor(Math.random() * 3)]
  const [minR, maxR] = ASTEROID_RADIUS_RANGE[sz]
  const radius = minR + Math.random() * (maxR - minR)

  let ax: number, ay: number, avx: number, avy: number
  if (x !== undefined && y !== undefined) {
    ax = x
    ay = y
    avx = vx ?? (40 + Math.random() * 80)
    avy = vy ?? (40 + Math.random() * 80)
  } else {
    const side = Math.floor(Math.random() * 4)
    const offset = 20 + Math.random() * 80
    switch (side) {
      case 0:
        ax = Math.random() * canvasWidth
        ay = -offset
        break
      case 1:
        ax = canvasWidth + offset
        ay = Math.random() * canvasHeight
        break
      case 2:
        ax = Math.random() * canvasWidth
        ay = canvasHeight + offset
        break
      default:
        ax = -offset
        ay = Math.random() * canvasHeight
        break
    }
    const speed = 40 + Math.random() * 80
    const angle = Math.atan2(canvasHeight / 2 - ay, canvasWidth / 2 - ax) + (Math.random() - 0.5) * 1.2
    avx = Math.cos(angle) * speed
    avy = Math.sin(angle) * speed
  }

  return {
    x: ax,
    y: ay,
    vx: avx,
    vy: avy,
    size: sz,
    radius,
    color: ASTEROID_COLORS[sz],
    alive: true,
  }
}

function createFragment(x: number, y: number, type: MineralType): MineralFragment {
  const angle = Math.random() * Math.PI * 2
  const speed = 30 + Math.random() * 50
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    type,
    color: MINERAL_COLORS[type],
    radius: 2 + Math.random() * 2,
    lifetime: 1.5,
    age: 0,
    alive: true,
  }
}

export function createGameState(canvasWidth: number, canvasHeight: number): GameState {
  const stars: Star[] = []
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: 1 + Math.random() * 2,
    })
  }

  return {
    ship: {
      x: canvasWidth / 2,
      y: canvasHeight * 0.8,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      speedMultiplier: 1,
      weaponLevel: 1,
      minerals: { iron: 0, silicon: 0, rare: 0 },
      ironSpeedBonus: 0,
    },
    asteroids: [],
    bullets: [],
    fragments: [],
    stars,
    score: 0,
    waveAlert: { active: false, timer: 0, maxTimer: 2 },
    waveTimer: 0,
    waveInterval: 15,
    lastFireTime: 0,
    fireRate: 5,
    gameOver: false,
    asteroidSpawnTimer: 0,
    canvasWidth,
    canvasHeight,
    mouseX: canvasWidth / 2,
    mouseY: 0,
    keys: new Set(),
    time: 0,
  }
}

function getBulletColor(weaponLevel: number): string {
  const idx = Math.min(weaponLevel - 1, BULLET_COLORS.length - 1)
  return BULLET_COLORS[idx]
}

function getBulletMaxDistance(weaponLevel: number): number {
  return 500 + (weaponLevel - 1) * 50
}

function getFireRate(weaponLevel: number): number {
  return 5 + (weaponLevel - 1) * 0.5
}

export function updateGame(state: GameState, dt: number): void {
  if (state.gameOver) return

  state.time += dt

  updateShip(state, dt)
  updateBullets(state, dt)
  updateAsteroids(state, dt)
  updateFragments(state, dt)
  updateStars(state, dt)
  checkBulletAsteroidCollisions(state)
  checkShipFragmentCollisions(state)
  checkShipAsteroidCollisions(state)
  spawnAsteroids(state, dt)
  updateWaves(state, dt)
  updateWaveAlert(state, dt)
  checkUpgrades(state)
  cleanupDead(state)
}

function updateShip(state: GameState, dt: number): void {
  const ship = state.ship
  const baseSpeedX = 400 * ship.speedMultiplier
  const baseSpeedY = 300 * ship.speedMultiplier
  const damping = 0.02

  let ax = 0, ay = 0
  if (state.keys.has('a') || state.keys.has('arrowleft')) ax -= 1
  if (state.keys.has('d') || state.keys.has('arrowright')) ax += 1
  if (state.keys.has('w') || state.keys.has('arrowup')) ay -= 1
  if (state.keys.has('s') || state.keys.has('arrowdown')) ay += 1

  const len = Math.sqrt(ax * ax + ay * ay)
  if (len > 0) {
    ax /= len
    ay /= len
  }

  ship.vx += ax * baseSpeedX * dt
  ship.vy += ay * baseSpeedY * dt

  ship.vx *= Math.pow(1 - damping, dt * 60)
  ship.vy *= Math.pow(1 - damping, dt * 60)

  ship.x += ship.vx * dt
  ship.y += ship.vy * dt

  ship.x = Math.max(20, Math.min(state.canvasWidth - 20, ship.x))
  ship.y = Math.max(20, Math.min(state.canvasHeight - 20, ship.y))
}

function updateBullets(state: GameState, dt: number): void {
  for (let i = 0; i < state.bullets.length; i++) {
    const b = state.bullets[i]
    if (!b.alive) continue
    b.x += b.vx * dt
    b.y += b.vy * dt
    const dx = b.x - b.startX
    const dy = b.y - b.startY
    if (dx * dx + dy * dy > b.maxDistance * b.maxDistance) {
      b.alive = false
    }
  }
}

function updateAsteroids(state: GameState, dt: number): void {
  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i]
    if (!a.alive) continue
    a.x += a.vx * dt
    a.y += a.vy * dt
    const margin = 150
    if (a.x < -margin || a.x > state.canvasWidth + margin ||
        a.y < -margin || a.y > state.canvasHeight + margin) {
      a.alive = false
    }
  }
}

function updateFragments(state: GameState, dt: number): void {
  for (let i = 0; i < state.fragments.length; i++) {
    const f = state.fragments[i]
    if (!f.alive) continue
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.age += dt
    if (f.age >= f.lifetime) {
      f.alive = false
    }
  }
}

function updateStars(state: GameState, dt: number): void {
  for (let i = 0; i < state.stars.length; i++) {
    const s = state.stars[i]
    s.x += 0.2 * dt
    if (s.x > state.canvasWidth) {
      s.x = 0
      s.y = Math.random() * state.canvasHeight
    }
  }
}

function checkBulletAsteroidCollisions(state: GameState): void {
  const grid = new SpatialGrid(state.canvasWidth, state.canvasHeight)

  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i]
    if (!a.alive) continue
    grid.insert(i, a.x, a.y)
  }

  for (let bi = 0; bi < state.bullets.length; bi++) {
    const b = state.bullets[bi]
    if (!b.alive) continue
    const nearby = grid.query(b.x, b.y, 40)
    for (let ni = 0; ni < nearby.length; ni++) {
      const ai = nearby[ni]
      const a = state.asteroids[ai]
      if (!a.alive) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx * dx + dy * dy < (4 + a.radius) * (4 + a.radius)) {
        b.alive = false
        a.alive = false
        onAsteroidDestroyed(state, a)
        state.score += a.size === 'large' ? 30 : a.size === 'medium' ? 20 : 10
        break
      }
    }
  }
}

function onAsteroidDestroyed(state: GameState, asteroid: Asteroid): void {
  if (asteroid.size === 'large') {
    for (let i = 0; i < 2; i++) {
      const offsetX = (Math.random() - 0.5) * asteroid.radius
      const offsetY = (Math.random() - 0.5) * asteroid.radius
      const angle = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 80
      state.asteroids.push(createAsteroid(
        state.canvasWidth, state.canvasHeight,
        'medium',
        asteroid.x + offsetX,
        asteroid.y + offsetY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ))
    }
  } else if (asteroid.size === 'medium') {
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * asteroid.radius
      const offsetY = (Math.random() - 0.5) * asteroid.radius
      const angle = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 80
      state.asteroids.push(createAsteroid(
        state.canvasWidth, state.canvasHeight,
        'small',
        asteroid.x + offsetX,
        asteroid.y + offsetY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ))
    }
  } else {
    const mineralRoll = Math.random()
    let mineralType: MineralType
    if (mineralRoll < 0.5) {
      mineralType = 'iron'
    } else if (mineralRoll < 0.8) {
      mineralType = 'silicon'
    } else {
      mineralType = 'rare'
    }
    const fragmentCount = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < fragmentCount; i++) {
      state.fragments.push(createFragment(asteroid.x, asteroid.y, mineralType))
    }
  }
}

function checkShipFragmentCollisions(state: GameState): void {
  const ship = state.ship
  const pickupRadius = 50
  for (let i = 0; i < state.fragments.length; i++) {
    const f = state.fragments[i]
    if (!f.alive) continue
    const dx = ship.x - f.x
    const dy = ship.y - f.y
    if (dx * dx + dy * dy < pickupRadius * pickupRadius) {
      f.alive = false
      ship.minerals[f.type] += 1
    }
  }
}

function checkShipAsteroidCollisions(state: GameState): void {
  const ship = state.ship
  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i]
    if (!a.alive) continue
    const dx = ship.x - a.x
    const dy = ship.y - a.y
    if (dx * dx + dy * dy < (18 + a.radius) * (18 + a.radius)) {
      a.alive = false
      const damage = a.size === 'large' ? 20 : a.size === 'medium' ? 12 : 5
      ship.health = Math.max(0, ship.health - damage)
      if (ship.health <= 0) {
        state.gameOver = true
      }
    }
  }
}

function checkUpgrades(state: GameState): void {
  const ship = state.ship

  while (ship.minerals.rare >= 20 && ship.weaponLevel < 5) {
    ship.minerals.rare -= 20
    ship.weaponLevel += 1
    state.fireRate = getFireRate(ship.weaponLevel)
  }

  while (ship.minerals.iron >= 50) {
    ship.minerals.iron -= 50
    ship.ironSpeedBonus += 1
    ship.speedMultiplier = 1 + ship.ironSpeedBonus * 0.05
  }

  while (ship.minerals.silicon >= 30) {
    ship.minerals.silicon -= 30
    ship.health = Math.min(ship.maxHealth, ship.health + 10)
  }
}

function spawnAsteroids(state: GameState, dt: number): void {
  state.asteroidSpawnTimer += dt
  if (state.asteroidSpawnTimer >= 2.5) {
    state.asteroidSpawnTimer = 0
    if (state.asteroids.filter(a => a.alive).length < 20) {
      state.asteroids.push(createAsteroid(state.canvasWidth, state.canvasHeight))
    }
  }
}

function updateWaves(state: GameState, dt: number): void {
  state.waveTimer += dt
  if (state.waveTimer >= state.waveInterval) {
    state.waveTimer = 0
    const count = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      state.asteroids.push(createAsteroid(state.canvasWidth, state.canvasHeight))
    }
    state.waveAlert.active = true
    state.waveAlert.timer = 0
  }
}

function updateWaveAlert(state: GameState, dt: number): void {
  if (state.waveAlert.active) {
    state.waveAlert.timer += dt
    if (state.waveAlert.timer >= state.waveAlert.maxTimer) {
      state.waveAlert.active = false
    }
  }
}

function cleanupDead(state: GameState): void {
  state.asteroids = state.asteroids.filter(a => a.alive)
  state.bullets = state.bullets.filter(b => b.alive)
  state.fragments = state.fragments.filter(f => f.alive)
}

export function fireBullet(state: GameState): void {
  if (state.gameOver) return
  const now = state.time
  const interval = 1 / state.fireRate
  if (now - state.lastFireTime < interval) return
  state.lastFireTime = now

  const ship = state.ship
  const dx = state.mouseX - ship.x
  const dy = state.mouseY - ship.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return
  const nx = dx / len
  const ny = dy / len
  const speed = 700
  const maxDist = getBulletMaxDistance(ship.weaponLevel)

  state.bullets.push({
    x: ship.x,
    y: ship.y,
    vx: nx * speed,
    vy: ny * speed,
    startX: ship.x,
    startY: ship.y,
    maxDistance: maxDist,
    alive: true,
  })
}

export function resizeGame(state: GameState, width: number, height: number): void {
  state.canvasWidth = width
  state.canvasHeight = height
  state.ship.x = Math.min(state.ship.x, width - 20)
  state.ship.y = Math.min(state.ship.y, height - 20)
  for (let i = 0; i < state.stars.length; i++) {
    if (state.stars[i].x > width) state.stars[i].x = Math.random() * width
    if (state.stars[i].y > height) state.stars[i].y = Math.random() * height
  }
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { canvasWidth: W, canvasHeight: H } = state

  const gradient = ctx.createLinearGradient(0, 0, 0, H)
  gradient.addColorStop(0, '#0c0a3e')
  gradient.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < state.stars.length; i++) {
    const s = state.stars[i]
    ctx.globalAlpha = 0.5 + s.size / 6
    ctx.fillRect(s.x, s.y, s.size, s.size)
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < state.fragments.length; i++) {
    const f = state.fragments[i]
    if (!f.alive) continue
    const fade = 1 - f.age / f.lifetime
    ctx.globalAlpha = fade
    ctx.fillStyle = f.color
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
    ctx.fill()
    if (fade > 0.3) {
      ctx.globalAlpha = fade * 0.4
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.radius + 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i]
    if (!a.alive) continue
    ctx.fillStyle = a.color
    ctx.beginPath()
    ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const bulletColor = getBulletColor(state.ship.weaponLevel)
  for (let i = 0; i < state.bullets.length; i++) {
    const b = state.bullets[i]
    if (!b.alive) continue
    ctx.fillStyle = bulletColor
    ctx.beginPath()
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(b.x, b.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (!state.gameOver) {
    drawShip(ctx, state.ship)
  }

  if (state.waveAlert.active) {
    const progress = state.waveAlert.timer / state.waveAlert.maxTimer
    let alpha: number
    if (progress < 0.15) {
      alpha = progress / 0.15
    } else if (progress < 0.7) {
      alpha = 1
    } else {
      alpha = 1 - (progress - 0.7) / 0.3
    }
    ctx.globalAlpha = alpha
    ctx.font = "48px 'Arial Black'"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#555555'
    ctx.fillText('Asteroid Wave!', W / 2 + 3, H / 2 + 3)
    ctx.fillStyle = '#fef3c7'
    ctx.fillText('Asteroid Wave!', W / 2, H / 2)
    ctx.globalAlpha = 1
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }

  if (state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, H)
    ctx.font = "bold 56px 'Arial Black'"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ef4444'
    ctx.fillText('GAME OVER', W / 2, H / 2 - 30)
    ctx.font = '24px Arial'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 + 20)
    ctx.fillText('Press R to restart', W / 2, H / 2 + 55)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  ctx.save()
  ctx.translate(ship.x, ship.y)

  ctx.fillStyle = '#1e40af'
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(-14, 14)
  ctx.lineTo(-6, 8)
  ctx.lineTo(0, 12)
  ctx.lineTo(6, 8)
  ctx.lineTo(14, 14)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.arc(0, 0, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fbbf24'
  ctx.globalAlpha = 0.6 + Math.random() * 0.4
  ctx.beginPath()
  ctx.moveTo(-5, 12)
  ctx.lineTo(0, 20 + Math.random() * 8)
  ctx.lineTo(5, 12)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.restore()
}
