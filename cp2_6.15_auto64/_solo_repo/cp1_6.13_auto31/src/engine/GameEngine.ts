import {
  type LevelElement,
  type EnemyEntity,
  type PlayerState,
  isEnemyElement,
  GRAVITY,
  PLAYER_SPEED,
  PLAYER_SIZE,
  JUMP_VELOCITY,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '@/types'

interface EnemyRuntime {
  el: EnemyEntity
  currentPathIndex: number
  direction: 1 | -1
  waitTimer: number
  x: number
  y: number
}

export class GameEngine {
  player: PlayerState
  elements: LevelElement[]
  enemyRuntimes: EnemyRuntime[]
  keys: Set<string>
  fps: number
  private frameCount: number
  private lastFpsTime: number

  constructor(elements: LevelElement[], spawnPoint: { x: number; y: number }) {
    this.player = {
      x: spawnPoint.x,
      y: spawnPoint.y,
      velocityX: 0,
      velocityY: 0,
      isGrounded: false,
      isDead: false,
      deathTimer: 0,
    }
    this.elements = elements
    this.enemyRuntimes = elements
      .filter(isEnemyElement)
      .map(el => ({
        el: el as EnemyEntity,
        currentPathIndex: 0,
        direction: 1,
        waitTimer: 0,
        x: (el as EnemyEntity).pathPoints[0]?.x ?? el.x,
        y: (el as EnemyEntity).pathPoints[0]?.y ?? el.y,
      }))
    this.keys = new Set()
    this.fps = 0
    this.frameCount = 0
    this.lastFpsTime = performance.now()
  }

  update(): void {
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsTime = now
    }

    if (this.player.isDead) {
      this.player.deathTimer -= 1 / 60
      if (this.player.deathTimer <= 0) {
        this.respawnPlayer()
      }
      return
    }

    this.updatePlayer()
    this.updateEnemies()
  }

  private updatePlayer(): void {
    const p = this.player

    let moveX = 0
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) moveX -= 1
    if (this.keys.has('ArrowRight') || this.keys.has('d')) moveX += 1

    p.velocityX = moveX * PLAYER_SPEED

    if ((this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ')) && p.isGrounded) {
      p.velocityY = JUMP_VELOCITY
      p.isGrounded = false
    }

    p.velocityY += GRAVITY
    if (p.velocityY > 15) p.velocityY = 15

    p.x += p.velocityX
    this.resolveCollisionX()

    p.y += p.velocityY
    this.resolveCollisionY()

    if (p.x < 0) p.x = 0
    if (p.x + PLAYER_SIZE > CANVAS_WIDTH) p.x = CANVAS_WIDTH - PLAYER_SIZE
    if (p.y + PLAYER_SIZE > CANVAS_HEIGHT) {
      p.y = CANVAS_HEIGHT - PLAYER_SIZE
      p.velocityY = 0
      p.isGrounded = true
    }

    this.checkHazards()
  }

  private getPlatforms(): LevelElement[] {
    return this.elements.filter(el =>
      el.type === 'ground' || el.type === 'movingPlatform'
    )
  }

  private getHazards(): LevelElement[] {
    return this.elements.filter(el =>
      el.type === 'spike'
    )
  }

  private resolveCollisionX(): void {
    const p = this.player
    const pRect = { x: p.x, y: p.y, w: PLAYER_SIZE, h: PLAYER_SIZE }

    for (const platform of this.getPlatforms()) {
      if (this.aabbOverlap(pRect, { x: platform.x, y: platform.y, w: platform.width, h: platform.height })) {
        if (p.velocityX > 0) {
          p.x = platform.x - PLAYER_SIZE
        } else if (p.velocityX < 0) {
          p.x = platform.x + platform.width
        }
        p.velocityX = 0
      }
    }
  }

  private resolveCollisionY(): void {
    const p = this.player
    const pRect = { x: p.x, y: p.y, w: PLAYER_SIZE, h: PLAYER_SIZE }

    p.isGrounded = false

    for (const platform of this.getPlatforms()) {
      if (this.aabbOverlap(pRect, { x: platform.x, y: platform.y, w: platform.width, h: platform.height })) {
        if (p.velocityY > 0) {
          p.y = platform.y - PLAYER_SIZE
          p.velocityY = 0
          p.isGrounded = true
        } else if (p.velocityY < 0) {
          p.y = platform.y + platform.height
          p.velocityY = 0
        }
      }
    }
  }

  private checkHazards(): void {
    const p = this.player
    const pRect = { x: p.x, y: p.y, w: PLAYER_SIZE, h: PLAYER_SIZE }

    for (const spike of this.getHazards()) {
      const spikeRect = { x: spike.x + 4, y: spike.y + 8, w: spike.width - 8, h: spike.height - 8 }
      if (this.aabbOverlap(pRect, spikeRect)) {
        this.killPlayer()
        return
      }
    }

    for (const er of this.enemyRuntimes) {
      const enemyRect = { x: er.x, y: er.y, w: er.el.width, h: er.el.height }
      if (this.aabbOverlap(pRect, enemyRect)) {
        this.killPlayer()
        return
      }
    }
  }

  private killPlayer(): void {
    this.player.isDead = true
    this.player.deathTimer = 0.5
    this.player.velocityX = 0
    this.player.velocityY = 0
  }

  private respawnPlayer(): void {
    const grounds = this.elements.filter(el => el.type === 'ground')
    const nearestGround = this.findNearestGround()
    if (nearestGround) {
      this.player.x = nearestGround.x + nearestGround.width / 2 - PLAYER_SIZE / 2
      this.player.y = nearestGround.y - PLAYER_SIZE
    } else if (grounds.length > 0) {
      this.player.x = grounds[0].x + grounds[0].width / 2 - PLAYER_SIZE / 2
      this.player.y = grounds[0].y - PLAYER_SIZE
    } else {
      this.player.x = CANVAS_WIDTH / 2 - PLAYER_SIZE / 2
      this.player.y = CANVAS_HEIGHT - PLAYER_SIZE - 40
    }
    this.player.velocityX = 0
    this.player.velocityY = 0
    this.player.isDead = false
    this.player.isGrounded = false
    this.player.deathTimer = 0
  }

  private findNearestGround(): LevelElement | null {
    const grounds = this.elements.filter(el => el.type === 'ground')
    if (grounds.length === 0) return null
    let nearest = grounds[0]
    let minDist = Infinity
    for (const g of grounds) {
      const gcx = g.x + g.width / 2
      const gcy = g.y
      const pcx = this.player.x + PLAYER_SIZE / 2
      const pcy = this.player.y + PLAYER_SIZE / 2
      const dist = Math.sqrt((gcx - pcx) ** 2 + (gcy - pcy) ** 2)
      if (dist < minDist) {
        minDist = dist
        nearest = g
      }
    }
    return nearest
  }

  private updateEnemies(): void {
    for (const er of this.enemyRuntimes) {
      if (er.el.pathPoints.length < 2) continue

      if (er.waitTimer > 0) {
        er.waitTimer -= 1 / 60
        continue
      }

      const target = er.el.pathPoints[er.currentPathIndex]
      const dx = target.x - er.x
      const dy = target.y - er.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < er.el.speed * 2) {
        er.x = target.x
        er.y = target.y
        er.waitTimer = er.el.patrolInterval

        if (er.direction === 1) {
          if (er.currentPathIndex < er.el.pathPoints.length - 1) {
            er.currentPathIndex++
          } else {
            er.direction = -1
            er.currentPathIndex--
          }
        } else {
          if (er.currentPathIndex > 0) {
            er.currentPathIndex--
          } else {
            er.direction = 1
            er.currentPathIndex++
          }
        }
      } else {
        er.x += (dx / dist) * er.el.speed
        er.y += (dy / dist) * er.el.speed
      }
    }
  }

  reset(spawnPoint: { x: number; y: number }): void {
    this.player.x = spawnPoint.x
    this.player.y = spawnPoint.y
    this.player.velocityX = 0
    this.player.velocityY = 0
    this.player.isGrounded = false
    this.player.isDead = false
    this.player.deathTimer = 0

    this.enemyRuntimes = this.elements
      .filter(isEnemyElement)
      .map(el => ({
        el: el as EnemyEntity,
        currentPathIndex: 0,
        direction: 1,
        waitTimer: 0,
        x: (el as EnemyEntity).pathPoints[0]?.x ?? el.x,
        y: (el as EnemyEntity).pathPoints[0]?.y ?? el.y,
      }))
  }

  private aabbOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  getEnemyPositions(): { el: EnemyEntity; x: number; y: number; wingPhase: number }[] {
    return this.enemyRuntimes.map(er => ({
      el: er.el,
      x: er.x,
      y: er.y,
      wingPhase: performance.now() / 200,
    }))
  }
}
