import type {
  GameState,
  Player,
  Direction,
  Food,
  SkillRune,
  SkillType,
  Trap,
  Laser,
} from '../shared/types'

const SKILLS: SkillType[] = ['speed', 'invisible', 'trap', 'laser']
const BASE_TICK_INTERVAL = 300
const MIN_TICK_INTERVAL = 200
const MAX_TICK_INTERVAL = 500
const GRID_SIZE_REFERENCE = 16
const RUNE_SPAWN_INTERVAL_TICKS = 50
const MAX_RUNES = 3
const SKILL_COOLDOWN_TICKS = 27
const SPEED_BOOST_DURATION_TICKS = 6
const INVISIBLE_DURATION_TICKS = 10
const TRAP_DURATION_TICKS = 100
const LASER_DURATION_TICKS = 3
const FOG_VIEW_RADIUS = 5
const TARGET_FOOD_COUNT = 5

export class GameEngine {
  private state: GameState
  private tickCallback: (state: any) => void
  private gameOverCallback: (winner: string) => void
  private intervalId: NodeJS.Timeout | null = null
  private tickInterval: number
  private pendingDeaths: Set<string> = new Set()

  constructor(
    state: GameState,
    tickCallback: (state: any) => void,
    gameOverCallback: (winner: string) => void
  ) {
    this.state = state
    this.tickCallback = tickCallback
    this.gameOverCallback = gameOverCallback
    this.tickInterval = this.calculateTickInterval(state.gridSize)
  }

  private calculateTickInterval(gridSize: number): number {
    const ratio = gridSize / GRID_SIZE_REFERENCE
    const interval = BASE_TICK_INTERVAL * ratio
    return Math.max(MIN_TICK_INTERVAL, Math.min(MAX_TICK_INTERVAL, interval))
  }

  start() {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.tick(), this.tickInterval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getState(): GameState {
    return this.state
  }

  setDirection(playerId: string, direction: Direction) {
    const player = this.state.players.get(playerId)
    if (!player || !player.alive) return

    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    }

    if (opposites[player.direction] !== direction) {
      player.nextDirection = direction
    }
  }

  useSkill(playerId: string): boolean {
    const player = this.state.players.get(playerId)
    if (!player || !player.alive) return false
    if (!player.skill) return false
    if (player.skillCooldown > 0) return false

    const skill = player.skill

    switch (skill) {
      case 'speed':
        this.applySpeedBoost(playerId)
        break

      case 'invisible':
        this.applyInvisible(playerId)
        break

      case 'trap':
        this.placeTrap(player)
        break

      case 'laser':
        this.fireLaser(player)
        break
    }

    player.skill = null
    player.skillCooldown = SKILL_COOLDOWN_TICKS
    return true
  }

  private applySpeedBoost(playerId: string) {
    const player = this.state.players.get(playerId)
    if (!player) return
    player.speedBoost = true

    const originalInterval = this.tickInterval
    const fastInterval = Math.floor(originalInterval / 2)

    this.stop()
    this.intervalId = setInterval(() => this.tick(), fastInterval)

    setTimeout(() => {
      const p = this.state.players.get(playerId)
      if (p) p.speedBoost = false
      this.stop()
      this.intervalId = setInterval(() => this.tick(), originalInterval)
    }, SPEED_BOOST_DURATION_TICKS * originalInterval)
  }

  private applyInvisible(playerId: string) {
    const player = this.state.players.get(playerId)
    if (!player) return
    player.invisible = true

    setTimeout(() => {
      const p = this.state.players.get(playerId)
      if (p) p.invisible = false
    }, INVISIBLE_DURATION_TICKS * this.tickInterval)
  }

  private placeTrap(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const head = player.snake[0]
    let trapX = head.x
    let trapY = head.y

    if (player.snake.length >= 2) {
      const body = player.snake[1]
      const dx = head.x - body.x
      const dy = head.y - body.y
      trapX = head.x - dx
      trapY = head.y - dy
    }

    if (
      trapX >= 0 &&
      trapX < this.state.gridSize &&
      trapY >= 0 &&
      trapY < this.state.gridSize
    ) {
      this.state.traps.push({
        x: trapX,
        y: trapY,
        ownerId: player.id,
        duration: TRAP_DURATION_TICKS,
      })
    }
  }

  private fireLaser(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const head = player.snake[0]
    const dir = player.direction
    let dx = 0,
      dy = 0
    if (dir === 'up') dy = -1
    if (dir === 'down') dy = 1
    if (dir === 'left') dx = -1
    if (dir === 'right') dx = 1

    let length = 0
    let lx = head.x + dx
    let ly = head.y + dy
    while (lx >= 0 && lx < this.state.gridSize && ly >= 0 && ly < this.state.gridSize) {
      length++
      lx += dx
      ly += dy
    }

    this.state.lasers.push({
      startX: head.x,
      startY: head.y,
      direction: dir,
      length,
      ownerId: player.id,
      duration: LASER_DURATION_TICKS,
    })

    this.checkLaserHit(player.id, head.x, head.y, dx, dy, length)
  }

