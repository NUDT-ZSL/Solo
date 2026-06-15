import { GuardConfig, Vector2, LevelConfig, TileType } from './LevelManager'
import { SoundWave } from './InteractiveObject'

export enum GuardState {
  Patrolling = 'patrolling',
  Investigating = 'investigating',
  Alert = 'alert',
  Chasing = 'chasing',
  Returning = 'returning',
}

export interface GuardInstance {
  config: GuardConfig
  position: Vector2
  direction: number
  state: GuardState
  currentWaypointIndex: number
  waitTimer: number
  investigateTarget: Vector2 | null
  alertTimer: number
  chaseTimer: number
  lastKnownPlayerPos: Vector2 | null
  soundWavesHeard: SoundWave[]
  viewCone: Vector2[]
  footstepTimer: number
}

export class GuardAI {
  private guards: GuardInstance[] = []
  private levelConfig: LevelConfig | null = null
  private onPlayerDetected: ((guardId: string) => void) | null = null

  constructor(configs: GuardConfig[], levelConfig: LevelConfig) {
    this.levelConfig = levelConfig
    this.guards = configs.map(config => this.createGuard(config))
  }

  setOnPlayerDetected(callback: (guardId: string) => void): void {
    this.onPlayerDetected = callback
  }

  private createGuard(config: GuardConfig): GuardInstance {
    const dx = config.patrolPath.length > 1
      ? config.patrolPath[1].position.x - config.patrolPath[0].position.x
      : 1
    const dy = config.patrolPath.length > 1
      ? config.patrolPath[1].position.y - config.patrolPath[0].position.y
      : 0
    const direction = Math.atan2(dy, dx)

    return {
      config,
      position: { ...config.startPosition },
      direction,
      state: GuardState.Patrolling,
      currentWaypointIndex: 0,
      waitTimer: config.patrolPath[0].waitTime,
      investigateTarget: null,
      alertTimer: 0,
      chaseTimer: 0,
      lastKnownPlayerPos: null,
      soundWavesHeard: [],
      viewCone: [],
      footstepTimer: 0,
    }
  }

  update(dt: number, playerPos: Vector2, playerVisible: boolean, soundWaves: SoundWave[]): void {
    for (const guard of this.guards) {
      this.checkSoundDetection(guard, soundWaves)
      this.checkVisionDetection(guard, playerPos, playerVisible)
      this.updateState(guard, dt)
      this.updateViewCone(guard)
      guard.footstepTimer += dt
    }
  }

  private checkSoundDetection(guard: GuardInstance, soundWaves: SoundWave[]): void {
    for (const wave of soundWaves) {
      const dx = guard.position.x - wave.origin.x
      const dy = guard.position.y - wave.origin.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const waveEdge = wave.radius
      const prevEdge = wave.radius - wave.speed * 0.016 * 3
      if (dist <= waveEdge && dist >= prevEdge - 1) {
        const alreadyHeard = guard.soundWavesHeard.some(
          sw => sw.sourceId === wave.sourceId && sw.radius === wave.radius
        )
        if (!alreadyHeard) {
          guard.soundWavesHeard.push(wave)
          if (guard.state === GuardState.Patrolling || guard.state === GuardState.Returning) {
            guard.state = GuardState.Investigating
            guard.investigateTarget = { ...wave.origin }
            guard.alertTimer = 0
          }
        }
      }
    }

    guard.soundWavesHeard = guard.soundWavesHeard.filter(sw => sw.alpha > 0.05)
  }

  private checkVisionDetection(guard: GuardInstance, playerPos: Vector2, playerVisible: boolean): void {
    if (!playerVisible) return
    if (guard.state === GuardState.Chasing) return

    const dx = playerPos.x - guard.position.x
    const dy = playerPos.y - guard.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > guard.config.viewRange) return

    const angleToPlayer = Math.atan2(dy, dx)
    const angleDiff = this.normalizeAngle(angleToPlayer - guard.direction)

