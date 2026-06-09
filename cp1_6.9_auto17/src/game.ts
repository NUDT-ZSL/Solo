// 潮汐碑文·遗迹解谜 - 核心游戏循环
// 数据流向: 接收键盘/鼠标输入 -> 更新潮汐计时器与石碑状态 -> 渲染Canvas，输出画面帧

import {
  TidalLevel, GlyphStone, EnergyLink, Particle, PortalAura,
  createTidalLevel, updateTidalLevel, createStonesGrid,
  updateStoneFlip, flipStone, pickStoneAt, isStoneOperable,
  updateStonesLock, recomputeEnergyLinks, createFlipParticles,
  updateParticles, STONE_SIZE_W, STONE_SIZE_H, GRID_GAP,
  GRID_COLS, GRID_ROWS, WIN_LINK_COUNT, createPortalAuraParticles,
  getStoneHitBox,
} from './entities'
import {
  RenderContext, clearBackground, drawSeabed, drawGrid, drawStones,
  drawTidalWater, drawEnergyLinks, drawParticles, drawPortal,
} from './renderer'

export interface GameStateSnapshot {
  tidalProgress: number
  tidalPhase: 'flood' | 'ebb'
  energyCount: number
  portalOpen: boolean
  winning: boolean
  resetFlash: number
  stones: GlyphStone[][]
}

