import { LevelManager, LevelConfig } from './LevelManager'
import { StealthManager } from './StealthManager'
import { GuardAI } from './GuardAI'
import { InteractiveObject, SoundWave } from './InteractiveObject'

export enum GamePhase {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  LevelComplete = 'level_complete',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface GameRenderData {
  phase: GamePhase
  level: LevelConfig
  playerPosition: { x: number; y: number }
  playerVisibility: number
  playerIsHidden: boolean
  playerIsSprinting: boolean
  playerTrail: { x: number; y: number; alpha: number; size: number }[]
  guards: {
    position: { x: number; y: number }
    direction: number
    state: string
    viewCone: { x: number; y: number }[]
    viewRange: number
    viewAngle: number
  }[]
  interactiveObjects: {
    position: { x: number; y: number }
    type: string
    isActive: boolean
    isActivated: boolean
    candleLit: boolean
    soundWave: SoundWave | null
    label: string
  }[]
  lightSources: {
    position: { x: number; y: number }
    radius: number
    intensity: number
    isLit: boolean
  }[]
  soundWaves: SoundWave[]
  currentLevel: number
  totalLevels: number
  timeRemaining: number
  nearbyInteractable: string | null
  sprintProgress: number
  sprintReady: boolean
  dodgeFlashAlpha: number
  levelName: string
}

export class GameEngine {
  private levelManager: LevelManager
  private stealthManager!: StealthManager
  private guardAI!: GuardAI
  private interactiveObject!: InteractiveObject
  private phase: GamePhase = GamePhase.Menu
  private timeRemaining: number = 0
  private animationFrameId: number = 0
  private lastTimestamp: number = 0
  private running: boolean = false
  private dodgeFlashAlpha: number = 0
  private onRender: ((data: GameRenderData) => void) | null = null
  private keys: Set<string> = new Set()
  private eKeyJustPressed: boolean = false
  private levelStartTimer: number = 0

  constructor() {
    this.levelManager = new LevelManager()
    this.setupInputListeners()
  }

  setRenderCallback(callback: (data: GameRenderData) => void): void {
    this.onRender = callback
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()
      if (!this.keys.has(key) && key === 'e') {
        this.eKeyJustPressed = true
      }
      this.keys.add(key)
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
    })

