import { Player } from './Player'
import { EchoSystem } from './EchoSystem'
import { PuzzleManager } from './PuzzleManager'
import { LEVELS, cloneLevel, type Level } from './LevelData'

export type GameStatus = 'loading' | 'menu' | 'playing' | 'paused' | 'win' | 'dead' | 'levelComplete'

export interface GameState {
  status: GameStatus
  currentLevelIndex: number
  isPaused: boolean
  hourglassCooldown: number
  hourglassReady: boolean
  levelCompleted: boolean[]
  typingProgress: number
  title: string
  fps: number
}

export class GameEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  player: Player
  echoSystem: EchoSystem
  puzzleManager: PuzzleManager
  currentLevel: Level
  state: GameState
  cameraX: number
  cameraY: number
  lastTime: number
  frameCount: number
  fpsTime: number
  rafId: number | null
  onStateChange: ((state: GameState) => void) | null
  private spacePressed: boolean
  private shiftHeld: boolean

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx

    this.currentLevel = cloneLevel(LEVELS[0])
    this.player = new Player(this.currentLevel.playerStart.x, this.currentLevel.playerStart.y)
    this.echoSystem = new EchoSystem()
    this.puzzleManager = new PuzzleManager(this.currentLevel)

    this.state = {
      status: 'loading',
      currentLevelIndex: 0,
      isPaused: false,
      hourglassCooldown: 0,
      hourglassReady: true,
      levelCompleted: new Array(LEVELS.length).fill(false),
      typingProgress: 0,
      title: 'EchoRift',
      fps: 60,
    }

    this.cameraX = 0
    this.cameraY = 0
    this.lastTime = performance.now()
    this.frameCount = 0
    this.fpsTime = 0
    this.rafId = null
    this.onStateChange = null
    this.spacePressed = false
    this.shiftHeld = false

    this.puzzleManager.onWin = () => this.goToNextLevel()
    this.puzzleManager.onDeath = () => this.reloadLevel()

    this.setupEventListeners()
    this.resizeCanvas()
  }

  setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('resize', this.resizeCanvas)
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('resize', this.resizeCanvas)
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
  }

  resizeCanvas = () => {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()

    if (this.state.status === 'loading') {
      if (key === ' ' || key === 'enter') {
        this.setState({ status: 'menu' })
      }
      return
    }

    if (this.state.status === 'menu') return

    if (key === 'p' || key === 'escape') {
      if (this.state.status === 'playing') {
        this.setState({ status: 'paused', isPaused: true })
      } else if (this.state.status === 'paused') {
        this.setState({ status: 'playing', isPaused: false })
      }
      return
    }

    if (this.state.status === 'paused' || this.state.status === 'levelComplete') return

    if (this.state.status !== 'playing') return

    this.player.handleKeyDown(key)

    if (key === ' ') {
      e.preventDefault()
      if (!this.spacePressed) {
        this.spacePressed = true
        this.placeEcho()
      }
    }

    if (key === 'shift') {
      this.shiftHeld = true
    }

    if (key === 'r') {
      this.reloadLevel()
    }
  }

  handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    this.player.handleKeyUp(key)

    if (key === ' ') {
      this.spacePressed = false
    }
    if (key === 'shift') {
      this.shiftHeld = false
    }
  }

  placeEcho() {
    const trajectory = this.player.stopRecording()
    this.echoSystem.createEcho(this.player.x, this.player.y, trajectory)
    this.player.startRecording()
  }

  useHourglass() {
    if (!this.state.hourglassReady) return
    this.puzzleManager.resetMechanisms()
    this.setState({ hourglassReady: false, hourglassCooldown: 30000 })
  }

  setState(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial }
    this.onStateChange?.(this.state)
  }

  selectLevel(index: number) {
    if (index < 0 || index >= LEVELS.length) return
    this.loadLevel(index)
    this.setState({ status: 'playing', currentLevelIndex: index })
  }

  loadLevel(index: number) {
    this.currentLevel = cloneLevel(LEVELS[index])
    this.player.x = this.currentLevel.playerStart.x
    this.player.y = this.currentLevel.playerStart.y
    this.player.vx = 0
    this.player.vy = 0
    this.player.trail = []
    this.player.recordBuffer = []
    this.player.startRecording()
    this.echoSystem.clear()
    this.puzzleManager.resetLevel(this.currentLevel)
    this.puzzleManager.level = this.currentLevel
  }

  reloadLevel() {
    this.loadLevel(this.state.currentLevelIndex)
    this.setState({ status: 'playing' })
  }

  goToNextLevel() {
    const nextIndex = this.state.currentLevelIndex + 1
    const completed = [...this.state.levelCompleted]
    completed[this.state.currentLevelIndex] = true

    if (nextIndex >= LEVELS.length) {
      this.setState({ status: 'win', levelCompleted: completed })
    } else {
      this.loadLevel(nextIndex)
      this.setState({ status: 'playing', currentLevelIndex: nextIndex, levelCompleted: completed })
    }
  }

  goToMenu() {
    this.setState({ status: 'menu' })
  }

  start() {
    this.player.startRecording()
    this.lastTime = performance.now()
    this.loop()
  }

  loop = () => {
    const now = performance.now()
    const dt = Math.min(now - this.lastTime, 50)
    this.lastTime = now

    this.frameCount++
    this.fpsTime += dt
    if (this.fpsTime >= 500) {
      const fps = Math.round((this.frameCount * 1000) / this.fpsTime)
      this.frameCount = 0
      this.fpsTime = 0
      if (fps !== this.state.fps) {
        this.setState({ fps })
      }
    }

    this.update(dt)
    this.render()

    this.rafId = requestAnimationFrame(this.loop)
  }

  update(dt: number) {
    if (this.state.status === 'loading') {
      const progress = this.state.typingProgress + dt / 100
      if (progress < this.state.title.length + 5) {
        this.setState({ typingProgress: progress })
      }
      return
    }

    if (this.state.status === 'menu' || this.state.status === 'paused' || this.state.status === 'win') return

    if (this.state.status !== 'playing') return

    if (!this.state.hourglassReady) {
      const newCooldown = Math.max(0, this.state.hourglassCooldown - dt)
      this.setState({
        hourglassCooldown: newCooldown,
        hourglassReady: newCooldown <= 0,
      })
    }

    const checkCollision = (nx: number, ny: number, r: number): boolean => {
      if (this.puzzleManager.checkWallCollision(nx, ny, r)) return true
      if (this.puzzleManager.checkBlockCollision(nx, ny, r)) return true
      return false
    }

    this.player.update(dt, checkCollision)
    this.echoSystem.update(dt)
    this.puzzleManager.update(dt, this.player, this.echoSystem.getActiveEchoes())

    if (!this.puzzleManager.winEffectActive && !this.puzzleManager.deathFlashActive) {
      if (this.puzzleManager.checkWin(this.player)) {
        const ex = this.currentLevel.exit.x + this.currentLevel.exit.size / 2
        const ey = this.currentLevel.exit.y + this.currentLevel.exit.size / 2
        this.puzzleManager.triggerWinEffect(ex, ey)
        this.setState({ status: 'levelComplete' })
      }

      if (this.puzzleManager.checkDeath(this.player)) {
        this.puzzleManager.triggerDeathEffect()
        this.setState({ status: 'dead' })
      }
    }

    const targetCamX = this.player.x - this.canvas.width / 2
    const targetCamY = this.player.y - this.canvas.height / 2
    this.cameraX += (targetCamX - this.cameraX) * 0.12
    this.cameraY += (targetCamY - this.cameraY) * 0.12

    this.cameraX = Math.max(0, Math.min(this.cameraX, this.currentLevel.width - this.canvas.width))
    this.cameraY = Math.max(0, Math.min(this.cameraY, this.currentLevel.height - this.canvas.height))
  }

  render() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, W, H)

    if (this.state.status === 'loading') {
      this.renderLoading(ctx, W, H)
      return
    }

    if (this.state.status === 'menu') {
      this.renderMenuBackground(ctx, W, H)
      return
    }

    this.renderGround(ctx, W, H)
    this.puzzleManager.draw(ctx, this.cameraX, this.cameraY)
    this.echoSystem.draw(ctx, this.cameraX, this.cameraY)
    this.player.draw(ctx, this.cameraX, this.cameraY)

    if (this.state.status === 'paused') {
      ctx.fillStyle = '#00000080'
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#00a8ff'
      ctx.shadowBlur = 20
      ctx.fillText('Paused', W / 2, H / 2)
      ctx.font = '20px sans-serif'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#aaccff'
      ctx.fillText('Press P or Esc to continue', W / 2, H / 2 + 60)
      ctx.restore()
    }

    if (this.state.status === 'dead' || this.puzzleManager.deathFlashActive) {
      const elapsed = Date.now() - this.puzzleManager.deathFlashStartTime
      const flash = Math.sin(elapsed * 0.02) > 0
      if (flash) {
        ctx.fillStyle = 'rgba(255, 0, 60, 0.25)'
        ctx.fillRect(0, 0, W, H)
      }
      ctx.save()
      ctx.fillStyle = '#ff3355'
      ctx.font = 'bold 72px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#ff0040'
      ctx.shadowBlur = 30
      ctx.fillText('You Died', W / 2, H / 2)
      ctx.restore()
    }

    if (this.state.status === 'win') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.fillStyle = '#ffd700'
      ctx.font = 'bold 64px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 30
      ctx.fillText('VICTORY!', W / 2, H / 2 - 40)
      ctx.font = '24px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.shadowBlur = 10
      ctx.fillText('You have escaped the Echo Rift', W / 2, H / 2 + 30)
      ctx.font = '18px sans-serif'
      ctx.fillStyle = '#aaccff'
      ctx.fillText('Click "Menu" to play again', W / 2, H / 2 + 80)
      ctx.restore()
    }
  }

  renderGround(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#16213e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    const gridSize = 80
    const offsetX = -this.cameraX % gridSize
    const offsetY = -this.cameraY % gridSize

    ctx.save()
    ctx.strokeStyle = 'rgba(0, 168, 255, 0.05)'
    ctx.lineWidth = 1
    for (let x = offsetX; x < W; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = offsetY; y < H; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  renderLoading(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
    bgGrad.addColorStop(0, '#1a1a3e')
    bgGrad.addColorStop(1, '#050510')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    const chars = Math.floor(this.state.typingProgress)
    const displayText = this.state.title.substring(0, chars)

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 64px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#00a8ff'
    ctx.shadowBlur = 25
    ctx.fillText(displayText, W / 2, H / 2 - 30)

    if (chars >= this.state.title.length) {
      const cursorAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.008)
      ctx.globalAlpha = cursorAlpha
      ctx.fillText('_', W / 2 + ctx.measureText(displayText).width / 2 + 5, H / 2 - 30)
      ctx.globalAlpha = 1

      if (this.state.typingProgress >= this.state.title.length + 3) {
        ctx.font = '22px sans-serif'
        ctx.shadowBlur = 10
        const promptAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.004)
        ctx.globalAlpha = promptAlpha
        ctx.fillStyle = '#88ccff'
        ctx.fillText('Press Space or Enter to begin', W / 2, H / 2 + 60)
        ctx.globalAlpha = 1
      }
    }
    ctx.restore()
  }

  renderMenuBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
    bgGrad.addColorStop(0, '#1a1a3e')
    bgGrad.addColorStop(1, '#050510')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    const t = Date.now() * 0.001
    ctx.save()
    for (let i = 0; i < 40; i++) {
      const px = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * W
      const py = (Math.cos(t * 0.25 + i * 2.3) * 0.5 + 0.5) * H
      const alpha = 0.2 + 0.2 * Math.sin(t + i)
      ctx.globalAlpha = alpha
      ctx.shadowColor = '#00a8ff'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(px, py, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  getEchoCount(): number {
    return this.echoSystem.getActiveEchoes().length
  }
}