export class Game {
  tidal: TidalLevel
  stones: GlyphStone[][]
  links: EnergyLink[]
  particles: Particle[]
  energyCount: number
  portalOpen: boolean
  portalAnimTime: number
  portalAura: PortalAura
  resetFlash: number
  audioCtx: AudioContext | null
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  lastTime: number
  running: boolean
  onStateChange?: (s: GameStateSnapshot) => void
  originX: number
  originY: number
  onWin?: () => void
  rafId: number
  portalCx: number
  portalCy: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
    this.width = 800
    this.height = 600
    this.tidal = createTidalLevel()
    this.stones = createStonesGrid()
    this.links = []
    this.particles = []
    this.energyCount = 0
    this.portalOpen = false
    this.portalAnimTime = 0
    this.portalAura = { active: false, startTime: 0, particles: [] }
    this.resetFlash = 0
    this.audioCtx = null
    this.lastTime = 0
    this.running = false
    this.rafId = 0
    const gridTotalW = GRID_COLS * STONE_SIZE_W + (GRID_COLS - 1) * GRID_GAP
    const gridTotalH = GRID_ROWS * STONE_SIZE_H + (GRID_ROWS - 1) * GRID_GAP
    this.originX = (this.width - gridTotalW) / 2
    this.originY = (this.height - gridTotalH) / 2 + 30
    this.portalCx = this.width / 2
    this.portalCy = this.height / 2
    this.recomputeLinks()
    this.bindEvents()
  }

  bindEvents(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this))
    window.addEventListener('keydown', this.handleKey.bind(this))
  }

  unbind(): void {
    this.canvas.removeEventListener('click', this.handleClick.bind(this))
    window.removeEventListener('keydown', this.handleKey.bind(this))
  }

  ensureAudio(): void {
    if (!this.audioCtx) {
      try {
        const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.audioCtx = new AC()
      } catch (e) { /* ignore */ }
    }
  }

  playFlipSound(): void {
    this.ensureAudio()
    const ctx = this.audioCtx
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch (e) { /* ignore */ }
  }

  handleKey(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') {
      this.reset()
    }
  }

  handleClick(e: MouseEvent): void {
    this.ensureAudio()
    const rect = this.canvas.getBoundingClientRect()
    const px = ((e.clientX - rect.left) * (this.canvas.width / rect.width)
    const py = ((e.clientY - rect.top) * (this.canvas.height / rect.height)
    const stone = pickStoneAt(px, py, this.stones, this.originX, this.originY)
    if (stone && isStoneOperable(stone, this.tidal.progress)) {
      if (this.countFlipping() < 3) {
        if (flipStone(stone)) {
          this.playFlipSound()
          const box = getStoneHitBox(stone, this.originX, this.originY)
          const cx = box.x + box.w / 2
          const cy = box.y + box.h / 2
          this.particles.push(...createFlipParticles(cx, cy))
        }
      }
    }
  }

  countFlipping(): number {
    let n = 0
    for (const row of this.stones) for (const s of row) if (s.isFlipping) n++
    return n
  }

  recomputeLinks(): void {
    this.links = recomputeEnergyLinks(this.stones)
    const prev = this.energyCount
    this.energyCount = this.links.length
    if (this.energyCount >= WIN_LINK_COUNT && !this.portalOpen) {
      this.triggerWin()
    }
    if (this.energyCount > prev && this.onStateChange) {
      this.emitState()
    }
  }

  triggerWin(): void {
    this.portalAura.active = true
    this.portalAura.startTime = 0
    this.portalAura.particles = []
    if (this.onWin) this.onWin()
  }

  reset(): void {
    this.stones = createStonesGrid()
    this.links = []
    this.particles = []
    this.energyCount = 0
    this.portalOpen = false
    this.portalAnimTime = 0
    this.portalAura = { active: false, startTime: 0, particles: [] }
    this.resetFlash = 300
    this.recomputeLinks()
    this.emitState()
  }

  emitState(): void {
    if (!this.onStateChange) return
    this.onStateChange({
      tidalProgress: this.tidal.progress,
      tidalPhase: this.tidal.phase,
      energyCount: this.energyCount,
      portalOpen: this.portalOpen,
      winning: this.portalAura.active,
      resetFlash: this.resetFlash,
      stones: this.stones,
    })
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (t: number) => {
      if (!this.running) return
      const delta = Math.min(50, t - this.lastTime)
      this.lastTime = t
      this.update(delta, t)
      this.render(t)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  update(deltaMs: number, nowMs: number): void {
    updateTidalLevel(this.tidal, deltaMs)
    updateStonesLock(this.stones, this.tidal.progress)
    let flipFinished = false
    for (const row of this.stones) for (const s of row) {
      if (updateStoneFlip(s, deltaMs)) flipFinished = true
    }
    if (flipFinished) this.recomputeLinks()
    updateParticles(this.particles, deltaMs)
    if (this.portalAura.active) {
      this.portalAura.startTime += deltaMs
      const newPs = createPortalAuraParticles(this.portalCx, this.portalCy, this.portalAura.startTime)
      this.portalAura.particles.push(...newPs)
      updateParticles(this.portalAura.particles, deltaMs, 60)
      if (this.portalAura.startTime >= 3000) {
        this.portalAura.active = false
        this.portalOpen = true
        this.portalAnimTime = 0
        this.emitState()
      }
    }
    if (this.portalOpen) {
      this.portalAnimTime += deltaMs
    }
    if (this.resetFlash > 0) {
      this.resetFlash = Math.max(0, this.resetFlash - deltaMs)
    }
    this.emitState()
  }

  render(timeMs: number): void {
    const rc: RenderContext = { ctx: this.ctx, width: this.width, height: this.height, timeMs }
    clearBackground(rc)
    drawSeabed(rc)
    drawGrid(rc, this.originX, this.originY)
    drawStones(rc, this.stones, this.originX, this.originY, this.tidal)
    drawEnergyLinks(rc, this.links, this.originX, this.originY, this.tidal)
    drawTidalWater(rc, this.tidal)
    const allParticles = [...this.particles, ...this.portalAura.particles]
    drawParticles(rc, allParticles)
    if (this.portalOpen) {
      drawPortal(rc, this.portalCx, this.portalCy, true, this.portalAnimTime)
    }
  }

  getResetFlashAlpha(): number {
    if (this.resetFlash <= 0) return 0
    return Math.min(1, this.resetFlash / 300)
  }

  getPortalBlur(): boolean {
    return this.portalOpen && this.portalAnimTime > 0 && this.portalAnimTime < 500
  }
}
