import type {
  GameState, Player, Crystal, Enemy, EnergyOrb, FloorData, Vec2, Buff, Particle
} from './types'
import { MapLoader } from './MapLoader'
import { PlayerController } from './PlayerController'
import { EnemyAI } from './EnemyAI'
import { HUD } from '../ui/HUD'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private running = false
  private lastTime = 0
  private accumulator = 0
  private readonly fixedDt = 1000 / 60
  private rafId: number | null = null

  private cellSize = 0
  private offsetX = 0
  private offsetY = 0

  private state: GameState
  private stateUpdate: (s: Partial<GameState>) => void
  private gameOverCallback: (victory: boolean) => void

  private player!: Player
  private crystals: Crystal[] = []
  private enemies: Enemy[] = []
  private energyOrbs: EnergyOrb[] = []
  private particles: Particle[] = []
  private floorData!: FloorData
  private crystalIdCounter = 0
  private enemyIdCounter = 0
  private orbIdCounter = 0
  private chestIdCounter = 0
  private buffIdCounter = 0

  private keys: Record<string, boolean> = {}
  private mousePos: Vec2 = { x: 0, y: 0 }

  private mapLoader: MapLoader
  private playerController: PlayerController
  private enemyAI: EnemyAI
  private hud: HUD

  private lastCrystalRegen = 0
  private readonly crystalRegenInterval = 2000
  private readonly config = {
    floors: 3,
    gridWidth: 10,
    gridHeight: 6,
    baseHp: 100,
    maxCrystals: 5,
    playerSpeed: 2.5,
    crystalSpeed: 6,
    crystalDamage: 15,
    explosionRadius: 1.5,
    slowPercentage: 0.4,
    slowDuration: 2000,
    snowMonsterCount: 3,
    snowMonsterSpeed: 1.2,
    snowMonsterDamage: 10,
    snowMonsterKnockback: 3,
    snowMonsterHp: 45,
    iceGolemCount: 2,
    iceGolemSpeed: 0.4,
    iceGolemDamage: 25,
    iceGolemFreezeDuration: 1500,
    iceGolemHp: 80,
    energyDropChance: 0.2,
    energyHealAmount: 5,
    icicleMinCount: 2,
    icicleMaxCount: 3,
    chainExplosionBonus: 0.3
  }

  constructor(
    canvas: HTMLCanvasElement,
    stateUpdate: (s: Partial<GameState>) => void,
    gameOverCallback: (victory: boolean) => void
  ) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx

    this.stateUpdate = stateUpdate
    this.gameOverCallback = gameOverCallback

    this.state = {
      currentHp: this.config.baseHp,
      maxHp: this.config.baseHp,
      currentCrystals: this.config.maxCrystals,
      maxCrystals: this.config.maxCrystals,
      killCount: 0,
      currentFloor: 1,
      totalDamage: 0,
      activeBuffs: []
    }

    this.mapLoader = new MapLoader(this.config)
    this.playerController = new PlayerController(this.config, this)
    this.enemyAI = new EnemyAI(this.config, this)
    this.hud = new HUD(ctx, this)

    this.initFloor(1)
    this.bindEvents()
  }

  get State() { return this.state }
  get Player() { return this.player }
  get Enemies() { return this.enemies }
  get Crystals() { return this.crystals }
  get FloorData() { return this.floorData }
  get Config() { return this.config }
  get Keys() { return this.keys }
  get MousePos() { return this.mousePos }
  get EnergyOrbs() { return this.energyOrbs }
  get Particles() { return this.particles }

  resize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
    this.computeLayout()
  }

  private computeLayout() {
    const w = this.canvas.width
    const h = this.canvas.height
    const csW = w / this.config.gridWidth
    const csH = h / this.config.gridHeight
    this.cellSize = Math.min(csW, csH)
    this.offsetX = (w - this.cellSize * this.config.gridWidth) / 2
    this.offsetY = (h - this.cellSize * this.config.gridHeight) / 2
  }

  get CellSize() { return this.cellSize }
  get OffsetX() { return this.offsetX }
  get OffsetY() { return this.offsetY }

  gridToWorld(gx: number, gy: number): Vec2 {
    return {
      x: this.offsetX + gx * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gy * this.cellSize + this.cellSize / 2
    }
  }

  worldToGrid(wx: number, wy: number): Vec2 {
    return {
      x: Math.floor((wx - this.offsetX) / this.cellSize),
      y: Math.floor((wy - this.offsetY) / this.cellSize)
    }
  }

  private initFloor(floorNum: number) {
    this.crystals = []
    this.enemies = []
    this.energyOrbs = []
    this.particles = []

    this.floorData = this.mapLoader.generateFloor(floorNum, {
      chestIdStart: this.chestIdCounter,
      enemyIdStart: this.enemyIdCounter
    })

    for (const c of this.floorData.chests) {
      this.chestIdCounter = Math.max(this.chestIdCounter, c.id + 1)
    }
    for (const e of this.floorData.enemies) {
      this.enemyIdCounter = Math.max(this.enemyIdCounter, e.id + 1)
    }
    this.enemies = [...this.floorData.enemies]

    const centerGx = Math.floor(this.config.gridWidth / 2)
    const centerGy = Math.floor(this.config.gridHeight / 2)
    const center = this.gridToWorld(centerGx, centerGy)

    if (!this.player) {
      this.player = {
        pos: { ...center },
        gridPos: { x: centerGx, y: centerGy },
        moveDir: { x: 0, y: 0 },
        baseSpeed: this.config.playerSpeed,
        trail: [],
        frozenUntil: 0,
        knockback: null
      }
    } else {
      this.player.pos = { ...center }
      this.player.gridPos = { x: centerGx, y: centerGy }
      this.player.trail = []
      this.player.frozenUntil = 0
      this.player.knockback = null
    }

    this.state.currentFloor = floorNum
    this.syncState()
  }

  syncState() {
    this.stateUpdate({ ...this.state })
  }

  addBuff(b: Omit<Buff, 'id' | 'remaining'>) {
    this.buffIdCounter++
    const buff: Buff = { ...b, id: `b${this.buffIdCounter}`, remaining: b.duration }
    this.state.activeBuffs = [...this.state.activeBuffs.filter(x => x.type !== b.type), buff]
    this.syncState()
  }

  getSpeedMultiplier(): number {
    const speedBuff = this.state.activeBuffs.find(b => b.type === 'speed')
    return speedBuff ? speedBuff.multiplier : 1
  }

  getDamageMultiplier(): number {
    const dmgBuff = this.state.activeBuffs.find(b => b.type === 'damage')
    return dmgBuff ? dmgBuff.multiplier : 1
  }

  spawnCrystal(from: Vec2, direction: Vec2) {
    if (this.state.currentCrystals <= 0) return
    const len = Math.hypot(direction.x, direction.y) || 1
    const norm = { x: direction.x / len, y: direction.y / len }
    this.crystalIdCounter++
    this.crystals.push({
      id: this.crystalIdCounter,
      pos: { ...from },
      vel: {
        x: norm.x * this.config.crystalSpeed * this.cellSize,
        y: norm.y * this.config.crystalSpeed * this.cellSize
      },
      alive: true,
      exploded: false,
      explosionTimer: 0,
      explosionRadius: this.config.explosionRadius * this.cellSize,
      baseDamage: this.config.crystalDamage
    })
    this.state.currentCrystals--
    this.syncState()
  }

  detonateAllCrystals() {
    for (const c of this.crystals) {
      if (c.alive && !c.exploded) {
        this.explodeCrystal(c, 1 + this.config.chainExplosionBonus)
      }
    }
  }

  explodeCrystal(c: Crystal, dmgMult = 1) {
    if (!c.alive) return
    c.exploded = true
    c.alive = false
    c.explosionTimer = 350

    this.spawnExplosionParticles(c.pos, c.explosionRadius)

    const effectiveDmg = c.baseDamage * dmgMult * this.getDamageMultiplier()
    for (const e of this.enemies) {
      if (e.hp <= 0) continue
      const dx = e.pos.x - c.pos.x
      const dy = e.pos.y - c.pos.y
      const dist = Math.hypot(dx, dy)
      if (dist <= c.explosionRadius + this.cellSize * 0.3) {
        this.damageEnemy(e, effectiveDmg, c.pos)
        e.slowedUntil = performance.now() + this.config.slowDuration
      }
    }
  }

  private spawnExplosionParticles(center: Vec2, radius: number) {
    const count = 20
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const speed = 40 + Math.random() * 120
      this.particles.push({
        pos: { ...center },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 500 + Math.random() * 300,
        maxLife: 800,
        color: Math.random() > 0.5 ? '#88d8ff' : '#c0ecff',
        size: 3 + Math.random() * 5
      })
    }
  }

  spawnHitParticles(pos: Vec2, color = '#ffffff') {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 30 + Math.random() * 80
      this.particles.push({
        pos: { ...pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 300 + Math.random() * 200,
        maxLife: 500,
        color,
        size: 2 + Math.random() * 3
      })
    }
  }

  damageEnemy(e: Enemy, dmg: number, _from?: Vec2) {
    e.hp -= dmg
    this.state.totalDamage += dmg
    this.spawnHitParticles(e.pos, '#88d8ff')
    if (e.hp <= 0) {
      this.killEnemy(e)
    }
    this.syncState()
  }

  private killEnemy(e: Enemy) {
    this.state.killCount++
    this.spawnHitParticles(e.pos, '#ffffff')
    if (Math.random() < this.config.energyDropChance) {
      this.orbIdCounter++
      this.energyOrbs.push({
        id: this.orbIdCounter,
        pos: { ...e.pos },
        collected: false,
        healAmount: this.config.energyHealAmount
      })
    }
    const idx = this.enemies.indexOf(e)
    if (idx >= 0) this.enemies.splice(idx, 1)
  }

  damagePlayer(dmg: number) {
    this.state.currentHp = Math.max(0, this.state.currentHp - dmg)
    this.spawnHitParticles(this.player.pos, '#ff4444')
    this.syncState()
    if (this.state.currentHp <= 0) {
      this.triggerGameOver(false)
    }
  }

  healPlayer(amount: number) {
    this.state.currentHp = Math.min(this.state.maxHp, this.state.currentHp + amount)
    this.syncState()
  }

  freezePlayer(ms: number) {
    this.player.frozenUntil = Math.max(this.player.frozenUntil, performance.now() + ms)
  }

  applyKnockback(direction: Vec2, distance: number) {
    const len = Math.hypot(direction.x, direction.y) || 1
    this.player.knockback = {
      x: (direction.x / len) * distance * this.cellSize,
      y: (direction.y / len) * distance * this.cellSize
    }
  }

  goToNextFloor() {
    if (this.state.currentFloor >= this.config.floors) {
      this.triggerGameOver(true)
    } else {
      this.initFloor(this.state.currentFloor + 1)
    }
  }

  private triggerGameOver(victory: boolean) {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.gameOverCallback(victory)
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('click', this.onClick)
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('click', this.onClick)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    this.keys[k] = true
    if (k === ' ') {
      e.preventDefault()
      this.tryFireCrystal()
    }
    if (k === 'e') {
      this.detonateAllCrystals()
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false
  }

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.mousePos = {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    }
  }

  private onClick = () => {
    this.tryFireCrystal()
  }

  private tryFireCrystal() {
    const dir = {
      x: this.mousePos.x - this.player.pos.x,
      y: this.mousePos.y - this.player.pos.y
    }
    this.playerController.tryFire(dir)
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this.lastCrystalRegen = this.lastTime
    this.loop(this.lastTime)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.unbindEvents()
  }

  private loop = (time: number) => {
    if (!this.running) return
    let frameTime = time - this.lastTime
    this.lastTime = time
    if (frameTime > 100) frameTime = 100

    this.accumulator += frameTime
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt / 1000)
      this.accumulator -= this.fixedDt
    }

    this.render()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    const now = performance.now()

    if (now - this.lastCrystalRegen >= this.crystalRegenInterval) {
      if (this.state.currentCrystals < this.state.maxCrystals) {
        this.state.currentCrystals++
        this.syncState()
      }
      this.lastCrystalRegen = now
    }

    if (this.state.activeBuffs.length > 0) {
      let changed = false
      const remaining: Buff[] = []
      for (const b of this.state.activeBuffs) {
        b.remaining -= dt * 1000
        if (b.remaining > 0) remaining.push(b)
        else changed = true
      }
      if (remaining.length !== this.state.activeBuffs.length || changed) {
        this.state.activeBuffs = remaining
        this.syncState()
      }
    }

    this.playerController.update(dt)
    this.enemyAI.update(dt)
    this.updateCrystals(dt)
    this.updateOrbs()
    this.updateParticles(dt)
    this.checkChests()
    this.checkStairs()
  }

  private updateCrystals(dt: number) {
    const alive: Crystal[] = []
    for (const c of this.crystals) {
      if (c.exploded) {
        c.explosionTimer -= dt * 1000
        if (c.explosionTimer > 0) alive.push(c)
        continue
      }
      if (!c.alive) continue

      c.pos.x += c.vel.x * dt
      c.pos.y += c.vel.y * dt

      if (this.hitWall(c.pos)) {
        this.explodeCrystal(c)
        alive.push(c)
        continue
      }

      let hitEnemy = false
      for (const e of this.enemies) {
        if (e.hp <= 0) continue
        const dx = e.pos.x - c.pos.x
        const dy = e.pos.y - c.pos.y
        const r = this.cellSize * 0.45
        if (dx * dx + dy * dy < r * r) {
          this.explodeCrystal(c)
          hitEnemy = true
          break
        }
      }
      if (!hitEnemy) {
        if (c.pos.x < 0 || c.pos.x > this.canvas.width ||
            c.pos.y < 0 || c.pos.y > this.canvas.height) {
          continue
        }
        alive.push(c)
      } else {
        alive.push(c)
      }
    }
    this.crystals = alive
  }

  private updateOrbs() {
    const pr = this.cellSize * 0.4
    for (const orb of this.energyOrbs) {
      if (orb.collected) continue
      const dx = this.player.pos.x - orb.pos.x
      const dy = this.player.pos.y - orb.pos.y
      if (dx * dx + dy * dy < pr * pr) {
        orb.collected = true
        this.healPlayer(orb.healAmount)
      }
    }
    this.energyOrbs = this.energyOrbs.filter(o => !o.collected)
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.pos.x += p.vel.x * dt
      p.pos.y += p.vel.y * dt
      p.vel.x *= 0.95
      p.vel.y *= 0.95
      p.life -= dt * 1000
    }
    this.particles = this.particles.filter(p => p.life > 0)
  }

  private checkChests() {
    const pr = this.cellSize * 0.5
    for (const chest of this.floorData.chests) {
      if (chest.opened) continue
      const wp = this.gridToWorld(chest.pos.x, chest.pos.y)
      const dx = this.player.pos.x - wp.x
      const dy = this.player.pos.y - wp.y
      if (dx * dx + dy * dy < pr * pr) {
        chest.opened = true
        this.applyRandomBuff()
        this.spawnHitParticles(wp, '#ffdd88')
      }
    }
  }

  private applyRandomBuff() {
    const r = Math.random()
    if (r < 0.5) {
      this.addBuff({
        type: 'speed',
        name: '疾风之靴',
        multiplier: 1.2,
        duration: 5000
      })
    } else {
      this.addBuff({
        type: 'damage',
        name: '寒冰之怒',
        multiplier: 1.5,
        duration: 8000
      })
    }
  }

  private checkStairs() {
    if (this.enemies.length > 0) return
    const pr = this.cellSize * 0.5
    for (const stair of this.floorData.stairs) {
      const wp = this.gridToWorld(stair.pos.x, stair.pos.y)
      const dx = this.player.pos.x - wp.x
      const dy = this.player.pos.y - wp.y
      if (dx * dx + dy * dy < pr * pr) {
        this.goToNextFloor()
        return
      }
    }
  }

  hitWall(pos: Vec2): boolean {
    const g = this.worldToGrid(pos.x, pos.y)
    if (g.x < 0 || g.x >= this.config.gridWidth || g.y < 0 || g.y >= this.config.gridHeight) return true
    return this.floorData.icicles.some(i => i.gridPos.x === g.x && i.gridPos.y === g.y)
  }

  isWalkableGrid(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.config.gridWidth || gy < 0 || gy >= this.config.gridHeight) return false
    if (this.floorData.icicles.some(i => i.gridPos.x === gx && i.gridPos.y === gy)) return false
    return true
  }

  private render() {
    const ctx = this.ctx
    this.computeLayout()

    this.drawBackground(ctx)
    this.drawGridAndEntities(ctx)
    this.drawCrystals(ctx)
    this.drawOrbs(ctx)
    this.drawParticles(ctx)
    this.drawPlayer(ctx)
    this.drawAimLine(ctx)
    this.hud.render()
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const w = this.canvas.width
    const h = this.canvas.height
    ctx.clearRect(0, 0, w, h)

    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(1, '#b0e0e6')
    ctx.fillStyle = gradient
    ctx.fillRect(this.offsetX, this.offsetY, this.cellSize * this.config.gridWidth, this.cellSize * this.config.gridHeight)
  }

  private drawGridAndEntities(ctx: CanvasRenderingContext2D) {
    const cs = this.cellSize

    ctx.strokeStyle = 'rgba(136, 216, 255, 0.2)'
    ctx.lineWidth = 1
    for (let x = 0; x <= this.config.gridWidth; x++) {
      const px = this.offsetX + x * cs
      ctx.beginPath()
      ctx.moveTo(px, this.offsetY)
      ctx.lineTo(px, this.offsetY + this.config.gridHeight * cs)
      ctx.stroke()
    }
    for (let y = 0; y <= this.config.gridHeight; y++) {
      const py = this.offsetY + y * cs
      ctx.beginPath()
      ctx.moveTo(this.offsetX, py)
      ctx.lineTo(this.offsetX + this.config.gridWidth * cs, py)
      ctx.stroke()
    }

    for (const ic of this.floorData.icicles) {
      const px = this.offsetX + ic.gridPos.x * cs
      const py = this.offsetY + ic.gridPos.y * cs
      ctx.fillStyle = 'rgba(100, 180, 220, 0.65)'
      ctx.strokeStyle = 'rgba(136, 216, 255, 0.9)'
      ctx.lineWidth = 2
      ctx.fillRect(px + 3, py + 3, cs - 6, cs - 6)
      ctx.strokeRect(px + 3, py + 3, cs - 6, cs - 6)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.beginPath()
      ctx.moveTo(px + 6, py + 6)
      ctx.lineTo(px + cs * 0.35, py + 6)
      ctx.lineTo(px + 6, py + cs * 0.35)
      ctx.closePath()
      ctx.fill()
    }

    for (const stair of this.floorData.stairs) {
      const p = this.gridToWorld(stair.pos.x, stair.pos.y)
      ctx.save()
      ctx.translate(p.x, p.y)
      const r = cs * 0.4
      const alpha = this.enemies.length === 0 ? 1 : 0.45
      ctx.fillStyle = `rgba(0, 150, 199, ${0.5 * alpha})`
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(136, 216, 255, ${alpha})`
      ctx.lineWidth = 3
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.font = `${cs * 0.35}px 'Iceberg', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('↑', 0, 2)
      ctx.restore()
    }

    for (const chest of this.floorData.chests) {
      const p = this.gridToWorld(chest.pos.x, chest.pos.y)
      const s = cs * 0.55
      ctx.save()
      ctx.translate(p.x, p.y)
      if (chest.opened) {
        ctx.globalAlpha = 0.4
      }
      ctx.fillStyle = chest.opened ? '#8b6914' : '#d4a017'
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.7)
      ctx.strokeStyle = '#6b4e0a'
      ctx.lineWidth = 2
      ctx.strokeRect(-s / 2, -s / 3, s, s * 0.7)
      ctx.fillStyle = chest.opened ? '#a07810' : '#f0c040'
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.2)
      ctx.fillStyle = '#3a2808'
      ctx.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.16)
      if (!chest.opened) {
        ctx.fillStyle = 'rgba(255, 230, 120, 0.4)'
        ctx.beginPath()
        ctx.arc(0, 0, s * 0.75 + Math.sin(performance.now() / 300) * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    for (const e of this.enemies) {
      this.drawEnemy(ctx, e)
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const cs = this.cellSize
    ctx.save()
    ctx.translate(e.pos.x, e.pos.y)
    const s = cs * 0.8
    const isSlowed = performance.now() < e.slowedUntil

    if (e.type === 'snow_monster') {
      ctx.fillStyle = isSlowed ? '#8ec8e8' : '#e8f0f8'
      ctx.beginPath()
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#5a8aac'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#1a1a2e'
      ctx.beginPath()
      ctx.arc(-s * 0.15, -s * 0.08, s * 0.07, 0, Math.PI * 2)
      ctx.arc(s * 0.15, -s * 0.08, s * 0.07, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#3a5a7a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-s * 0.1, s * 0.15)
      ctx.lineTo(s * 0.1, s * 0.15)
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(-s * 0.1, -s * 0.3)
      ctx.lineTo(0, -s * 0.55)
      ctx.lineTo(s * 0.1, -s * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#5a8aac'
      ctx.stroke()
    } else {
      ctx.fillStyle = isSlowed ? '#5a90b8' : '#8ab8d8'
      ctx.strokeStyle = '#3a6a8a'
      ctx.lineWidth = 3
      const hw = s / 2
      const hh = s * 0.45
      ctx.beginPath()
      ctx.moveTo(-hw, -hh)
      ctx.lineTo(hw, -hh)
      ctx.lineTo(hw * 0.9, hh)
      ctx.lineTo(-hw * 0.9, hh)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 120, 120, 0.85)'
      ctx.shadowColor = '#ff4444'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(-s * 0.2, -s * 0.1, s * 0.07, 0, Math.PI * 2)
      ctx.arc(s * 0.2, -s * 0.1, s * 0.07, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(-hw + 4, -hh + 4, hw * 0.4, hh * 0.5)
    }

    const hpRatio = Math.max(0, e.hp / e.maxHp)
    const barW = s * 0.9
    ctx.fillStyle = '#5a1010'
    ctx.fillRect(-barW / 2, -s * 0.7, barW, 5)
    ctx.fillStyle = hpRatio > 0.5 ? '#66ff66' : hpRatio > 0.25 ? '#ffcc33' : '#ff4444'
    ctx.fillRect(-barW / 2, -s * 0.7, barW * hpRatio, 5)

    if (isSlowed) {
      ctx.strokeStyle = 'rgba(136, 216, 255, 0.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()
  }

  private drawCrystals(ctx: CanvasRenderingContext2D) {
    for (const c of this.crystals) {
      ctx.save()
      ctx.translate(c.pos.x, c.pos.y)

      if (c.exploded) {
        const alpha = c.explosionTimer / 350
        const r = c.explosionRadius * (1 + (1 - alpha) * 0.4)
        ctx.fillStyle = `rgba(136, 216, 255, ${0.35 * alpha})`
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * alpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        const angle = Math.atan2(c.vel.y, c.vel.x)
        ctx.rotate(angle)
        const s = this.cellSize * 0.45
        ctx.fillStyle = '#88d8ff'
        ctx.strokeStyle = '#00b4d8'
        ctx.lineWidth = 2
        ctx.shadowColor = '#88d8ff'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.moveTo(s, 0)
        ctx.lineTo(0, s * 0.6)
        ctx.lineTo(-s * 0.7, 0)
        ctx.lineTo(0, -s * 0.6)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.beginPath()
        ctx.moveTo(s * 0.3, 0)
        ctx.lineTo(0, s * 0.2)
        ctx.lineTo(-s * 0.15, 0)
        ctx.lineTo(0, -s * 0.2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }
  }

  private drawOrbs(ctx: CanvasRenderingContext2D) {
    for (const orb of this.energyOrbs) {
      ctx.save()
      ctx.translate(orb.pos.x, orb.pos.y)
      const t = performance.now() / 200
      const pulse = 1 + Math.sin(t) * 0.15
      const r = this.cellSize * 0.2 * pulse
      ctx.fillStyle = 'rgba(100, 200, 255, 0.3)'
      ctx.beginPath()
      ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2)
      ctx.fill()
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      grd.addColorStop(0, '#e0f7ff')
      grd.addColorStop(1, '#4db8ff')
      ctx.fillStyle = grd
      ctx.shadowColor = '#4db8ff'
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const trail = this.player.trail
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(136, 216, 255, 0.35)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(trail[0].x, trail[0].y)
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.save()
    ctx.translate(this.player.pos.x, this.player.pos.y)
    const cs = this.cellSize
    const s = cs * 0.75
    const frozen = performance.now() < this.player.frozenUntil

    ctx.fillStyle = frozen ? '#a8d8ff' : '#3a5a8a'
    ctx.strokeStyle = '#1a2a4a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, s * 0.15, s * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = frozen ? '#c0e8ff' : '#f0d0b0'
    ctx.beginPath()
    ctx.arc(0, -s * 0.18, s * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = frozen ? '#70a8d8' : '#2a4a7a'
    ctx.beginPath()
    ctx.moveTo(-s * 0.28, -s * 0.25)
    ctx.quadraticCurveTo(0, -s * 0.58, s * 0.28, -s * 0.25)
    ctx.lineTo(s * 0.2, -s * 0.18)
    ctx.lineTo(-s * 0.2, -s * 0.18)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#1a1a2e'
    ctx.beginPath()
    ctx.arc(-s * 0.08, -s * 0.18, s * 0.03, 0, Math.PI * 2)
    ctx.arc(s * 0.08, -s * 0.18, s * 0.03, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = '#88d8ff'
    ctx.shadowBlur = 12
    ctx.strokeStyle = '#88d8ff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(s * 0.3, -s * 0.25)
    ctx.lineTo(s * 0.5, s * 0.35)
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#00b4d8'
    ctx.beginPath()
    const cx = s * 0.3
    const cy = -s * 0.28
    ctx.moveTo(cx, cy - s * 0.12)
    ctx.lineTo(cx + s * 0.08, cy)
    ctx.lineTo(cx, cy + s * 0.12)
    ctx.lineTo(cx - s * 0.08, cy)
    ctx.closePath()
    ctx.fill()

    if (frozen) {
      ctx.strokeStyle = 'rgba(136, 216, 255, 0.85)'
      ctx.lineWidth = 3
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const r1 = s * 0.45
        const r2 = s * 0.62
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1)
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  private drawAimLine(ctx: CanvasRenderingContext2D) {
    const p = this.player.pos
    const m = this.mousePos
    const dx = m.x - p.x
    const dy = m.y - p.y
    const len = Math.hypot(dx, dy) || 1
    const nx = dx / len
    const ny = dy / len
    const end = {
      x: p.x + nx * this.cellSize * 1.5,
      y: p.y + ny * this.cellSize * 1.5
    }
    ctx.strokeStyle = 'rgba(136, 216, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.setLineDash([])
  }
}
