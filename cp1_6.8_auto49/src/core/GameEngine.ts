import { type Unit, type Position, type AnimationData, type GamePhase, type TurnStep, GRID_SIZE } from './types'
import { GridManager } from './GridManager'
import { UnitManager, createPlayerUnits, createEnemyUnits } from './UnitManager'
import { AIController, type AIAction } from './AIController'

export interface GameCallbacks {
  onStateChange: () => void
  onAnimations: (animations: AnimationData[]) => void
  onPhaseChange: (phase: GamePhase) => void
  onDamagePopup: (unitId: string, damage: number, isHeal?: boolean) => void
  onItemPickup: (unitId: string, itemType: string) => void
  onDeath: (unitId: string) => void
}

export class GameEngine {
  gridManager: GridManager
  unitManager: UnitManager
  aiController: AIController
  phase: GamePhase = 'start'
  turnStep: TurnStep = 'select'
  turnNumber: number = 0
  selectedUnit: Unit | null = null
  moveableCells: Position[] = []
  attackableCells: Position[] = []
  skillMode: boolean = false
  isAnimating: boolean = false
  callbacks: GameCallbacks

  constructor(callbacks: GameCallbacks) {
    this.gridManager = new GridManager()
    this.unitManager = new UnitManager()
    this.aiController = new AIController(this.gridManager)
    this.callbacks = callbacks
  }

  startGame(): void {
    this.gridManager.initializeGrid()
    this.unitManager = new UnitManager()

    this.gridManager.generateObstacles(8)
    this.gridManager.generateItems(3)

    const playerDefs = createPlayerUnits()
    for (const def of playerDefs) {
      const unit = this.unitManager.createUnit(def.id, def.name, def.type, def.position, true)
      this.gridManager.placeUnit(unit)
    }

    const enemyDefs = createEnemyUnits()
    for (const def of enemyDefs) {
      const unit = this.unitManager.createUnit(def.id, def.name, def.type, def.position, false)
      this.gridManager.placeUnit(unit)
    }

    this.phase = 'playerTurn'
    this.turnNumber = 1
    this.turnStep = 'select'
    this.selectedUnit = null
    this.moveableCells = []
    this.attackableCells = []
    this.skillMode = false
    this.unitManager.resetTurn(true)
    this.callbacks.onPhaseChange(this.phase)
    this.callbacks.onStateChange()
  }

  selectUnit(unit: Unit): void {
    if (this.phase !== 'playerTurn' || this.isAnimating) return
    if (!unit.isPlayer || unit.hasActed) return

    this.selectedUnit = unit
    this.moveableCells = unit.hasMoved ? [] : this.gridManager.getMoveableCells(unit)
    this.attackableCells = this.skillMode
      ? this.gridManager.getSkillTargets(unit)
      : this.gridManager.getAttackableCells(unit)
    this.turnStep = 'move'
    this.callbacks.onStateChange()
  }

  deselectUnit(): void {
    this.selectedUnit = null
    this.moveableCells = []
    this.attackableCells = []
    this.turnStep = 'select'
    this.skillMode = false
    this.callbacks.onStateChange()
  }

  toggleSkillMode(): void {
    if (!this.selectedUnit || this.phase !== 'playerTurn') return
    if (!this.unitManager.canUseSkill(this.selectedUnit)) return

    this.skillMode = !this.skillMode
    this.attackableCells = this.skillMode
      ? this.gridManager.getSkillTargets(this.selectedUnit)
      : this.gridManager.getAttackableCells(this.selectedUnit)
    this.callbacks.onStateChange()
  }

