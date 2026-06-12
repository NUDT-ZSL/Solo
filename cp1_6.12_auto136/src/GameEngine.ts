import {
  Note,
  Obstacle,
  PlayerState,
  GameState,
  RenderState,
  Particle,
  LevelConfig,
  GameCallbacks,
  BeatAccuracy,
  LANES,
  PERFECT_WINDOW,
  GOOD_WINDOW,
  HIT_Z,
  SPAWN_Z,
  NOTE_RADIUS,
  NOTE_GLOW_RADIUS,
  LANE_WIDTH
} from './types'
import { NoteGenerator } from './NoteGenerator'
import { v4 as uuidv4 } from 'uuid'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Circle {
  x: number
  y: number
  radius: number
}

export class GameEngine {
  private levelConfig: LevelConfig
  private noteGenerator: NoteGenerator
  private callbacks: GameCallbacks

  private notes: Note[] = []
  private obstacles: Obstacle[] = []
  private activeNotes: Note[] = []
  private activeObstacles: Obstacle[] = []
  private beatTimes: number[] = []

  private player: PlayerState = {
    lane: 1,
    targetLane: 1,
    y: 0,
    health: 3,
    maxHealth: 3,
    isInvincible: false,
    invincibleTimer: 0
  }

  private game: GameState = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectStreak: 0,
    missStreak: 0,
    speedMultiplier: 1,
    speedBoostTimer: 0,
    speedReductionTimer: 0,
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    currentTime: 0,
    startTime: 0,
    obstaclesCleared: 0,
    notesCollected: 0,
    levelId: '',
    levelName: ''
  }

  private particles: Particle[] = []
  private beatFlash: number = 0
  private beatIntensity: number = 0
  private currentBeat: number = 0
  private screenFlash: number = 0
  private screenFlashOpacity: number = 0
  private screenFlashStartTime: number = 0
  private screenFlashDuration: number = 300

  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private beatInterval: number = 0
  private lastBeatTime: number = 0
  private nextNoteIndex: number = 0
  private nextObstacleIndex: number = 0
  private travelDuration: number = 2000

  private audioContext: AudioContext | null = null

  private playerCircle: Circle = { x: 0, y: 0, radius: 20 }

  private canvasWidth: number = 1920
  private canvasHeight: number = 1080
  private vanishPointX: number = 960
  private vanishPointY: number = 270
  private playerZoneY: number = 810

  constructor(levelConfig: LevelConfig, callbacks: GameCallbacks) {
    this.levelConfig = levelConfig
    this.noteGenerator = new NoteGenerator(levelConfig)
    this.callbacks = callbacks
    this.beatInterval = this.noteGenerator.getBeatInterval()
    this.game.levelId = levelConfig.id
    this.game.levelName = levelConfig.name
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
    this.vanishPointX = width / 2
    this.vanishPointY = height * 0.25
    this.playerZoneY = height * 0.75
  }

  private rectIntersectsRect(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  private circleIntersectsRect(circle: Circle, rect: Rect): boolean {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width))
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height))
    const dx = circle.x - closestX
    const dy = circle.y - closestY
    return dx * dx + dy * dy < circle.radius * circle.radius
  }

  private circleIntersectsCircle(a: Circle, b: Circle): boolean {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distSq = dx * dx + dy * dy
    const radiusSum = a.radius + b.radius
    return distSq < radiusSum * radiusSum
  }

  private getLaneScreenX(lane: number): number {
    const centerX = this.canvasWidth / 2
    const totalWidth = LANE_WIDTH * LANES
    const startX = centerX - totalWidth / 2
    return startX + lane * LANE_WIDTH + LANE_WIDTH / 2
  }

  private getPlayerRect(): Rect {
    const x = this.getLaneScreenX(this.player.lane)
    const y = this.playerZoneY
    const size = 30
    return {
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size
    }
  }

  private getPlayerCircle(): Circle {
    return {
      x: this.getLaneScreenX(this.player.lane),
      y: this.playerZoneY,
      radius: 20
    }
  }

  private getObstacleScreenRect(obstacle: Obstacle): Rect {
    const t = 1 - obstacle.z / SPAWN_Z
    const screenY = this.vanishPointY + (this.playerZoneY - this.vanishPointY) * t
    const scale = 0.1 + t * 0.9
    const screenX = this.getLaneScreenX(obstacle.lane)
    const baseSize = 40 * scale
    return {
      x: screenX - baseSize / 2,
      y: screenY - baseSize / 2,
      width: baseSize,
      height: baseSize
    }
  }

  private getNoteScreenCircle(note: Note & { z?: number }): Circle {
    const z = (note as any).z ?? SPAWN_Z
    const t = 1 - z / SPAWN_Z
    const screenY = this.vanishPointY + (this.playerZoneY - this.vanishPointY) * t
    const scale = 0.1 + t * 0.9
    const screenX = this.getLaneScreenX(note.lane)
    return {
      x: screenX,
      y: screenY,
      radius: NOTE_RADIUS * scale
    }
  }

  init(): void {
    this.notes = this.noteGenerator.generateNotes()
    this.beatTimes = this.noteGenerator.getBeatTimes()
    this.generateObstacles()
    this.activeNotes = []
    this.activeObstacles = []
    this.particles = []
    this.nextNoteIndex = 0
    this.nextObstacleIndex = 0
    this.currentBeat = 0
    this.lastBeatTime = 0
    this.travelDuration = 2000 / this.levelConfig.baseSpeed
    this.screenFlash = 0
    this.screenFlashOpacity = 0

    this.player = {
      lane: 1,
      targetLane: 1,
      y: 0,
      health: 3,
      maxHealth: 3,
      isInvincible: false,
      invincibleTimer: 0
    }

    this.game = {
      ...this.game,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectStreak: 0,
      missStreak: 0,
      speedMultiplier: 1,
      speedBoostTimer: 0,
      speedReductionTimer: 0,
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      currentTime: 0,
      startTime: 0,
      obstaclesCleared: 0,
      notesCollected: 0
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API not supported')
    }
  }

  private generateObstacles(): void {
    this.obstacles = []
    const totalBeats = Math.floor((this.levelConfig.duration * 1000) / this.beatInterval)
    const types: Array<'gear' | 'spike' | 'lightning'> = ['gear', 'spike', 'lightning']

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      const time = beat * this.beatInterval
      const density = this.levelConfig.obstacleDensity

      for (let i = 0; i < density; i++) {
        const lane = Math.floor(Math.random() * 3)
        const type = types[Math.floor(Math.random() * types.length)]

        const existingAtTime = this.obstacles.filter(
          (o) => Math.abs(o.time - time) < this.beatInterval * 0.4 && o.lane === lane
        )

        if (existingAtTime.length === 0) {
          this.obstacles.push({
            id: uuidv4(),
            time,
            lane,
            type,
            z: SPAWN_Z,
            passed: false
          })
        }
      }
    }

    this.obstacles.sort((a, b) => a.time - b.time)
  }

  start(): void {
    if (this.game.isPlaying) return
    this.game.isPlaying = true
    this.game.isPaused = false
    this.game.startTime = performance.now()
    this.lastFrameTime = performance.now()
    this.gameLoop()
  }

  pause(): void {
    this.game.isPaused = !this.game.isPaused
  }

  stop(): void {
    this.game.isPlaying = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  moveLeft(): void {
    if (!this.game.isPlaying || this.game.isPaused || this.game.isGameOver) return
    if (this.player.targetLane > 0) {
      this.player.targetLane--
    }
  }

  moveRight(): void {
    if (!this.game.isPlaying || this.game.isPaused || this.game.isGameOver) return
    if (this.player.targetLane < LANES - 1) {
      this.player.targetLane++
    }
  }

  collectNote(): void {
    if (!this.game.isPlaying || this.game.isPaused || this.game.isGameOver) return

    const currentTime = this.game.currentTime
    const playerCircle = this.getPlayerCircle()

    let bestNote: Note | null = null
    let bestDiff = Infinity

    for (const note of this.activeNotes) {
      if (note.collected) continue

      const timeDiff = Math.abs(note.time - currentTime)

      if (timeDiff > GOOD_WINDOW) continue

      const noteCircle = this.getNoteScreenCircle(note)
      if (!this.circleIntersectsCircle(playerCircle, {
        ...noteCircle,
        radius: noteCircle.radius + NOTE_GLOW_RADIUS
      })) continue

      if (note.lane !== this.player.targetLane) continue

      if (timeDiff < bestDiff) {
        bestDiff = timeDiff
        bestNote = note
      }
    }

    if (bestNote) {
      const isPerfect = bestDiff <= PERFECT_WINDOW

      bestNote.collected = true
      bestNote.perfect = isPerfect

      const baseScore = bestNote.type === 'bonus' ? 100 : 50
      const comboMultiplier = 1 + Math.floor(this.game.combo / 10) * 0.1
      const perfectBonus = isPerfect ? 1.5 : 1

      this.game.score += Math.floor(baseScore * comboMultiplier * perfectBonus)
      this.game.combo++
      this.game.maxCombo = Math.max(this.game.maxCombo, this.game.combo)
      this.game.notesCollected++

      if (isPerfect) {
        this.game.perfectStreak++
        this.game.missStreak = 0
        this.triggerScreenFlash()
        this.callbacks.onPerfect()
        this.playPerfectSound()

        if (this.game.perfectStreak >= 5) {
          this.triggerSpeedBoost()
        }
      } else {
        this.game.perfectStreak = 0
      }

      this.callbacks.onScoreUpdate(this.game.score)
      this.callbacks.onComboUpdate(this.game.combo, this.game.maxCombo)
      this.callbacks.onCollect()

      this.spawnCollectParticles(isPerfect)
    } else {
      this.game.combo = 0
      this.game.perfectStreak = 0
      this.callbacks.onComboUpdate(0, this.game.maxCombo)
    }
  }

  private triggerScreenFlash(): void {
    this.screenFlash = 1
    this.screenFlashOpacity = 0.7
    this.screenFlashStartTime = performance.now()
  }

  private updateScreenFlash(deltaTime: number): void {
    if (this.screenFlash > 0) {
      const elapsed = performance.now() - this.screenFlashStartTime
      if (elapsed >= this.screenFlashDuration) {
        this.screenFlash = 0
        this.screenFlashOpacity = 0
      } else {
        const progress = elapsed / this.screenFlashDuration
        this.screenFlashOpacity = 0.7 * (1 - progress)
        this.screenFlash = 1 - progress
      }
    }
  }

  private triggerSpeedBoost(): void {
    this.game.speedMultiplier = 1.2
    this.game.speedBoostTimer = 8000
    this.game.speedReductionTimer = 0
    this.callbacks.onSpeedChange(1.2, true)
    this.spawnSpeedChangeParticles('#00f0ff', true)
    this.spawnEdgeFlashParticles('#00f0ff')
  }

  private triggerSpeedReduction(): void {
    this.game.speedMultiplier = 0.9
    this.game.speedReductionTimer = 5000
    this.game.speedBoostTimer = 0
    this.callbacks.onSpeedChange(0.9, false)
    this.spawnSpeedChangeParticles('#ff6b9d', false)
    this.spawnEdgeFlashParticles('#ff6b9d')
  }

  private checkBeat(currentTime: number): void {
    const nextBeatTime = this.beatTimes[this.currentBeat]
    if (nextBeatTime && currentTime >= nextBeatTime && this.lastBeatTime < nextBeatTime) {
      this.beatIntensity = 1
      this.beatFlash = 1
      this.currentBeat++
      this.lastBeatTime = nextBeatTime
      this.callbacks.onBeat(1)
    }
  }

  private checkCollisions(): void {
    const playerCircle = this.getPlayerCircle()

    for (const obstacle of this.activeObstacles) {
      if (obstacle.passed) continue

      const z = obstacle.z
      if (z > HIT_Z + 0.5 || z < HIT_Z - 0.8) continue

      const obstacleRect = this.getObstacleScreenRect(obstacle)

      if (obstacle.lane === this.player.targetLane) {
        if (this.circleIntersectsRect(playerCircle, obstacleRect)) {
          if (!this.player.isInvincible) {
            this.playerHit()
            obstacle.passed = true
            continue
          }
        }
      }

      if (z <= HIT_Z - 0.3 && !obstacle.passed) {
        obstacle.passed = true
        if (obstacle.lane !== this.player.targetLane) {
          this.game.obstaclesCleared++
          this.game.score += 10
          this.callbacks.onScoreUpdate(this.game.score)
        }
      }
    }
  }

  private playerHit(): void {
    this.player.health--
    this.game.combo = 0
    this.game.perfectStreak = 0
    this.game.missStreak++
    this.player.isInvincible = true
    this.player.invincibleTimer = 1500

    this.callbacks.onHealthUpdate(this.player.health)
    this.callbacks.onComboUpdate(0, this.game.maxCombo)
    this.callbacks.onHit()

    this.spawnHitParticles()
    this.playHitSound()

    if (this.game.missStreak >= 3 && this.game.speedReductionTimer <= 0) {
      this.triggerSpeedReduction()
    }

    if (this.player.health <= 0) {
      this.gameOver()
    }
  }

  private gameOver(): void {
    this.game.isGameOver = true
    this.game.isPlaying = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.callbacks.onGameOver({
      score: this.game.score,
      maxCombo: this.game.maxCombo,
      obstaclesCleared: this.game.obstaclesCleared,
      notesCollected: this.game.notesCollected
    })
  }

  private spawnCollectParticles(isPerfect: boolean): void {
    const colors = isPerfect ? ['#ffd93d', '#ffffff', '#00f0ff'] : ['#ffd93d', '#ffa500']
    const playerCircle = this.getPlayerCircle()
    const count = isPerfect ? 16 : 10

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = isPerfect ? 5 + Math.random() * 4 : 3 + Math.random() * 3
      this.particles.push({
        id: uuidv4(),
        x: playerCircle.x,
        y: playerCircle.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        size: isPerfect ? 5 + Math.random() * 5 : 3 + Math.random() * 4
      })
    }
  }

  private spawnHitParticles(): void {
    const playerCircle = this.getPlayerCircle()

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 5
      this.particles.push({
        id: uuidv4(),
        x: playerCircle.x,
        y: playerCircle.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 3 === 0 ? '#ff4444' : '#ff6b6b',
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 5
      })
    }
  }

  private spawnSpeedChangeParticles(color: string, isBoost: boolean): void {
    const count = 40
    for (let i = 0; i < count; i++) {
      const isLeft = Math.random() > 0.5
      const baseX = isLeft ? 0 : this.canvasWidth
      this.particles.push({
        id: uuidv4(),
        x: baseX,
        y: Math.random() * this.canvasHeight,
        vx: (isLeft ? 1 : -1) * (4 + Math.random() * 6),
        vy: (Math.random() - 0.5) * 3,
        color,
        life: 1.5,
        maxLife: 1.5,
        size: 2 + Math.random() * 5
      })
    }
  }

  private spawnEdgeFlashParticles(color: string): void {
    const edgeCount = 20
    for (let i = 0; i < edgeCount; i++) {
      const side = Math.floor(Math.random() * 4)
      let x: number, y: number, vx: number, vy: number
      switch (side) {
        case 0:
          x = Math.random() * this.canvasWidth
          y = 0
          vx = (Math.random() - 0.5) * 3
          vy = 2 + Math.random() * 3
          break
        case 1:
          x = Math.random() * this.canvasWidth
          y = this.canvasHeight
          vx = (Math.random() - 0.5) * 3
          vy = -(2 + Math.random() * 3)
          break
        case 2:
          x = 0
          y = Math.random() * this.canvasHeight
          vx = 2 + Math.random() * 3
          vy = (Math.random() - 0.5) * 3
          break
        default:
          x = this.canvasWidth
          y = Math.random() * this.canvasHeight
          vx = -(2 + Math.random() * 3)
          vy = (Math.random() - 0.5) * 3
          break
      }
      this.particles.push({
        id: uuidv4(),
        x,
        y,
        vx,
        vy,
        color,
        life: 1.2,
        maxLife: 1.2,
        size: 3 + Math.random() * 4
      })
    }
  }

  private playPerfectSound(): void {
    if (!this.audioContext) return
    try {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      const now = this.audioContext.currentTime
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)

      const osc2 = this.audioContext.createOscillator()
      const gain2 = this.audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(this.audioContext.destination)
      osc2.frequency.value = 1320
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0.15, now)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
      osc2.start(now)
      osc2.stop(now + 0.1)
    } catch (e) {
      // audio error silent
    }
  }

  private playHitSound(): void {
    if (!this.audioContext) return
    try {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      osc.frequency.value = 150
      osc.type = 'sawtooth'
      const now = this.audioContext.currentTime
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } catch (e) {
      // audio error silent
    }
  }

  private playBeatSound(): void {
    if (!this.audioContext) return
    try {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      osc.frequency.value = 440
      osc.type = 'sine'
      const now = this.audioContext.currentTime
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.start(now)
      osc.stop(now + 0.05)
    } catch (e) {
      // audio error silent
    }
  }

  private updateActiveObjects(currentTime: number): void {
    const lookAhead = this.travelDuration / this.game.speedMultiplier
    const spawnTime = currentTime + lookAhead

    while (
      this.nextNoteIndex < this.notes.length &&
      this.notes[this.nextNoteIndex].time <= spawnTime
    ) {
      const note = { ...this.notes[this.nextNoteIndex] }
      this.activeNotes.push(note)
      this.nextNoteIndex++
    }

    while (
      this.nextObstacleIndex < this.obstacles.length &&
      this.obstacles[this.nextObstacleIndex].time <= spawnTime
    ) {
      const obstacle = { ...this.obstacles[this.nextObstacleIndex] }
      this.activeObstacles.push(obstacle)
      this.nextObstacleIndex++
    }

    this.activeNotes = this.activeNotes.filter(
      (n) => !n.collected && currentTime - n.time < GOOD_WINDOW * 3
    )

    this.activeObstacles = this.activeObstacles.filter(
      (o) => !o.passed || currentTime - o.time < 300
    )

    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private calculateZ(time: number, currentTime: number): number {
    const timeDiff = time - currentTime
    const lookAhead = this.travelDuration / this.game.speedMultiplier
    if (timeDiff <= 0) return Math.max(0, (timeDiff / (lookAhead * 0.3)) * HIT_Z)
    return Math.max(0, (timeDiff / lookAhead) * SPAWN_Z)
  }

  private update(deltaTime: number): void {
    if (!this.game.isPlaying || this.game.isPaused || this.game.isGameOver) return

    this.game.currentTime = performance.now() - this.game.startTime

    if (this.game.currentTime >= this.levelConfig.duration * 1000) {
      this.gameOver()
      return
    }

    if (this.player.targetLane !== this.player.lane) {
      const laneDiff = this.player.targetLane - this.player.lane
      const moveSpeed = 10 * deltaTime / 16
      if (Math.abs(laneDiff) < moveSpeed) {
        this.player.lane = this.player.targetLane
      } else {
        this.player.lane += Math.sign(laneDiff) * moveSpeed
      }
    }

    if (this.player.isInvincible) {
      this.player.invincibleTimer -= deltaTime
      if (this.player.invincibleTimer <= 0) {
        this.player.isInvincible = false
      }
    }

    if (this.game.speedBoostTimer > 0) {
      this.game.speedBoostTimer -= deltaTime
      if (this.game.speedBoostTimer <= 0) {
        this.game.speedMultiplier = 1
        this.game.speedBoostTimer = 0
      }
    }

    if (this.game.speedReductionTimer > 0) {
      this.game.speedReductionTimer -= deltaTime
      if (this.game.speedReductionTimer <= 0) {
        this.game.speedMultiplier = 1
        this.game.speedReductionTimer = 0
      }
    }

    this.beatFlash = Math.max(0, this.beatFlash - deltaTime / 200)
    this.beatIntensity = Math.max(0, this.beatIntensity - deltaTime / 300)
    this.updateScreenFlash(deltaTime)

    for (const particle of this.particles) {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.08
      particle.life -= deltaTime / 1000
    }

    this.checkBeat(this.game.currentTime)
    this.updateActiveObjects(this.game.currentTime)

    for (const note of this.activeNotes) {
      const z = this.calculateZ(note.time, this.game.currentTime)
      ;(note as any).z = z
    }

    for (const obstacle of this.activeObstacles) {
      obstacle.z = this.calculateZ(obstacle.time, this.game.currentTime)
    }

    this.checkCollisions()
  }

  private gameLoop = (): void => {
    if (!this.game.isPlaying) return

    const now = performance.now()
    const deltaTime = Math.min(now - this.lastFrameTime, 50)
    this.lastFrameTime = now

    this.update(deltaTime)

    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }

  getRenderState(): RenderState {
    return {
      player: { ...this.player },
      obstacles: this.activeObstacles.map((o) => ({ ...o })),
      notes: this.activeNotes.map((n) => ({ ...n })),
      game: { ...this.game },
      beatFlash: this.beatFlash,
      beatIntensity: this.beatIntensity,
      currentBeat: this.currentBeat,
      screenFlash: this.screenFlash,
      particles: this.particles.map((p) => ({ ...p }))
    }
  }

  getGameState(): GameState {
    return { ...this.game }
  }

  getLevelConfig(): LevelConfig {
    return { ...this.levelConfig }
  }

  getScreenFlashOpacity(): number {
    return this.screenFlashOpacity
  }

  getNoteAccuracy(time: number): BeatAccuracy | null {
    const currentTime = this.game.currentTime
    const diff = Math.abs(time - currentTime)

    if (diff <= PERFECT_WINDOW) return 'perfect'
    if (diff <= GOOD_WINDOW) return 'good'
    return 'miss'
  }
}
