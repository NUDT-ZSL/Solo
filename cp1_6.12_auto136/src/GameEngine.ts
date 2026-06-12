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
  SPAWN_Z
} from './types'
import { NoteGenerator } from './NoteGenerator'
import { v4 as uuidv4 } from 'uuid'

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

  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private beatInterval: number = 0
  private lastBeatTime: number = 0
  private nextNoteIndex: number = 0
  private nextObstacleIndex: number = 0
  private travelDuration: number = 2000

  private audioContext: AudioContext | null = null

  constructor(levelConfig: LevelConfig, callbacks: GameCallbacks) {
    this.levelConfig = levelConfig
    this.noteGenerator = new NoteGenerator(levelConfig)
    this.callbacks = callbacks
    this.beatInterval = this.noteGenerator.getBeatInterval()
    this.game.levelId = levelConfig.id
    this.game.levelName = levelConfig.name
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

      for (let i = 0; i < this.levelConfig.obstacleDensity; i++) {
        const lane = Math.floor(Math.random() * 3)
        const type = types[Math.floor(Math.random() * types.length)]

        const existingAtTime = this.obstacles.filter(
          (o) => Math.abs(o.time - time) < 50 && o.lane === lane
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
    const collectWindow = GOOD_WINDOW

    const noteToCollect = this.activeNotes.find(
      (note) =>
        !note.collected &&
        note.lane === this.player.targetLane &&
        Math.abs(note.time - currentTime) <= collectWindow
    )

    if (noteToCollect) {
      const timeDiff = Math.abs(noteToCollect.time - currentTime)
      const isPerfect = timeDiff <= PERFECT_WINDOW

      noteToCollect.collected = true
      noteToCollect.perfect = isPerfect

      const baseScore = noteToCollect.type === 'bonus' ? 100 : 50
      const comboMultiplier = 1 + Math.floor(this.game.combo / 10) * 0.1
      const perfectBonus = isPerfect ? 1.5 : 1

      this.game.score += Math.floor(baseScore * comboMultiplier * perfectBonus)
      this.game.combo++
      this.game.maxCombo = Math.max(this.game.maxCombo, this.game.combo)
      this.game.notesCollected++

      if (isPerfect) {
        this.game.perfectStreak++
        this.game.missStreak = 0
        this.screenFlash = 1
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

  private triggerSpeedBoost(): void {
    this.game.speedMultiplier = 1.2
    this.game.speedBoostTimer = 8000
    this.callbacks.onSpeedChange(1.2, true)
    this.spawnSpeedParticles('#00f0ff')
  }

  private triggerSpeedReduction(): void {
    this.game.speedMultiplier = 0.9
    this.game.speedReductionTimer = 5000
    this.callbacks.onSpeedChange(0.9, false)
    this.spawnSpeedParticles('#ff6b9d')
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
    for (const obstacle of this.activeObstacles) {
      if (obstacle.passed) continue

      const hitTime = obstacle.time
      const currentTime = this.game.currentTime
      const timeDiff = currentTime - hitTime

      if (timeDiff >= -50 && timeDiff <= 100) {
        if (obstacle.lane === this.player.targetLane && !this.player.isInvincible) {
          this.playerHit()
          obstacle.passed = true
        } else if (timeDiff > 50 && !obstacle.passed) {
          obstacle.passed = true
          if (obstacle.lane !== this.player.targetLane) {
            this.game.obstaclesCleared++
            this.game.score += 10
            this.callbacks.onScoreUpdate(this.game.score)
          }
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

    if (this.game.missStreak >= 3) {
      this.triggerSpeedReduction()
    }

    if (this.player.health <= 0) {
      this.gameOver()
    }
  }

  private gameOver(): void {
    this.game.isGameOver = true
    this.game.isPlaying = false
    this.callbacks.onGameOver({
      score: this.game.score,
      maxCombo: this.game.maxCombo,
      obstaclesCleared: this.game.obstaclesCleared,
      notesCollected: this.game.notesCollected
    })
  }

  private spawnCollectParticles(isPerfect: boolean): void {
    const colors = isPerfect ? ['#ffd93d', '#fff', '#00f0ff'] : ['#ffd93d', '#ffa500']
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight * 0.7

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      this.particles.push({
        id: uuidv4(),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * (3 + Math.random() * 3),
        vy: Math.sin(angle) * (3 + Math.random() * 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 4
      })
    }
  }

  private spawnHitParticles(): void {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight * 0.7

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 4
      this.particles.push({
        id: uuidv4(),
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ff4444',
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 5
      })
    }
  }

  private spawnSpeedParticles(color: string): void {
    for (let i = 0; i < 30; i++) {
      const side = Math.random() > 0.5 ? 0 : window.innerWidth
      this.particles.push({
        id: uuidv4(),
        x: side,
        y: Math.random() * window.innerHeight,
        vx: (side === 0 ? 1 : -1) * (5 + Math.random() * 5),
        vy: (Math.random() - 0.5) * 2,
        color,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 4
      })
    }
  }

  private playPerfectSound(): void {
    if (!this.audioContext) return
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15)
    osc.start()
    osc.stop(this.audioContext.currentTime + 0.15)
  }

  private playHitSound(): void {
    if (!this.audioContext) return
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    osc.frequency.value = 150
    osc.type = 'sawtooth'
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2)
    osc.start()
    osc.stop(this.audioContext.currentTime + 0.2)
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
      (n) => !n.collected && currentTime - n.time < GOOD_WINDOW * 2
    )

    this.activeObstacles = this.activeObstacles.filter(
      (o) => currentTime - o.time < 500
    )

    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private calculateZ(time: number, currentTime: number): number {
    const timeDiff = time - currentTime
    const lookAhead = this.travelDuration / this.game.speedMultiplier
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
      const moveSpeed = 8 * deltaTime / 16
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
      }
    }

    if (this.game.speedReductionTimer > 0) {
      this.game.speedReductionTimer -= deltaTime
      if (this.game.speedReductionTimer <= 0) {
        this.game.speedMultiplier = 1
      }
    }

    this.beatFlash = Math.max(0, this.beatFlash - deltaTime / 200)
    this.beatIntensity = Math.max(0, this.beatIntensity - deltaTime / 300)
    this.screenFlash = Math.max(0, this.screenFlash - deltaTime / 300)

    for (const particle of this.particles) {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.1
      particle.life -= deltaTime / 1000
    }

    this.checkBeat(this.game.currentTime)
    this.updateActiveObjects(this.game.currentTime)
    this.checkCollisions()

    for (const note of this.activeNotes) {
      const z = this.calculateZ(note.time, this.game.currentTime)
      ;(note as any).z = z
    }

    for (const obstacle of this.activeObstacles) {
      obstacle.z = this.calculateZ(obstacle.time, this.game.currentTime)
    }
  }

  private gameLoop = (): void => {
    if (!this.game.isPlaying) return

    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
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

  getNoteAccuracy(time: number): BeatAccuracy | null {
    const currentTime = this.game.currentTime
    const diff = Math.abs(time - currentTime)

    if (diff <= PERFECT_WINDOW) return 'perfect'
    if (diff <= GOOD_WINDOW) return 'good'
    return null
  }
}