  moveUnit(targetPos: Position): void {
    if (!this.selectedUnit || this.isAnimating) return
    if (this.phase !== 'playerTurn') return

    const isMoveable = this.moveableCells.some(c => c.row === targetPos.row && c.col === targetPos.col)
    if (!isMoveable) return

    const from = { ...this.selectedUnit.position }
    const path = this.gridManager.findPath(from, targetPos, this.selectedUnit.moveRange)
    if (!path || path.length === 0) return

    const anim: AnimationData = {
      type: 'move',
      unitId: this.selectedUnit.id,
      from,
      to: targetPos,
      path,
      duration: path.length * 150,
      startTime: Date.now(),
    }

    this.gridManager.moveUnitOnGrid(this.selectedUnit, from, targetPos)
    this.selectedUnit.hasMoved = true
    this.moveableCells = []
    this.turnStep = 'attack'

    this.attackableCells = this.skillMode
      ? this.gridManager.getSkillTargets(this.selectedUnit)
      : this.gridManager.getAttackableCells(this.selectedUnit)

    const item = this.gridManager.getItemAt(targetPos)
    if (item) {
      this.unitManager.applyItem(this.selectedUnit, item.type, item.value)
      this.gridManager.removeItem(targetPos)
      const pickupAnim: AnimationData = {
        type: 'pickup',
        unitId: this.selectedUnit.id,
        itemId: item.id,
        itemType: item.type,
        from: targetPos,
        to: targetPos,
        duration: 400,
        startTime: Date.now() + anim.duration,
      }
      this.callbacks.onAnimations([anim, pickupAnim])
      this.callbacks.onItemPickup(this.selectedUnit.id, item.type)
    } else {
      this.callbacks.onAnimations([anim])
    }

    this.isAnimating = true
    setTimeout(() => {
      this.isAnimating = false
      this.callbacks.onStateChange()
    }, anim.duration + (item ? 400 : 50))

    this.callbacks.onStateChange()
  }

  attackTarget(targetPos: Position): void {
    if (!this.selectedUnit || this.isAnimating) return
    if (this.phase !== 'playerTurn') return

    const isAttackable = this.attackableCells.some(c => c.row === targetPos.row && c.col === targetPos.col)
    if (!isAttackable) return

    const targetCell = this.gridManager.getCell(targetPos)
    if (!targetCell?.occupant) return
    const target = targetCell.occupant
    if (target.isPlayer === this.selectedUnit.isPlayer) return

    if (this.skillMode) {
      this.executeSkill(this.selectedUnit, targetPos)
    } else {
      this.executeAttack(this.selectedUnit, target)
    }
  }

  private executeAttack(attacker: Unit, target: Unit): void {
    const damage = Math.max(1, attacker.attack - Math.floor(Math.random() * 5))
    const anim: AnimationData = {
      type: 'attack',
      unitId: attacker.id,
      targetId: target.id,
      from: attacker.position,
      to: target.position,
      duration: 500,
      startTime: Date.now(),
      damage,
    }

    const killed = this.unitManager.dealDamage(target, damage)
    attacker.hasActed = true

    const animations: AnimationData[] = [anim]

    if (killed) {
      const deathAnim: AnimationData = {
        type: 'death',
        unitId: target.id,
        duration: 600,
        startTime: Date.now() + 400,
      }
      animations.push(deathAnim)
      this.gridManager.removeUnit(target.position)
    }

    this.callbacks.onAnimations(animations)
    this.callbacks.onDamagePopup(target.id, damage)

    if (killed) {
      setTimeout(() => this.callbacks.onDeath(target.id), 400)
    }

    this.isAnimating = true
    setTimeout(() => {
      this.isAnimating = false
      this.finishUnitAction()
    }, killed ? 1000 : 600)
  }