    window.addEventListener('blur', () => {
      this.keys.clear()
    })
  }

  start(): void {
    if (this.phase === GamePhase.Menu) {
      this.startLevel(0)
    }
    if (!this.running) {
      this.running = true
      this.lastTimestamp = performance.now()
      this.gameLoop(this.lastTimestamp)
    }
  }

  private startLevel(index: number): void {
    const level = this.levelManager.resetToLevel(index)
    if (!level) return

    this.initLevelSystems(level)
    this.phase = GamePhase.Playing
    this.timeRemaining = level.timeLimit
    this.levelStartTimer = 1.5
    this.dodgeFlashAlpha = 0
  }

  private initLevelSystems(level: LevelConfig): void {
    this.stealthManager = new StealthManager(this.levelManager)
    this.guardAI = new GuardAI(level.guards, level)
    this.interactiveObject = new InteractiveObject(level.interactiveObjects)

    this.interactiveObject.setCallbacks(
      (wave: SoundWave) => {
        this.stealthManager.addSoundWave(wave)
      },
      (pos: { x: number; y: number }, lit: boolean) => {
        this.stealthManager.toggleLightAt(pos, lit)
      }
    )

    this.guardAI.setOnPlayerDetected((_guardId: string) => {
      this.dodgeFlashAlpha = 0
    })
  }

  private gameLoop(timestamp: number): void {
    if (!this.running) return

    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05)
    this.lastTimestamp = timestamp

    this.update(dt)
    this.render()

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t))
  }

  private update(dt: number): void {
    if (this.phase !== GamePhase.Playing) return

    if (this.levelStartTimer > 0) {
      this.levelStartTimer -= dt
      return
    }

    this.timeRemaining -= dt
    if (this.timeRemaining <= 0) {
      this.phase = GamePhase.GameOver
      return
    }

    const input = {
      w: this.keys.has('w') || this.keys.has('arrowup'),
      a: this.keys.has('a') || this.keys.has('arrowleft'),
      s: this.keys.has('s') || this.keys.has('arrowdown'),
      d: this.keys.has('d') || this.keys.has('arrowright'),
      space: this.keys.has(' '),
    }

    this.stealthManager.update(dt, input)
    const playerState = this.stealthManager.getPlayerState()

    if (this.eKeyJustPressed) {
      this.handleInteraction(playerState.position)
      this.eKeyJustPressed = false
    }
    this.eKeyJustPressed = false

    this.interactiveObject.update(dt)
    this.guardAI.update(
      dt,
      playerState.position,
      this.stealthManager.isPlayerVisibleToGuards(),
      this.stealthManager.getActiveSoundWaves()
    )

    this.guardAI.notifyPlayerPosition(
      playerState.position,
      this.stealthManager.isPlayerVisibleToGuards()
    )

    if (this.guardAI.isPlayerCaught(playerState.position)) {
      this.phase = GamePhase.GameOver
      return
    }

    this.checkLevelCompletion(playerState.position)

    if (this.dodgeFlashAlpha > 0) {
      this.dodgeFlashAlpha -= dt * 2
    }

    if (playerState.isHidden && this.wasRecentlyInDanger(playerState.position)) {
      if (this.dodgeFlashAlpha <= 0) {
        this.dodgeFlashAlpha = 0.6
      }
    }
  }

  private wasRecentlyInDanger(pos: { x: number; y: number }): boolean {
    const guards = this.guardAI.getGuards()
    for (const guard of guards) {
      if (guard.state === 'investigating' || guard.state === 'alert' || guard.state === 'chasing') {
        const dx = pos.x - guard.position.x
        const dy = pos.y - guard.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < guard.config.viewRange * 0.8) return true
      }
    }
    return false
  }

  private handleInteraction(playerPos: { x: number; y: number }): void {
    this.interactiveObject.tryActivate(playerPos, this.stealthManager.getPlayerState().interactionRange)
  }

  private checkLevelCompletion(playerPos: { x: number; y: number }): void {
    const level = this.levelManager.getCurrentLevel()
    const dx = playerPos.x - level.targetPosition.x
    const dy = playerPos.y - level.targetPosition.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 1.0) {
      if (this.levelManager.isLastLevel()) {
        this.phase = GamePhase.Victory
      } else {
        this.phase = GamePhase.LevelComplete
      }
    }
  }

  nextLevel(): void {
    const level = this.levelManager.advanceLevel()
    if (level) {
      this.initLevelSystems(level)
      this.phase = GamePhase.Playing
      this.timeRemaining = level.timeLimit
      this.levelStartTimer = 1.5
      this.dodgeFlashAlpha = 0
    }
  }

  restartLevel(): void {
    const index = this.levelManager.getCurrentLevelIndex()
    this.startLevel(index)
  }

  restartGame(): void {
    this.startLevel(0)
  }

  pause(): void {
    if (this.phase === GamePhase.Playing) {
      this.phase = GamePhase.Paused
    }
  }

  resume(): void {
    if (this.phase === GamePhase.Paused) {
      this.phase = GamePhase.Playing
    }
  }

  private render(): void {
    if (!this.onRender) return

    const level = this.levelManager.getCurrentLevel()
    const playerState = this.stealthManager.getPlayerState()
    const guards = this.guardAI.getGuards()
    const objects = this.interactiveObject.getObjects()
    const lights = this.stealthManager.getLightSources()
    const soundWaves = this.stealthManager.getActiveSoundWaves()
    const nearby = this.interactiveObject.getNearbyInteractable(
      playerState.position,
      playerState.interactionRange
    )

    const data: GameRenderData = {
      phase: this.phase,
      level,
      playerPosition: playerState.position,
      playerVisibility: playerState.visibility,
      playerIsHidden: playerState.isHidden,
      playerIsSprinting: playerState.isSprinting,
      playerTrail: playerState.trail.map(p => ({ x: p.x, y: p.y, alpha: p.alpha, size: p.size })),
      guards: guards.map(g => ({
        position: g.position,
        direction: g.direction,
        state: g.state,
        viewCone: g.viewCone,
        viewRange: g.config.viewRange,
        viewAngle: g.config.viewAngle,
      })),
      interactiveObjects: objects.map(o => ({
        position: o.config.position,
        type: o.config.type,
        isActive: o.config.isActive,
        isActivated: o.isActivated,
        candleLit: o.candleLit,
        soundWave: o.soundWave,
        label: this.interactiveObject.getObjectLabel(o),
      })),
      lightSources: lights.map(l => ({
        position: l.position,
        radius: l.radius,
        intensity: l.intensity,
        isLit: l.isLit,
      })),
      soundWaves,
      currentLevel: this.levelManager.getCurrentLevelIndex() + 1,
      totalLevels: this.levelManager.getTotalLevels(),
      timeRemaining: this.timeRemaining,
      nearbyInteractable: nearby ? this.interactiveObject.getObjectLabel(nearby) : null,
      sprintProgress: this.stealthManager.getSprintProgress(),
      sprintReady: this.stealthManager.isSprintReady(),
      dodgeFlashAlpha: this.dodgeFlashAlpha,
      levelName: level.name,
    }

    this.onRender(data)
  }

  getPhase(): GamePhase {
    return this.phase
  }

  stop(): void {
    this.running = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }
}