  private checkLaserHit(
    ownerId: string,
    startX: number,
    startY: number,
    dx: number,
    dy: number,
    length: number
  ) {
    let x = startX + dx
    let y = startY + dy

    for (let i = 0; i < length; i++) {
      for (const player of this.state.players.values()) {
        if (!player.alive || player.id === ownerId) continue
        if (!player.snake || player.snake.length === 0) continue

        for (const seg of player.snake) {
          if (seg.x === x && seg.y === y) {
            this.cutSnakeInHalf(player)
            return
          }
        }
      }
      x += dx
      y += dy
    }
  }

  private cutSnakeInHalf(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const halfLen = Math.floor(player.snake.length / 2)
    if (halfLen < 1) {
      player.alive = false
      return
    }
    player.snake = player.snake.slice(0, player.snake.length - halfLen)
    player.score = player.snake.length
  }

  private tick() {
    if (this.state.gameOver) return

    this.state.tickCount++

    for (const player of this.state.players.values()) {
      if (!player.alive) continue
      this.movePlayer(player)
    }

    this.pendingDeaths.clear()
    for (const player of this.state.players.values()) {
      if (!player.alive) continue
      if (this.checkPlayerDeath(player)) {
        this.pendingDeaths.add(player.id)
      }
    }

    for (const player of this.state.players.values()) {
      if (!player.alive || this.pendingDeaths.has(player.id)) continue
      this.checkFoodCollision(player)
      this.checkRuneCollision(player)
      this.checkTrapCollision(player)
    }

    this.checkGameOver()
    this.updateCooldowns()
    this.updateEffects()
    this.spawnRunes()
    this.maintainFood()

    const serializedState = this.serializeState()
    this.tickCallback(serializedState)
  }

  private movePlayer(player: Player) {
    if (!player.snake || player.snake.length === 0) return
    if (!player.alive) return

    player.direction = player.nextDirection

    try {
      const head = { ...player.snake[0] }

      switch (player.direction) {
        case 'up':
          head.y -= 1
          break
        case 'down':
          head.y += 1
          break
        case 'left':
          head.x -= 1
          break
        case 'right':
          head.x += 1
          break
      }

      player.snake.unshift(head)
      player.snake.pop()
    } catch (e) {
      console.error('Error moving player:', e)
    }
  }

  private checkPlayerDeath(player: Player): boolean {
    if (!player.snake || player.snake.length === 0) {
      player.alive = false
      return true
    }

    const head = player.snake[0]

    if (
      head.x < 0 ||
      head.x >= this.state.gridSize ||
      head.y < 0 ||
      head.y >= this.state.gridSize
    ) {
      player.alive = false
      return true
    }

    for (const otherPlayer of this.state.players.values()) {
      if (!otherPlayer.alive) continue
      if (!otherPlayer.snake || otherPlayer.snake.length === 0) continue

      const startIndex = otherPlayer.id === player.id ? 1 : 0
      for (let i = startIndex; i < otherPlayer.snake.length; i++) {
        const seg = otherPlayer.snake[i]
        if (head.x === seg.x && head.y === seg.y) {
          player.alive = false
          return true
        }
      }
    }

    return false
  }

  private checkFoodCollision(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const head = player.snake[0]

    for (let i = this.state.foods.length - 1; i >= 0; i--) {
      const food = this.state.foods[i]
      if (head.x === food.x && head.y === food.y) {
        const tail = player.snake[player.snake.length - 1]
        if (tail) {
          player.snake.push({ ...tail })
        }
        player.score = player.snake.length
        this.state.foods.splice(i, 1)
        break
      }
    }
  }

  private checkRuneCollision(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const head = player.snake[0]

    for (let i = this.state.skillRunes.length - 1; i >= 0; i--) {
      const rune = this.state.skillRunes[i]
      if (head.x === rune.x && head.y === rune.y) {
        if (!player.skill) {
          player.skill = rune.type
        }
        this.state.skillRunes.splice(i, 1)
        break
      }
    }
  }

  private checkTrapCollision(player: Player) {
    if (!player.snake || player.snake.length === 0) return

    const head = player.snake[0]

    for (let i = this.state.traps.length - 1; i >= 0; i--) {
      const trap = this.state.traps[i]
      if (trap.ownerId === player.id) continue
      if (head.x === trap.x && head.y === trap.y) {
        if (player.snake.length > 3) {
          const removeCount = Math.floor(player.snake.length / 3)
          player.snake.splice(player.snake.length - removeCount, removeCount)
          player.score = player.snake.length
        }
        this.state.traps.splice(i, 1)
        break
      }
    }
  }

  private updateCooldowns() {
    for (const player of this.state.players.values()) {
      if (player.skillCooldown > 0) {
        player.skillCooldown--
      }
    }
  }

