import * as THREE from 'three'
import type {
  Ship,
  Projectile,
  BattleLog,
  GamePhase,
  FrameData,
  GameResult,
  Faction,
  ShipType
} from '../types'
import type { SceneContext } from '../renderer/sceneSetup'
import { GRID_SIZE, CELL_SIZE, gridToWorld } from '../renderer/sceneSetup'
import {
  createShipMesh,
  updateHealthBar,
  flashDamage,
  checkAndUpdateLOD,
  createProjectileMesh,
  updateProjectileTrail,
  createSkillFlash,
  setShipSelection
} from '../renderer/shipRenderer'
import { createShip, updateShipTimers, getTotalDeploySlots } from './shipFactory'
import {
  AIState,
  AISkillEvent,
  createAIState,
  updateAllShipsAI,
  processProjectileHits,
  manualUseSkill,
  recallShip
} from '../ai/battleAI'
import { pickRandomFormation, generateEnemyFormation } from '../ai/tactics'

export interface EngineStats {
  totalDamageDealt: number
  skillUsageCount: number
  battleDuration: number
}

export class GameEngine {
  private ctx: SceneContext
  private ships: Ship[] = []
  private projectiles: Projectile[] = []
  private logs: BattleLog[] = []
  private phase: GamePhase = 'deploy'
  private aiState: AIState = createAIState()
  private stats: EngineStats = { totalDamageDealt: 0, skillUsageCount: 0, battleDuration: 0 }
  private frameData: FrameData[] = []
  private currentFrame = 0
  private clock: THREE.Clock
  private animationId: number | null = null
  private isPaused = false
  private replaySpeed = 1
  private selectedShipId: string | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private skillEffects: { mesh: THREE.Object3D; timer: number; color: string }[] = []
  private readonly MAX_PROJECTILES_PER_FRAME = 5

