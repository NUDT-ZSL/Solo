import { GameState, GameScore, LevelConfig, PlayerState, BeatQuality, LEVEL_CONFIGS } from './types'
import { BeatDetector } from './BeatDetector'
import { StoneManager } from './StoneManager'

export type GameEventCallback = (event: string, data?: unknown) => void

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animationFrameId: number = 0
  private lastTimestamp: number = 0
  private running: boolean = false

  private gameState: GameState = 'MENU'
  private currentLevelIndex: number = 0
  private score: GameScore = {
    combo: 0,
    maxCombo: 0,
    totalScore: 0,
    activatedStones: 0,
    totalStones: 6,
  }

  private beatDetector: BeatDetector = new BeatDetector()
  private stoneManager: StoneManager = new StoneManager()
  private player: PlayerState = {
    angle: -Math.PI / 2,
    speed: 0.5,
    nearStone: null,
    size: 12,
  }

  private audioContext: AudioContext | null = null
  private centerX: number = 0
  private centerY: number = 0
  private altarRadius: number = 150
  private canvasWidth: number = 800
  private canvasHeight: number = 600

  private eventCallback: GameEventCallback | null = null
  private transitionAlpha: number = 0
  private transitionPhase: 'fadeout' | 'fadein' | 'done' = 'done'
  private bgParticles: { x: number; y: number; size: number; speed: number; alpha: number }[] = []
  private lastDrumBeat: number = 0
  private inputLocked: boolean = false
  private comboAnimTimer: number = 0
  private feedbackText: string = ''
  private feedbackTimer: number = 0
  private feedbackQuality: BeatQuality | null = null

  onEvent(callback: GameEventCallback): void {
    this.eventCallback = callback
  }

  private emit(event: string, data?: unknown): void {
    if (this.eventCallback) {
      this.eventCallback(event, data)
    }
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!

    this.resize()
    this.initBgParticles()
    window.addEventListener('resize', () => this.resize())
  }

  private resize(): void {
    if (!this.canvas) return
    const parent = this.canvas.parentElement
    if (!parent) return

    const w = parent.clientWidth
    const h = parent.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'

    this.canvasWidth = w
    this.canvasHeight = h
    this.centerX = w / 2
    this.centerY = h / 2
    this.altarRadius = Math.min(w, h) * 0.25

    if (this.ctx) {
      this.ctx.scale(dpr, dpr)
    }

    if (this.stoneManager.getStones().length > 0) {
      this.stoneManager.initStones(
        LEVEL_CONFIGS[this.currentLevelIndex].stones,
        this.centerX,
        this.centerY,
        this.altarRadius
      )
    }
  }

  private initBgParticles(): void {
    this.bgParticles = []
    for (let i = 0; i < 30; i++) {
      this.bgParticles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.5,
        alpha: 0.1 + Math.random() * 0.3,
      })
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTimestamp = performance.now()
    this.loop(this.lastTimestamp)
  }

  stop(): void {
    this.running = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.beatDetector.stop()
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return

    const deltaTime = Math.min(timestamp - this.lastTimestamp, 50)
    this.lastTimestamp = timestamp

    this.update(deltaTime)
    this.render()

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number): void {
    const dt = deltaTime / 1000

    this.updateBgParticles(dt)

    if (this.gameState === 'PLAYING') {
      this.updatePlaying(dt, deltaTime)
    } else if (this.gameState === 'TRANSITION') {
      this.updateTransition(dt)
    }

    if (this.comboAnimTimer > 0) {
      this.comboAnimTimer = Math.max(0, this.comboAnimTimer - dt * 3)
    }

    if (this.feedbackTimer > 0) {
      this.feedbackTimer = Math.max(0, this.feedbackTimer - dt * 2)
    }

    this.stoneManager.update(deltaTime)
  }

  private updatePlaying(dt: number, deltaTime: number): void {
    this.player.angle += this.player.speed * dt

    this.updateNearStone()

    if (this.audioContext && this.beatDetector.isRunning()) {
      const beatInterval = this.beatDetector.getBeatInterval()
      const elapsed = this.beatDetector.getElapsedTime()
      const currentBeatIndex = Math.floor(elapsed / beatInterval)
      if (currentBeatIndex > this.lastDrumBeat) {
        this.lastDrumBeat = currentBeatIndex
        const level = LEVEL_CONFIGS[this.currentLevelIndex]
        const strengthIdx = currentBeatIndex % level.beatMap.length
        const strength = level.beatMap[strengthIdx]
        this.beatDetector.playDrumBeat(this.audioContext, strength >= 0.7)
      }
    }
  }

  private updateNearStone(): void {
    const playerAngle = this.normalizeAngle(this.player.angle)
    let nearest: number | null = null
    let minDiff = Infinity

    const stones = this.stoneManager.getStones()
    for (let i = 0; i < stones.length; i++) {
      const stoneAngle = this.normalizeAngle((stones[i].config.angle * Math.PI) / 180)
      let diff = Math.abs(playerAngle - stoneAngle)
      if (diff > Math.PI) diff = Math.PI * 2 - diff
      if (diff < 0.3 && diff < minDiff) {
        minDiff = diff
        nearest = i
      }
    }

    this.player.nearStone = nearest
  }

  private normalizeAngle(a: number): number {
    let result = a % (Math.PI * 2)
    if (result < 0) result += Math.PI * 2
    return result
  }

  private updateTransition(dt: number): void {
    if (this.transitionPhase === 'fadeout') {
      this.transitionAlpha += dt * 2
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1
        this.transitionPhase = 'fadein'
        this.currentLevelIndex++
        this.loadCurrentLevel()
      }
    } else if (this.transitionPhase === 'fadein') {
      this.transitionAlpha -= dt * 2
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0
        this.transitionPhase = 'done'
        this.gameState = 'PLAYING'
        this.startBeatDetection()
      }
    }
  }

  handleInput(): void {
    if (this.inputLocked) return

    if (this.gameState === 'MENU') {
      this.startGame()
      return
    }

    if (this.gameState === 'GAME_OVER') {
      this.restartLevel()
      return
    }

    if (this.gameState === 'LEVEL_COMPLETE') {
      this.nextLevel()
      return
    }

    if (this.gameState !== 'PLAYING') return
    if (this.player.nearStone === null) return

    const nearIdx = this.player.nearStone
    const stone = this.stoneManager.getStones()[nearIdx]
    if (stone.activated) return

    if (!this.audioContext || !this.beatDetector.isRunning()) {
      this.onMiss(nearIdx)
      return
    }

    const inputTime = this.audioContext.currentTime * 1000
    const result = this.beatDetector.checkBeat(inputTime)

    if (result.hit) {
      this.onHit(nearIdx, result.quality)
    } else {
      this.onMiss(nearIdx)
    }
  }

  private onHit(stoneIndex: number, quality: BeatQuality): void {
    this.stoneManager.activateStone(stoneIndex)

    this.score.combo++
    if (this.score.combo > this.score.maxCombo) {
      this.score.maxCombo = this.score.combo
    }

    const basePoints = quality === 'perfect' ? 100 : 50
    const comboMultiplier = Math.min(this.score.combo, 10)
    this.score.totalScore += basePoints * comboMultiplier
    this.score.activatedStones = this.stoneManager.getActivatedCount()

    this.comboAnimTimer = 1.0
    this.feedbackText = quality === 'perfect' ? 'Perfect!' : 'Good!'
    this.feedbackQuality = quality
    this.feedbackTimer = 1.0

    this.emit('scoreUpdate', this.getScore())
    this.emit('beatResult', { quality, stoneIndex })

    if (this.stoneManager.isAllActivated()) {
      this.onLevelComplete()
    }
  }

  private onMiss(stoneIndex: number): void {
    this.stoneManager.failStone(stoneIndex)
    this.stoneManager.playFailSound()

    this.score.combo = 0
    this.score.totalScore = Math.max(0, this.score.totalScore - 25)
    this.comboAnimTimer = 1.0
    this.feedbackText = 'Miss!'
    this.feedbackQuality = 'miss'
    this.feedbackTimer = 1.0

    this.emit('scoreUpdate', this.getScore())
    this.emit('beatResult', { quality: 'miss', stoneIndex })

    if (this.score.activatedStones > 0 && this.score.combo === 0) {
      this.gameState = 'GAME_OVER'
      this.beatDetector.stop()
      this.emit('gameOver')
    }
  }

  private onLevelComplete(): void {
    this.gameState = 'LEVEL_COMPLETE'
    this.beatDetector.stop()
    this.stoneManager.playHornSound()
    this.emit('levelComplete', { level: this.currentLevelIndex + 1, score: this.score })
  }

  private startGame(): void {
    this.currentLevelIndex = 0
    this.score = {
      combo: 0,
      maxCombo: 0,
      totalScore: 0,
      activatedStones: 0,
      totalStones: 6,
    }
    this.loadCurrentLevel()
    this.initAudio()
    this.gameState = 'PLAYING'
    this.startBeatDetection()
    this.emit('gameStart')
    this.emit('scoreUpdate', this.getScore())
  }

  private restartLevel(): void {
    this.score.combo = 0
    this.score.activatedStones = 0
    this.stoneManager.resetAllStones()
    this.gameState = 'PLAYING'
    this.startBeatDetection()
    this.emit('scoreUpdate', this.getScore())
  }

  private nextLevel(): void {
    if (this.currentLevelIndex >= LEVEL_CONFIGS.length - 1) {
      this.gameState = 'MENU'
      this.beatDetector.stop()
      this.emit('gameWin')
      return
    }

    this.gameState = 'TRANSITION'
    this.transitionAlpha = 0
    this.transitionPhase = 'fadeout'
    this.stoneManager.playHornSound()
    this.emit('transitionStart')
  }

  private loadCurrentLevel(): void {
    const level = LEVEL_CONFIGS[this.currentLevelIndex]
    this.stoneManager.initStones(level.stones, this.centerX, this.centerY, this.altarRadius)
    this.beatDetector.loadBeatMap(level.bpm, level.beatMap, level.tolerance)
    this.score.activatedStones = 0
    this.score.totalStones = level.stones.length
    this.score.combo = 0
    this.lastDrumBeat = 0
    this.player.angle = -Math.PI / 2
    this.emit('levelLoad', { level: level.id, name: level.name, bpm: level.bpm })
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    this.stoneManager.setAudioContext(this.audioContext)
  }

  private startBeatDetection(): void {
    this.initAudio()
    if (this.audioContext) {
      this.beatDetector.start(this.audioContext)
    }
  }

  private updateBgParticles(dt: number): void {
    for (const p of this.bgParticles) {
      p.y -= p.speed * dt * 30
      p.alpha = 0.1 + Math.sin(Date.now() * 0.001 + p.x) * 0.15
      if (p.y < -10) {
        p.y = this.canvasHeight + 10
        p.x = Math.random() * this.canvasWidth
      }
    }
  }

  private render(): void {
    if (!this.ctx) return
    const ctx = this.ctx

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    this.renderBackground(ctx)

    if (this.gameState === 'MENU') {
      this.renderMenuScene(ctx)
    } else {
      this.renderGameScene(ctx)
    }

    if (this.gameState === 'TRANSITION') {
      this.renderTransition(ctx)
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.canvasWidth * 0.7
    )
    grad.addColorStop(0, '#4A3728')
    grad.addColorStop(0.5, '#3D2B1F')
    grad.addColorStop(1, '#2A1B0F')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    for (const p of this.bgParticles) {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = '#CC7722'
      ctx.fill()
      ctx.restore()
    }

    this.renderTextureOverlay(ctx)
  }

  private renderTextureOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = 0.03
    for (let x = 0; x < this.canvasWidth; x += 4) {
      for (let y = 0; y < this.canvasHeight; y += 4) {
        if (Math.random() > 0.7) {
          ctx.fillStyle = Math.random() > 0.5 ? '#5A4A38' : '#2A1B0F'
          ctx.fillRect(x, y, 2, 2)
        }
      }
    }
    ctx.restore()
  }

  private renderAltar(ctx: CanvasRenderingContext2D): void {
    const r = this.altarRadius

    ctx.save()

    ctx.beginPath()
    ctx.arc(this.centerX, this.centerY, r + 20, 0, Math.PI * 2)
    const outerGrad = ctx.createRadialGradient(this.centerX, this.centerY, r, this.centerX, this.centerY, r + 20)
    outerGrad.addColorStop(0, '#6B5B4F')
    outerGrad.addColorStop(1, '#3D2B1F')
    ctx.fillStyle = outerGrad
    ctx.fill()

    ctx.beginPath()
    ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2)
    const altarGrad = ctx.createRadialGradient(
      this.centerX - r * 0.2, this.centerY - r * 0.2, 0,
      this.centerX, this.centerY, r
    )
    altarGrad.addColorStop(0, '#8B7355')
    altarGrad.addColorStop(0.7, '#6B5B4F')
    altarGrad.addColorStop(1, '#5A4A38')
    ctx.fillStyle = altarGrad
    ctx.fill()

    ctx.strokeStyle = '#8B1A1A'
    ctx.lineWidth = 2
    ctx.stroke()

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12
      const ix = this.centerX + Math.cos(angle) * r * 0.7
      const iy = this.centerY + Math.sin(angle) * r * 0.7
      ctx.beginPath()
      ctx.arc(ix, iy, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#CC7722'
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.002 + i) * 0.3
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.beginPath()
    ctx.arc(this.centerX, this.centerY, r * 0.15, 0, Math.PI * 2)
    const centerGrad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, r * 0.15)
    centerGrad.addColorStop(0, '#CC7722')
    centerGrad.addColorStop(1, '#8B1A1A')
    ctx.fillStyle = centerGrad
    ctx.shadowColor = '#CC7722'
    ctx.shadowBlur = 15
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore()
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const px = this.centerX + Math.cos(this.player.angle) * this.altarRadius
    const py = this.centerY + Math.sin(this.player.angle) * this.altarRadius
    const size = this.player.size

    ctx.save()

    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    const playerGrad = ctx.createRadialGradient(px, py, 0, px, py, size)
    playerGrad.addColorStop(0, '#F5E6D0')
    playerGrad.addColorStop(1, '#CC7722')
    ctx.fillStyle = playerGrad
    ctx.shadowColor = '#CC7722'
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0

    const dirAngle = this.player.angle + Math.PI / 2
    const tipX = px + Math.cos(dirAngle) * size * 1.5
    const tipY = py + Math.sin(dirAngle) * size * 1.5
    ctx.beginPath()
    ctx.moveTo(px + Math.cos(dirAngle - 0.4) * size, py + Math.sin(dirAngle - 0.4) * size)
    ctx.lineTo(tipX, tipY)
    ctx.lineTo(px + Math.cos(dirAngle + 0.4) * size, py + Math.sin(dirAngle + 0.4) * size)
    ctx.closePath()
    ctx.fillStyle = '#CC7722'
    ctx.fill()

    if (this.player.nearStone !== null) {
      ctx.beginPath()
      ctx.arc(px, py, size + 8, 0, Math.PI * 2)
      ctx.strokeStyle = '#FFD93D'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.3
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  private renderMenuScene(ctx: CanvasRenderingContext2D): void {
    this.renderAltar(ctx)
    this.stoneManager.render(ctx)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = 'bold 48px "Georgia", serif'
    ctx.fillStyle = '#CC7722'
    ctx.shadowColor = '#CC7722'
    ctx.shadowBlur = 20
    ctx.fillText('图腾之息', this.centerX, this.centerY - this.altarRadius - 60)
    ctx.shadowBlur = 0

    ctx.font = '20px "Georgia", serif'
    ctx.fillStyle = '#8B7355'
    ctx.fillText('点击或按空格开始', this.centerX, this.centerY + this.altarRadius + 60)

    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#6B5B4F'
    ctx.fillText('踩准节拍，敲击图腾', this.centerX, this.centerY + this.altarRadius + 90)

    ctx.restore()
  }

  private renderGameScene(ctx: CanvasRenderingContext2D): void {
    this.renderAltar(ctx)
    this.stoneManager.render(ctx)
    this.renderPlayer(ctx)
    this.renderFeedback(ctx)
  }

  private renderFeedback(ctx: CanvasRenderingContext2D): void {
    if (this.feedbackTimer <= 0) return

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = this.feedbackTimer

    const fontSize = 24 + (1 - this.feedbackTimer) * 10
    ctx.font = `bold ${fontSize}px "Georgia", serif`

    if (this.feedbackQuality === 'perfect') {
      ctx.fillStyle = '#FFD93D'
      ctx.shadowColor = '#FFD93D'
    } else if (this.feedbackQuality === 'good') {
      ctx.fillStyle = '#7ED321'
      ctx.shadowColor = '#7ED321'
    } else {
      ctx.fillStyle = '#E84545'
      ctx.shadowColor = '#E84545'
    }
    ctx.shadowBlur = 10

    const yOffset = (1 - this.feedbackTimer) * -30
    ctx.fillText(this.feedbackText, this.centerX, this.centerY - this.altarRadius - 40 + yOffset)

    ctx.restore()
  }

  private renderTransition(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = this.transitionAlpha
    ctx.fillStyle = '#1A0E05'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    if (this.transitionAlpha > 0.3) {
      ctx.globalAlpha = this.transitionAlpha
      const rotation = Date.now() * 0.001
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (i * Math.PI * 2) / 6
        const dist = 80
        const sx = this.centerX + Math.cos(angle) * dist
        const sy = this.centerY + Math.sin(angle) * dist

        ctx.beginPath()
        ctx.arc(sx, sy, 20, 0, Math.PI * 2)
        ctx.fillStyle = LEVEL_CONFIGS[Math.min(this.currentLevelIndex + 1, LEVEL_CONFIGS.length - 1)].stones[i].color
        ctx.shadowColor = LEVEL_CONFIGS[Math.min(this.currentLevelIndex + 1, LEVEL_CONFIGS.length - 1)].stones[i].glowColor
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    ctx.restore()
  }

  getScore(): GameScore {
    return { ...this.score }
  }

  getGameState(): GameState {
    return this.gameState
  }

  getCurrentLevel(): LevelConfig {
    return LEVEL_CONFIGS[this.currentLevelIndex]
  }

  getBeatDetector(): BeatDetector {
    return this.beatDetector
  }

  getStoneManager(): StoneManager {
    return this.stoneManager
  }

  getPlayer(): PlayerState {
    return { ...this.player }
  }

  getComboAnimTimer(): number {
    return this.comboAnimTimer
  }

  getFeedbackInfo(): { text: string; timer: number; quality: BeatQuality | null } {
    return {
      text: this.feedbackText,
      timer: this.feedbackTimer,
      quality: this.feedbackQuality,
    }
  }
}