  private updateEffects() {
    for (let i = this.state.traps.length - 1; i >= 0; i--) {
      this.state.traps[i].duration--
      if (this.state.traps[i].duration <= 0) {
        this.state.traps.splice(i, 1)
      }
    }

    for (let i = this.state.lasers.length - 1; i >= 0; i--) {
      this.state.lasers[i].duration--
      if (this.state.lasers[i].duration <= 0) {
        this.state.lasers.splice(i, 1)
      }
    }
  }

  private spawnRunes() {
    if (this.state.tickCount % RUNE_SPAWN_INTERVAL_TICKS !== 0) return
    if (this.state.skillRunes.length >= MAX_RUNES) return

    const rune = this.spawnRuneAtRandom()
    if (rune) {
      this.state.skillRunes.push(rune)
    }
  }

  private spawnRuneAtRandom(): SkillRune | null {
    const gridSize = this.state.gridSize
    const occupied = new Set<string>()

    for (const player of this.state.players.values()) {
      if (!player.snake) continue
      for (const seg of player.snake) {
        occupied.add(`${seg.x},${seg.y}`)
      }
    }
    for (const food of this.state.foods) {
      occupied.add(`${food.x},${food.y}`)
    }
    for (const rune of this.state.skillRunes) {
      occupied.add(`${rune.x},${rune.y}`)
    }
    for (const trap of this.state.traps) {
      occupied.add(`${trap.x},${trap.y}`)
    }

    if (occupied.size >= gridSize * gridSize * 0.9) return null

    let x: number, y: number
    let attempts = 0
    do {
      x = Math.floor(Math.random() * gridSize)
      y = Math.floor(Math.random() * gridSize)
      attempts++
    } while (occupied.has(`${x},${y}`) && attempts < 100)

    if (attempts >= 100) return null

    const type = SKILLS[Math.floor(Math.random() * SKILLS.length)]
    return { x, y, type }
  }

  private maintainFood() {
    while (this.state.foods.length < TARGET_FOOD_COUNT) {
      const food = this.spawnFoodAtRandom()
      if (food) {
        this.state.foods.push(food)
      } else {
        break
      }
    }
  }

  private spawnFoodAtRandom(): Food | null {
    const gridSize = this.state.gridSize
    const occupied = new Set<string>()

    for (const player of this.state.players.values()) {
      if (!player.snake) continue
      for (const seg of player.snake) {
        occupied.add(`${seg.x},${seg.y}`)
      }
    }
    for (const food of this.state.foods) {
      occupied.add(`${food.x},${food.y}`)
    }
    for (const rune of this.state.skillRunes) {
      occupied.add(`${rune.x},${rune.y}`)
    }

    if (occupied.size >= gridSize * gridSize * 0.9) return null

    let x: number, y: number
    let attempts = 0
    do {
      x = Math.floor(Math.random() * gridSize)
      y = Math.floor(Math.random() * gridSize)
      attempts++
    } while (occupied.has(`${x},${y}`) && attempts < 100)

    if (attempts >= 100) return null

    return {
      x,
      y,
      type: Math.random() < 0.8 ? 'apple' : 'gem',
    }
  }

  private checkGameOver() {
    const alivePlayers = Array.from(this.state.players.values()).filter((p) => p.alive)

    if (alivePlayers.length <= 1) {
      this.state.gameOver = true
      if (alivePlayers.length === 1) {
        this.state.winner = alivePlayers[0].id
        this.gameOverCallback(alivePlayers[0].id)
      }
      this.stop()
    }
  }

  private calculateVisibleCells(playerId: string): string[] {
    const player = this.state.players.get(playerId)
    if (!player || !player.snake || player.snake.length === 0) return []

    const head = player.snake[0]
    const visible: string[] = []
    const radius = FOG_VIEW_RADIUS

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance <= radius) {
          const x = head.x + dx
          const y = head.y + dy
          if (x >= 0 && x < this.state.gridSize && y >= 0 && y < this.state.gridSize) {
            visible.push(`${x},${y}`)
          }
        }
      }
    }

    return visible
  }

  private serializeState(): any {
    const playerVisibilityMap: Record<string, string[]> = {}
    for (const [playerId] of this.state.players) {
      playerVisibilityMap[playerId] = this.calculateVisibleCells(playerId)
    }

    return {
      players: Array.from(this.state.players.entries()).map(([id, player]) => ({
        id,
        nickname: player.nickname,
        snake: player.snake || [],
        direction: player.direction,
        color: player.color,
        alive: player.alive,
        score: player.score,
        skill: player.skill,
        skillCooldown: player.skillCooldown,
        speedBoost: player.speedBoost,
        invisible: player.invisible,
      })),
      foods: this.state.foods,
      skillRunes: this.state.skillRunes,
      traps: this.state.traps,
      lasers: this.state.lasers,
      gridSize: this.state.gridSize,
      gameOver: this.state.gameOver,
      winner: this.state.winner,
      tickCount: this.state.tickCount,
      playerVisibilityMap,
      fogViewRadius: FOG_VIEW_RADIUS,
    }
  }
}