  constructor(ctx: SceneContext) {
    this.ctx = ctx
    this.clock = new THREE.Clock()
  }

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }

  getPhase(): GamePhase { return this.phase }
  getShips(): Ship[] { return this.ships }
  getLogs(): BattleLog[] { return this.logs }
  getSelectedShip(): Ship | undefined { return this.ships.find(s => s.id === this.selectedShipId) }
  getStats(): EngineStats { return { ...this.stats } }
  getFrameData(): FrameData[] { return this.frameData }
  getAIState(): AIState { return this.aiState }
  getTotalFrames(): number { return this.currentFrame }

  setPhase(phase: GamePhase): void {
    this.phase = phase
    this.emit('phaseChange', phase)
  }

  addLog(log: BattleLog): void {
    this.logs.push(log)
    if (this.logs.length > 200) this.logs.shift()
    this.emit('newLog', log)
  }

  deployPlayerShip(type: ShipType, gridX: number, gridZ: number): Ship | null {
    if (this.phase !== 'deploy') return null
    if (gridZ < GRID_SIZE / 2) return null

    const playerShips = this.ships.filter(s => s.faction === 'player')
    if (playerShips.length >= getTotalDeploySlots()) return null

    const worldPos = gridToWorld(gridX, gridZ)
    const isFlagship = type === 'battleship' && !this.ships.some(s => s.faction === 'player' && s.isFlagship)
    const ship = createShip(type, 'player', worldPos, isFlagship)

    this.addShipToScene(ship)
    this.ships.push(ship)
    this.emit('shipsChanged', this.ships)

    return ship
  }

  removeDeployedShip(shipId: string): boolean {
    if (this.phase !== 'deploy') return false
    const idx = this.ships.findIndex(s => s.id === shipId)
    if (idx === -1) return false
    const ship = this.ships[idx]
    if (ship.faction !== 'player') return false

    if (ship.mesh) {
      this.ctx.shipGroup.remove(ship.mesh)
    }
    this.ships.splice(idx, 1)
    this.emit('shipsChanged', this.ships)
    return true
  }

  private addShipToScene(ship: Ship): void {
    const mesh = createShipMesh(ship)
    ship.mesh = mesh
    this.ctx.shipGroup.add(mesh)
    updateHealthBar(ship)
  }

  startBattle(): void {
    if (this.phase !== 'deploy') return

    const playerShips = this.ships.filter(s => s.faction === 'player')
    if (playerShips.length === 0) return
    if (!playerShips.some(s => s.isFlagship)) {
      const bs = playerShips.find(s => s.type === 'battleship')
      if (bs) bs.isFlagship = true
      else playerShips[playerShips.length - 1].isFlagship = true
    }

    const enemyCount = Math.min(playerShips.length + Math.floor(Math.random() * 2), 8)
    const enemyTypes: ShipType[] = ['frigate', 'destroyer', 'battleship', 'carrier']
    const formation = pickRandomFormation()
    const positions = generateEnemyFormation(formation, enemyCount)

    for (let i = 0; i < enemyCount; i++) {
      let type: ShipType
      if (i === 0) type = 'battleship'
      else if (i < 3) type = enemyTypes[Math.floor(Math.random() * 3)]
      else type = enemyTypes[Math.floor(Math.random() * 4)]

      const pos = positions[i] || { gridX: 5 + i, gridZ: 3 }
      const actualGridZ = Math.max(0, Math.min(Math.floor(GRID_SIZE / 2) - 2, pos.gridZ))
      const worldPos = gridToWorld(pos.gridX, actualGridZ)
      const isFlagship = i === 0
      const ship = createShip(type, 'enemy', worldPos, isFlagship)
      this.addShipToScene(ship)
      this.ships.push(ship)
    }

    this.addLog({
      id: `start_${Date.now()}`,
      timestamp: Date.now(),
      message: `⚔️ 战斗开始！敌方阵型: ${this.getFormationName(formation)}`,
      type: 'info'
    })

    this.frameData = []
    this.currentFrame = 0
    this.stats = { totalDamageDealt: 0, skillUsageCount: 0, battleDuration: 0 }
    this.phase = 'battle'
    this.clock.start()
    this.emit('phaseChange', 'battle')
    this.emit('shipsChanged', this.ships)
    this.startLoop()
  }

  private getFormationName(f: string): string {
    return { dense: '密集阵', spread: '散开阵', flank: '侧翼包抄' }[f] || f
  }

  private startLoop(): void {
    const loop = () => {
      if (this.phase !== 'battle' || this.isPaused) {
        this.animationId = requestAnimationFrame(loop)
        this.renderFrame()
        return
      }

      const delta = Math.min(this.clock.getDelta(), 0.1) * this.replaySpeed
      this.stats.battleDuration += delta
      this.update(delta)
      this.renderFrame()
      this.recordFrame()

      if (this.checkBattleEnd()) {
        this.endBattle()
        return
      }

      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  private update(deltaTime: number): void {
    const totalEntities = this.ships.filter(s => s.status.alive).length
    const projLimit = totalEntities > 20 ? this.MAX_PROJECTILES_PER_FRAME : 10

    const collisionInfo = this.preCollisionDetection()
    this.emit('collisionDetected', collisionInfo)

    const hitResult = processProjectileHits(this.projectiles, this.ships, this.aiState, deltaTime)
    for (const log of hitResult.logs) this.addLog(log)

    for (const pid of hitResult.hitProjectileIds) {
      const idx = this.projectiles.findIndex(p => p.id === pid)
      if (idx !== -1) {
        const proj = this.projectiles[idx]
        if (proj.mesh) this.ctx.projectileGroup.remove(proj.mesh)
        if (proj.trail) this.ctx.projectileGroup.remove(proj.trail)
        this.projectiles.splice(idx, 1)

        const target = this.ships.find(s => s.id === proj.targetId)
        if (target && target.status.alive) {
          flashDamage(target)
          this.stats.totalDamageDealt += proj.damage
        }
      }
    }

    for (const did of hitResult.destroyedIds) {
      const ship = this.ships.find(s => s.id === did)
      if (ship && ship.mesh) {
        this.createExplosion(ship.position)
        this.addLog({
          id: `destroy_${Date.now()}_${did}`,
          timestamp: Date.now(),
          message: `💥 ${ship.name} (${ship.faction === 'player' ? '我方' : '敌方'}) 被摧毁！`,
          type: 'death'
        })
      }
    }

    this.updateShipTimersAndState(deltaTime)

    const aiResult = updateAllShipsAI(
      this.ships,
      this.aiState,
      deltaTime,
      this.currentFrame,
      projLimit,
      this.projectiles.length
    )

    for (const p of aiResult.newProjectiles) {
      const { mesh, trail } = createProjectileMesh(p.from, p.to, p.faction)
      p.mesh = mesh
      p.trail = trail
      this.ctx.projectileGroup.add(mesh)
      this.ctx.projectileGroup.add(trail)
      this.projectiles.push(p)
    }

    for (const log of aiResult.logs) {
      this.addLog(log)
    }

    for (const evt of aiResult.events) {
      this.handleSkillEvent(evt)
      this.stats.skillUsageCount++
    }

    for (const proj of this.projectiles) {
      if (proj.mesh) {
        const pos = proj.from.clone().lerp(proj.to, Math.min(proj.progress, 1))
        proj.mesh.position.copy(pos)
        if (proj.trail) updateProjectileTrail(proj.trail, pos)
      }
    }

    for (const ship of this.ships) {
      updateHealthBar(ship)
      checkAndUpdateLOD(ship, this.ctx.camera.position)

      if (ship.mesh && ship.status.stunned > 0) {
        ship.mesh.visible = Math.floor(this.stats.battleDuration * 10) % 2 === 0
      } else if (ship.mesh) {
        ship.mesh.visible = ship.status.alive
      }
    }

    this.updateSkillEffects(deltaTime)

    this.emitMovementLogs()

    this.currentFrame++
    this.emit('frameUpdate', { frame: this.currentFrame, deltaTime })
  }

  private preCollisionDetection(): Map<string, { inRange: string[]; distances: Map<string, number> }> {
    const collisionInfo = new Map<string, { inRange: string[]; distances: Map<string, number> }>()

    for (const ship of this.ships) {
      if (!ship.status.alive) continue
      const inRange: string[] = []
      const distances = new Map<string, number>()

      for (const other of this.ships) {
        if (other.id === ship.id || !other.status.alive) continue
        if (other.faction === ship.faction) continue
        const dist = ship.position.distanceTo(other.position)
        distances.set(other.id, dist)
        if (dist <= ship.stats.range) {
          inRange.push(other.id)
        }
      }

      collisionInfo.set(ship.id, { inRange, distances })
      ;(ship as any)._collisionInfo = { inRange, distances }
    }

    return collisionInfo
  }

  private updateShipTimersAndState(deltaTime: number): void {
    for (const ship of this.ships) {
      updateShipTimers(ship, deltaTime)
    }
  }

  private lastMovementEmit: number = 0
  private emitMovementLogs(): void {
    if (this.currentFrame - this.lastMovementEmit < 60) return
    this.lastMovementEmit = this.currentFrame

    const movingShips = this.ships.filter(
      s => s.status.alive && s.targetPosition && s.position.distanceTo(s.targetPosition) > 0.5
    )
    if (movingShips.length > 0) {
      const sample = movingShips.slice(0, 2)
      for (const ship of sample) {
        this.addLog({
          id: `move_${Date.now()}_${ship.id}`,
          timestamp: Date.now(),
          message: `🚀 ${ship.name} 正在机动中...`,
          type: 'info'
        })
      }
    }
  }

  private handleSkillEvent(evt: AISkillEvent): void {
    const colorHex = parseInt(evt.color.replace('#', ''), 16)
    const duration = evt.type === 'repair' ? 150 : 100
    createSkillFlash(colorHex, duration)

    const radiusMap = { emp: 3, repair: 4, airstrike: 2.5, shield: 5 }
    const radius = radiusMap[evt.type] || 3

    const ringGeometry = new THREE.RingGeometry(radius * 0.3, radius, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(evt.position)
    ring.position.y = 0.1
    this.ctx.scene.add(ring)

    this.skillEffects.push({ mesh: ring, timer: 0.5, color: evt.color })

    for (const sid of evt.affectedIds) {
      const ship = this.ships.find(s => s.id === sid)
      if (ship && evt.type === 'repair') {
        updateHealthBar(ship)
      }
    }
  }

  private updateSkillEffects(deltaTime: number): void {
    for (let i = this.skillEffects.length - 1; i >= 0; i--) {
      const effect = this.skillEffects[i]
      effect.timer -= deltaTime
      const scale = 1 + (0.5 - effect.timer) * 2
      effect.mesh.scale.set(scale, scale, 1)
      if (effect.mesh instanceof THREE.Mesh) {
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = effect.timer * 1.0
      }
      if (effect.timer <= 0) {
        this.ctx.scene.remove(effect.mesh)
        this.skillEffects.splice(i, 1)
      }
    }
  }

  private createExplosion(position: THREE.Vector3): void {
    const particleCount = 30
    const positions = new Float32Array(particleCount * 3)
    const velocities: THREE.Vector3[] = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y + 0.5
      positions[i * 3 + 2] = position.z
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 3,
        Math.sin(angle) * speed
      ))
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0xFF8A65,
      size: 0.2,
      transparent: true,
      opacity: 1
    })
    const particles = new THREE.Points(geometry, material)
    this.ctx.scene.add(particles)

    let life = 0
    const animateExplosion = () => {
      life += 0.016
      if (life >= 1.0) {
        this.ctx.scene.remove(particles)
        return
      }
      const pos = geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < particleCount; i++) {
        pos.array[i * 3] += velocities[i].x * 0.02
        pos.array[i * 3 + 1] += velocities[i].y * 0.02
        pos.array[i * 3 + 2] += velocities[i].z * 0.02
        velocities[i].y -= 0.05
      }
      pos.needsUpdate = true
      material.opacity = 1 - life
      requestAnimationFrame(animateExplosion)
    }
    animateExplosion()
  }

  private recordFrame(): void {
    if (this.currentFrame % 2 !== 0) return

    const shipsData = this.ships.map(s => ({
      id: s.id,
      position: [s.position.x, s.position.y, s.position.z] as [number, number, number],
      hp: s.hp
    }))

    const projData = this.projectiles.slice(0, 5).map(p => ({
      from: [p.from.x, p.from.y, p.from.z] as [number, number, number],
      to: [p.to.x, p.to.y, p.to.z] as [number, number, number]
    }))

    const recentLogs = this.logs.slice(-3).filter(l => Date.now() - l.timestamp < 500)

    this.frameData.push({
      frame: this.currentFrame,
      ships: shipsData,
      projectiles: projData,
      events: recentLogs
    })
  }

  private renderFrame(): void {
    this.ctx.renderer.render(this.ctx.scene, this.ctx.camera)
  }

  private checkBattleEnd(): boolean {
    const playerAlive = this.ships.filter(s => s.faction === 'player' && s.status.alive)
    const enemyAlive = this.ships.filter(s => s.faction === 'enemy' && s.status.alive)
    const playerFlagship = this.ships.find(s => s.faction === 'player' && s.isFlagship)
    const enemyFlagship = this.ships.find(s => s.faction === 'enemy' && s.isFlagship)

    if (playerAlive.length === 0) return true
    if (enemyAlive.length === 0) return true
    if (playerFlagship && !playerFlagship.status.alive) return true
    if (enemyFlagship && !enemyFlagship.status.alive) return true
    if (this.stats.battleDuration > 300) return true

    return false
  }

  private endBattle(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.animationId = null

    const result = this.calculateResult()
    this.phase = 'result'
    this.emit('phaseChange', 'result')
    this.emit('battleResult', result)
  }

  private calculateResult(): GameResult {
    const playerShips = this.ships.filter(s => s.faction === 'player')
    const enemyShips = this.ships.filter(s => s.faction === 'enemy')
    const playerAlive = playerShips.filter(s => s.status.alive)
    const enemyAlive = enemyShips.filter(s => s.status.alive)
    const playerFlagship = playerShips.find(s => s.isFlagship)
    const enemyFlagship = enemyShips.find(s => s.isFlagship)

    let winner: Faction | 'draw' = 'draw'
    if (playerAlive.length > 0 && enemyAlive.length === 0) winner = 'player'
    else if (enemyAlive.length > 0 && playerAlive.length === 0) winner = 'enemy'
    else if (playerFlagship && !playerFlagship.status.alive) winner = 'enemy'
    else if (enemyFlagship && !enemyFlagship.status.alive && playerAlive.length > 0) winner = 'player'
    else if (playerAlive.length > enemyAlive.length) winner = 'player'
    else if (enemyAlive.length > playerAlive.length) winner = 'enemy'

    const survivalRate = playerAlive.length / Math.max(1, playerShips.length)
    const avgHpRatio = playerAlive.reduce((sum, s) => sum + s.hp / s.maxHp, 0) / Math.max(1, playerAlive.length)
    const efficiency = (this.stats.totalDamageDealt / Math.max(1, this.stats.battleDuration)) / 100
    const enemyKillRate = 1 - enemyAlive.length / Math.max(1, enemyShips.length)

    const flagshipBonus = (playerFlagship && playerFlagship.status.alive) ? 10 : 0
    const enemyFlagshipKillBonus = (enemyFlagship && !enemyFlagship.status.alive) ? 8 : 0
    const skillEfficiency = Math.min(1, this.stats.skillUsageCount / Math.max(1, playerShips.length) / 2) * 5
    const timeBonus = this.stats.battleDuration < 60 ? 5 : this.stats.battleDuration < 120 ? 2 : 0

    const score = Math.min(100,
      survivalRate * 40
      + avgHpRatio * 15
      + Math.min(efficiency, 1) * 15
      + enemyKillRate * 15
      + flagshipBonus
      + enemyFlagshipKillBonus
      + skillEfficiency
      + timeBonus
    )

    let rating: 'S' | 'A' | 'B' | 'C' = 'C'
    if (winner === 'player') {
      if (score >= 90) rating = 'S'
      else if (score >= 75) rating = 'A'
      else if (score >= 55) rating = 'B'
      else rating = 'C'
    } else if (winner === 'draw') {
      if (score >= 70) rating = 'B'
      else rating = 'C'
    } else {
      if (score >= 70) rating = 'B'
      else if (score >= 45) rating = 'C'
    }

    return {
      winner,
      survivalRate: Math.round(survivalRate * 100),
      totalDamage: this.stats.totalDamageDealt,
      skillUsage: this.stats.skillUsageCount,
      rating,
      duration: Math.round(this.stats.battleDuration)
    }
  }

  selectShip(shipId: string | null): void {
    for (const ship of this.ships) {
      if (ship.id === this.selectedShipId) {
        setShipSelection(ship, false)
      }
    }
    this.selectedShipId = shipId
    if (shipId) {
      const ship = this.ships.find(s => s.id === shipId)
      if (ship) {
        setShipSelection(ship, true)
      }
    }
    this.emit('selectionChanged', shipId)
  }

  useSelectedShipSkill(skillIndex: number = 0, targetPosition?: THREE.Vector3): boolean {
    if (!this.selectedShipId || this.phase !== 'battle') return false
    const ship = this.ships.find(s => s.id === this.selectedShipId)
    if (!ship || ship.faction !== 'player') return false

    const result = manualUseSkill(ship, this.ships, this.aiState, skillIndex, targetPosition)
    if (result.event) {
      this.handleSkillEvent(result.event)
      this.stats.skillUsageCount++
    }
    for (const log of result.logs) this.addLog(log)
    return !!result.event
  }

  recallSelectedShip(): boolean {
    if (!this.selectedShipId || this.phase !== 'battle') return false
    const ship = this.ships.find(s => s.id === this.selectedShipId)
    if (!ship || ship.faction !== 'player') return false

    const success = recallShip(ship, 'player', this.ships)
    if (success) {
      this.addLog({
        id: `recall_${Date.now()}`,
        timestamp: Date.now(),
        message: `📡 ${ship.name} 紧急召回至后方！`,
        type: 'info'
      })
    }
    return success
  }

  setReplaySpeed(speed: number): void {
    this.replaySpeed = Math.max(0.25, Math.min(4, speed))
  }

  togglePause(): void {
    this.isPaused = !this.isPaused
    this.emit('pauseChanged', this.isPaused)
  }

  isReplayPaused(): boolean { return this.isPaused }

  cleanup(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId)
    this.animationId = null
    this.ships = []
    this.projectiles = []
    this.logs = []
    this.frameData = []
    this.skillEffects = []
    this.ctx.shipGroup.clear()
    this.ctx.projectileGroup.clear()
    this.listeners.clear()
  }
}