    if (Math.abs(angleDiff) < guard.config.viewAngle / 2) {
      if (!this.isLineOfSightBlocked(guard.position, playerPos)) {
        guard.state = GuardState.Alert
        guard.alertTimer = 0
        guard.lastKnownPlayerPos = { ...playerPos }
      }
    }
  }

  private isLineOfSightBlocked(from: Vector2, to: Vector2): boolean {
    if (!this.levelConfig) return false

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const steps = Math.ceil(dist * 2)

    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const checkX = Math.round(from.x + dx * t)
      const checkY = Math.round(from.y + dy * t)

      if (
        checkX < 0 || checkX >= this.levelConfig.width ||
        checkY < 0 || checkY >= this.levelConfig.height
      ) continue

      if (this.levelConfig.tiles[checkY][checkX] === TileType.Wall) {
        return true
      }
    }
    return false
  }

  private updateState(guard: GuardInstance, dt: number): void {
    switch (guard.state) {
      case GuardState.Patrolling:
        this.updatePatrolling(guard, dt)
        break
      case GuardState.Investigating:
        this.updateInvestigating(guard, dt)
        break
      case GuardState.Alert:
        this.updateAlert(guard, dt)
        break
      case GuardState.Chasing:
        this.updateChasing(guard, dt)
        break
      case GuardState.Returning:
        this.updateReturning(guard, dt)
        break
    }
  }

  private updatePatrolling(guard: GuardInstance, dt: number): void {
    const path = guard.config.patrolPath
    if (path.length === 0) return

    if (guard.waitTimer > 0) {
      guard.waitTimer -= dt
      return
    }

    const target = path[guard.currentWaypointIndex].position
    const dx = target.x - guard.position.x
    const dy = target.y - guard.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 0.15) {
      guard.position.x = target.x
      guard.position.y = target.y
      guard.currentWaypointIndex = (guard.currentWaypointIndex + 1) % path.length
      guard.waitTimer = path[guard.currentWaypointIndex].waitTime
    } else {
      const speed = guard.config.speed * dt
      guard.position.x += (dx / dist) * speed
      guard.position.y += (dy / dist) * speed
      guard.direction = Math.atan2(dy, dx)
    }
  }

  private updateInvestigating(guard: GuardInstance, dt: number): void {
    if (!guard.investigateTarget) {
      guard.state = GuardState.Returning
      return
    }

    const dx = guard.investigateTarget.x - guard.position.x
    const dy = guard.investigateTarget.y - guard.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 0.3) {
      guard.alertTimer += dt
      if (guard.alertTimer > 3) {
        guard.state = GuardState.Returning
        guard.investigateTarget = null
        guard.alertTimer = 0
      }
      return
    }

    const speed = guard.config.speed * 1.2 * dt
    guard.position.x += (dx / dist) * speed
    guard.position.y += (dy / dist) * speed
    guard.direction = Math.atan2(dy, dx)
  }

  private updateAlert(guard: GuardInstance, dt: number): void {
    guard.alertTimer += dt

    if (guard.lastKnownPlayerPos) {
      const dx = guard.lastKnownPlayerPos.x - guard.position.x
      const dy = guard.lastKnownPlayerPos.y - guard.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      guard.direction = Math.atan2(dy, dx)

      if (dist > 0.3) {
        const speed = guard.config.speed * 1.3 * dt
        guard.position.x += (dx / dist) * speed
        guard.position.y += (dy / dist) * speed
      }
    }

    if (guard.alertTimer > 2) {
      guard.state = GuardState.Chasing
      guard.chaseTimer = 0
      if (this.onPlayerDetected) {
        this.onPlayerDetected(guard.config.id)
      }
    }
  }

  private updateChasing(guard: GuardInstance, dt: number): void {
    guard.chaseTimer += dt

    if (guard.lastKnownPlayerPos) {
      const dx = guard.lastKnownPlayerPos.x - guard.position.x
      const dy = guard.lastKnownPlayerPos.y - guard.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      guard.direction = Math.atan2(dy, dx)

      if (dist > 0.3) {
        const speed = guard.config.speed * 1.8 * dt
        guard.position.x += (dx / dist) * speed
        guard.position.y += (dy / dist) * speed
      }
    }

    if (guard.chaseTimer > 5) {
      guard.state = GuardState.Returning
      guard.lastKnownPlayerPos = null
      guard.chaseTimer = 0
    }
  }

  private updateReturning(guard: GuardInstance, dt: number): void {
    const path = guard.config.patrolPath
    if (path.length === 0) return

    const target = path[guard.currentWaypointIndex].position
    const dx = target.x - guard.position.x
    const dy = target.y - guard.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 0.3) {
      guard.state = GuardState.Patrolling
      guard.waitTimer = 0.5
      guard.alertTimer = 0
      guard.investigateTarget = null
      guard.lastKnownPlayerPos = null
      return
    }

    const speed = guard.config.speed * 0.8 * dt
    guard.position.x += (dx / dist) * speed
    guard.position.y += (dy / dist) * speed
    guard.direction = Math.atan2(dy, dx)
  }

  private updateViewCone(guard: GuardInstance): void {
    const conePoints: Vector2[] = []
    const range = guard.config.viewRange
    const angle = guard.config.viewAngle
    const segments = 12

    for (let i = 0; i <= segments; i++) {
      const a = guard.direction - angle / 2 + (angle / segments) * i
      conePoints.push({
        x: guard.position.x + Math.cos(a) * range,
        y: guard.position.y + Math.sin(a) * range,
      })
    }

    guard.viewCone = conePoints
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI
    while (angle < -Math.PI) angle += 2 * Math.PI
    return angle
  }

  getGuards(): GuardInstance[] {
    return this.guards
  }

  isPlayerInAnyViewCone(playerPos: Vector2): boolean {
    for (const guard of this.guards) {
      if (guard.state === GuardState.Chasing) continue

      const dx = playerPos.x - guard.position.x
      const dy = playerPos.y - guard.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > guard.config.viewRange) continue

      const angleToPlayer = Math.atan2(dy, dx)
      const angleDiff = this.normalizeAngle(angleToPlayer - guard.direction)

      if (Math.abs(angleDiff) < guard.config.viewAngle / 2) {
        if (!this.isLineOfSightBlocked(guard.position, playerPos)) {
          return true
        }
      }
    }
    return false
  }

  isPlayerCaught(playerPos: Vector2): boolean {
    for (const guard of this.guards) {
      if (guard.state !== GuardState.Chasing && guard.state !== GuardState.Alert) continue

      const dx = playerPos.x - guard.position.x
      const dy = playerPos.y - guard.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 0.8) return true
    }
    return false
  }

  notifySoundWaves(soundWaves: SoundWave[]): void {
    for (const guard of this.guards) {
      this.checkSoundDetection(guard, soundWaves)
    }
  }

  notifyPlayerPosition(playerPos: Vector2, playerVisible: boolean): void {
    for (const guard of this.guards) {
      if (guard.state === GuardState.Alert || guard.state === GuardState.Chasing) {
        if (playerVisible) {
          guard.lastKnownPlayerPos = { ...playerPos }
          guard.chaseTimer = 0
          guard.alertTimer = 0
        }
      }
    }
  }

  reset(configs: GuardConfig[], levelConfig: LevelConfig): void {
    this.levelConfig = levelConfig
    this.guards = configs.map(config => this.createGuard(config))
  }
}