  private executeSkill(caster: Unit, targetPos: Position): void {
    const skill = caster.skill
    const damage = Math.max(1, Math.floor(caster.attack * skill.damageMultiplier) - Math.floor(Math.random() * 5))

    const anim: AnimationData = {
      type: 'skill',
      unitId: caster.id,
      targetId: '',
      from: caster.position,
      to: targetPos,
      duration: 600,
      startTime: Date.now(),
      damage,
    }

    const animations: AnimationData[] = [anim]
    const targetsHit: Unit[] = []

    if (skill.aoe > 0) {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const pos = { row, col }
          if (this.manhattanDist(targetPos, pos) <= skill.aoe) {
            const cell = this.gridManager.getCell(pos)
            if (cell?.occupant && cell.occupant.isPlayer !== caster.isPlayer && cell.occupant.isAlive) {
              targetsHit.push(cell.occupant)
            }
          }
        }
      }
    } else {
      const cell = this.gridManager.getCell(targetPos)
      if (cell?.occupant && cell.occupant.isPlayer !== caster.isPlayer && cell.occupant.isAlive) {
        targetsHit.push(cell.occupant)
      }
    }

    for (const target of targetsHit) {
      const aoeDamage = Math.max(1, damage - Math.floor(Math.random() * 3))
      const killed = this.unitManager.dealDamage(target, aoeDamage)
      this.callbacks.onDamagePopup(target.id, aoeDamage)

      if (killed) {
        const deathAnim: AnimationData = {
          type: 'death',
          unitId: target.id,
          duration: 600,
          startTime: Date.now() + 500,
        }
        animations.push(deathAnim)
        this.gridManager.removeUnit(target.position)
        setTimeout(() => this.callbacks.onDeath(target.id), 500)
      }

      if (skill.knockback && target.isAlive) {
        this.applyKnockback(target, caster.position, skill.knockback)
      }
    }

    this.unitManager.useSkill(caster)
    caster.hasActed = true

    this.callbacks.onAnimations(animations)

    this.isAnimating = true
    setTimeout(() => {
      this.isAnimating = false
      this.finishUnitAction()
    }, targetsHit.some(t => !t.isAlive) ? 1200 : 800)
  }

  private applyKnockback(target: Unit, from: Position, distance: number): void {
    const dr = target.position.row - from.row
    const dc = target.position.col - from.col
    let nr = dr === 0 ? 0 : dr > 0 ? 1 : -1
    let nc = dc === 0 ? 0 : dc > 0 ? 1 : -1

    if (nr === 0 && nc === 0) return

    for (let i = 0; i < distance; i++) {
      const newPos = { row: target.position.row + nr, col: target.position.col + nc }
      if (newPos.row < 0 || newPos.row >= GRID_SIZE || newPos.col < 0 || newPos.col >= GRID_SIZE) break
      const cell = this.gridManager.getCell(newPos)
      if (!cell || cell.type === 'obstacle' || cell.occupant !== null) break
      this.gridManager.moveUnitOnGrid(target, target.position, newPos)
    }
  }

  private manhattanDist(a: Position, b: Position): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
  }

  skipAttack(): void {
    if (!this.selectedUnit) return
    this.selectedUnit.hasActed = true
    this.finishUnitAction()
  }

  private finishUnitAction(): void {
    this.selectedUnit = null
    this.moveableCells = []
    this.attackableCells = []
    this.skillMode = false
    this.turnStep = 'select'

    const phase = this.checkWinLose()
    if (phase) {
      this.phase = phase
      this.callbacks.onPhaseChange(phase)
    }

    this.callbacks.onStateChange()
  }

  endPlayerTurn(): void {
    if (this.phase !== 'playerTurn' || this.isAnimating) return

    this.selectedUnit = null
    this.moveableCells = []
    this.attackableCells = []
    this.skillMode = false

    const transitionAnim: AnimationData = {
      type: 'turnTransition',
      unitId: '',
      duration: 500,
      startTime: Date.now(),
    }
    this.callbacks.onAnimations([transitionAnim])

    this.isAnimating = true
    setTimeout(() => {
      this.isAnimating = false
      this.phase = 'enemyTurn'
      this.callbacks.onPhaseChange('enemyTurn')
      this.executeEnemyTurn()
    }, 600)
  }

  private async executeEnemyTurn(): Promise<void> {
    this.unitManager.resetTurn(false)
    this.callbacks.onStateChange()

    const enemies = this.unitManager.getAliveUnits(false)
    const players = this.unitManager.getAliveUnits(true)
    const actions = this.aiController.computeActions(enemies, players)

    for (const action of actions) {
      await this.executeAIAction(action)

      const phase = this.checkWinLose()
      if (phase) {
        this.phase = phase
        this.callbacks.onPhaseChange(phase)
        this.callbacks.onStateChange()
        return
      }
    }

    const transitionAnim: AnimationData = {
      type: 'turnTransition',
      unitId: '',
      duration: 500,
      startTime: Date.now(),
    }
    this.callbacks.onAnimations([transitionAnim])

    this.isAnimating = true
    setTimeout(() => {
      this.isAnimating = false
      this.turnNumber++
      this.phase = 'playerTurn'
      this.unitManager.resetTurn(true)
      this.turnStep = 'select'
      this.callbacks.onPhaseChange('playerTurn')
      this.callbacks.onStateChange()
    }, 600)
  }

  private executeAIAction(action: AIAction): Promise<void> {
    return new Promise(resolve => {
      const unit = action.unit

      if (action.type === 'move' && action.target && action.path) {
        const from = { ...unit.position }
        const anim: AnimationData = {
          type: 'move',
          unitId: unit.id,
          from,
          to: action.target,
          path: action.path,
          duration: action.path.length * 150,
          startTime: Date.now(),
        }

        this.gridManager.moveUnitOnGrid(unit, from, action.target)
        this.callbacks.onAnimations([anim])

        const item = this.gridManager.getItemAt(action.target)
        if (item) {
          this.unitManager.applyItem(unit, item.type, item.value)
          this.gridManager.removeItem(action.target)
          const pickupAnim: AnimationData = {
            type: 'pickup',
            unitId: unit.id,
            itemId: item.id,
            itemType: item.type,
            from: action.target,
            to: action.target,
            duration: 400,
            startTime: Date.now() + anim.duration,
          }
          this.callbacks.onAnimations([pickupAnim])
        }

        this.isAnimating = true
        setTimeout(() => {
          this.isAnimating = false
          unit.hasMoved = true

          const attackable = this.gridManager.getAttackableEnemies(unit)
          if (attackable.length > 0) {
            const target = attackable.sort((a, b) => a.hp - b.hp)[0]
            if (unit.skill.aoe > 0 && unit.skill.currentCooldown === 0) {
              const aoeTargets = this.getAoePlayerTargets(unit, target.position)
              if (aoeTargets.length >= 2) {
                this.executeSkill(unit, target.position)
                setTimeout(resolve, 1200)
                return
              }
            }
            this.executeAttack(unit, target)
            setTimeout(resolve, 1000)
          } else {
            unit.hasActed = true
            this.callbacks.onStateChange()
            resolve()
          }
        }, anim.duration + 100)
        return
      }

      if (action.type === 'attack' && action.targetUnit) {
        this.executeAttack(unit, action.targetUnit)
        setTimeout(resolve, 1000)
        return
      }

      if (action.type === 'skill' && action.target) {
        this.executeSkill(unit, action.target)
        setTimeout(resolve, 1200)
        return
      }

      unit.hasActed = true
      resolve()
    })
  }

  private getAoePlayerTargets(enemy: Unit, center: Position): Unit[] {
    const players = this.unitManager.getAliveUnits(true)
    const targets: Unit[] = []
    for (const player of players) {
      if (this.manhattanDist(center, player.position) <= enemy.skill.aoe) {
        targets.push(player)
      }
    }
    return targets
  }

  private checkWinLose(): GamePhase | null {
    const alivePlayers = this.unitManager.getAliveUnits(true)
    const aliveEnemies = this.unitManager.getAliveUnits(false)

    if (aliveEnemies.length === 0) return 'victory'
    if (alivePlayers.length === 0) return 'defeat'
    return null
  }

  handleClick(row: number, col: number): void {
    if (this.phase !== 'playerTurn' || this.isAnimating) return

    const clickedPos: Position = { row, col }
    const clickedCell = this.gridManager.getCell(clickedPos)

    if (this.turnStep === 'select' || !this.selectedUnit) {
      if (clickedCell?.occupant && clickedCell.occupant.isPlayer && !clickedCell.occupant.hasActed) {
        this.selectUnit(clickedCell.occupant)
      }
      return
    }

    if (this.turnStep === 'move' && !this.selectedUnit.hasMoved) {
      const isMoveable = this.moveableCells.some(c => c.row === row && c.col === col)
      if (isMoveable) {
        this.moveUnit(clickedPos)
        return
      }

      if (clickedCell?.occupant && clickedCell.occupant.isPlayer && clickedCell.occupant.id !== this.selectedUnit.id) {
        this.selectUnit(clickedCell.occupant)
        return
      }

      if (clickedPos.row === this.selectedUnit.position.row && clickedPos.col === this.selectedUnit.position.col) {
        this.selectedUnit.hasMoved = true
        this.moveableCells = []
        this.turnStep = 'attack'
        this.attackableCells = this.skillMode
          ? this.gridManager.getSkillTargets(this.selectedUnit)
          : this.gridManager.getAttackableCells(this.selectedUnit)
        this.callbacks.onStateChange()
        return
      }

      this.deselectUnit()
      return
    }

    if (this.turnStep === 'attack') {
      const isAttackable = this.attackableCells.some(c => c.row === row && c.col === col)
      if (isAttackable) {
        const target = clickedCell?.occupant
        if (target && !target.isPlayer) {
          this.attackTarget(clickedPos)
          return
        }
      }

      if (clickedCell?.occupant && clickedCell.occupant.isPlayer && clickedCell.occupant.id !== this.selectedUnit.id) {
        this.selectUnit(clickedCell.occupant)
        return
      }

      this.skipAttack()
      return
    }
  }
}
