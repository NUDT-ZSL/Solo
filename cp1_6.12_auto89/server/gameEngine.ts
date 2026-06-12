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
const TICK_INTERVAL = 300
const RUNE_SPAWN_INTERVAL = 50
const SKILL_COOLDOWN = 27
const SPEED_BOOST_DURATION = 6
const INVISIBLE_DURATION = 10
const TRAP_DURATION = 100
const LASER_DURATION = 3
const SPEED_BOOST_SKIP_TICKS = 1

export class GameEngine {
  private state: GameState
  private tickCallback: (state: GameState) => void
  private gameOverCallback: (winner: string) => void
  private intervalId: NodeJS.Timeout | null = null
  private speedBoostPlayers: Set<string> = new Set()
  private skipNextTick: boolean = false

  constructor(
    state: GameState,
    tickCallback: (state: GameState) => void,
    gameOverCallback: (winner: string) => void
  ) {
    this.state = state
    this.tickCallback = tickCallback
    this.gameOverCallback = gameOverCallback
  }

  start() {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL)
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

  useSkill(playerId: string) {
    const player = this.state.players.get(playerId)
    if (!player || !player.alive) return
    if (!player.skill || player.skillCooldown > 0) return

    const skill = player.skill

    switch (skill) {
      case 'speed':
        player.speedBoost = true
        this.speedBoostPlayers.add(playerId)
        setTimeout(() => {
          player.speedBoost = false
          this.speedBoostPlayers.delete(playerId)
        }, SPEED_BOOST_DURATION * TICK_INTERVAL)
        break

      case 'invisible':
        player.invisible = true
        setTimeout(() => {
          player.invisible = false
        }, INVISIBLE_DURATION * TICK_INTERVAL)
        break

      case 'trap':
        const head = player.snake[0]
        const tailDir = this.getTailDirection(player)
        let trapX = head.x
        let trapY = head.y
        if (tailDir) {
          trapX += tailDir.dx * 2
          trapY += tailDir.dy * 2
        }
        if (trapX >= 0 && trapX < this.state.gridSize && trapY >= 0 && trapY < this.state.gridSize) {
          this.state.traps.push({
            x: trapX,
            y: trapY,
            ownerId: playerId,
            duration: TRAP_DURATION,
          })
        }
        break

      case 'laser':
        const laserHead = player.snake[0]
        const dir = player.direction
        let dx = 0,
          dy = 0
        if (dir === 'up') dy = -1
        if (dir === 'down') dy = 1
        if (dir === 'left') dx = -1
        if (dir === 'right') dx = 1

        let length = 0
        let lx = laserHead.x + dx
        let ly = laserHead.y + dy
        while (lx >= 0 && lx < this.state.gridSize && ly >= 0 && ly < this.state.gridSize) {
          length++
          lx += dx
          ly += dy
        }

        this.state.lasers.push({
          startX: laserHead.x,
          startY: laserHead.y,
          direction: dir,
          length,
          ownerId: playerId,
          duration: LASER_DURATION,
        })

        this.checkLaserHit(playerId, laserHead.x, laserHead.y, dx, dy, length)
        break
    }

    player.skill = null
    player.skillCooldown = SKILL_COOLDOWN
  }

  private getTailDirection(player: Player) {
    if (player.snake.length < 2) return null
    const head = player.snake[0]
    const body = player.snake[1]
    return { dx: head.x - body.x, dy: head.y - body.y }
  }

  private checkLaserHit(ownerId: string, startX: number, startY: number, dx: number, dy: number, length: number) {
    let x = startX + dx
    let y = startY + dy

    for (let i = 0; i < length; i++) {
      for (const player of this.state.players.values()) {
        if (!player.alive || player.id === ownerId) continue

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

    if (this.skipNextTick) {
      this.skipNextTick = false
      this.updateCooldowns()
      this.updateEffects()
      this.spawnRunes()
      this.tickCallback(this.serializeState())
      return
    }

    for (const player of this.state.players.values()) {
      if (!player.alive) continue

      if (player.speedBoost && this.speedBoostPlayers.has(player.id)) {
        this.movePlayer(player)
        if (this.checkPlayerDeath(player)) continue
        this.checkFoodCollision(player)
        this.checkRuneCollision(player)
        this.checkTrapCollision(player)
      }
    }

    for (const player of this.state.players.values()) {
      if (!player.alive) continue
      player.direction = player.nextDirection
      this.movePlayer(player)
    }

    for (const player of this.state.players.values()) {
      if (!player.alive) continue
      this.checkPlayerDeath(player)
    }

    for (const player of this.state.players.values()) {
      if (!player.alive) continue
      this.checkFoodCollision(player)
      this.checkRuneCollision(player)
      this.checkTrapCollision(player)
    }

    this.checkGameOver()

    this.updateCooldowns()
    this.updateEffects()
    this.spawnRunes()
    this.maintainFood()

    const hasSpeedBoost = this.speedBoostPlayers.size > 0
    if (hasSpeedBoost && !this.skipNextTick) {
      this.skipNextTick = false
    }

    this.tickCallback(this.serializeState())
  }

  private movePlayer(player: Player) {
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
  }

  private checkPlayerDeath(player: Player): boolean {
    const head = player.snake[0]

    if (head.x < 0 || head.x >= this.state.gridSize || head.y < 0 || head.y >= this.state.gridSize) {
      player.alive = false
      return true
    }

    for (const otherPlayer of this.state.players.values()) {
      if (!otherPlayer.alive) continue
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
    const head = player.snake[0]

    for (let i = this.state.foods.length - 1; i >= 0; i--) {
      const food = this.state.foods[i]
      if (head.x === food.x && head.y === food.y) {
        player.snake.push({ ...player.snake[player.snake.length - 1] })
        player.score = player.snake.length
        this.state.foods.splice(i, 1)
        break
      }
    }
  }

  private checkRuneCollision(player: Player) {
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
    if (this.state.tickCount % RUNE_SPAWN_INTERVAL !== 0) return
    if (this.state.skillRunes.length >= 2) return

    const rune = this.spawnRuneAtRandom()
    if (rune) {
      this.state.skillRunes.push(rune)
    }
  }

  private spawnRuneAtRandom(): SkillRune | null {
    const gridSize = this.state.gridSize
    const occupied = new Set<string>()

    for (const player of this.state.players.values()) {
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

    let x, y
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
    const targetCount = 5
    while (this.state.foods.length < targetCount) {
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

    let x, y
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

  private serializeState(): any {
    return {
      players: Array.from(this.state.players.entries()).map(([id, player]) => ({
        id,
        nickname: player.nickname,
        snake: player.snake,
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
    }
  }
}
