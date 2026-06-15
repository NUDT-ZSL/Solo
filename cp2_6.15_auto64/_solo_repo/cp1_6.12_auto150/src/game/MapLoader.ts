import type { FloorData, Icicle, TreasureChest, Staircase, Enemy, Vec2 } from './types'

interface MapConfig {
  floors: number
  gridWidth: number
  gridHeight: number
  icicleMinCount: number
  icicleMaxCount: number
  snowMonsterCount: number
  snowMonsterHp: number
  snowMonsterSpeed: number
  iceGolemCount: number
  iceGolemHp: number
  iceGolemSpeed: number
}

interface IdCounters {
  chestIdStart: number
  enemyIdStart: number
}

export class MapLoader {
  private config: MapConfig

  constructor(config: MapConfig) {
    this.config = config
  }

  generateFloor(floor: number, ids: IdCounters): FloorData {
    const { gridWidth: gw, gridHeight: gh } = this.config
    const center: Vec2 = { x: Math.floor(gw / 2), y: Math.floor(gh / 2) }

    const icicles = this.placeIcicles(floor, center, ids)
    const chests = this.placeChests(center, icicles, ids.chestIdStart)
    const stairs = this.placeStairs(gw, gh, icicles, center)
    const enemies = this.placeEnemies(floor, center, icicles, ids.enemyIdStart)

    return {
      floor,
      gridWidth: gw,
      gridHeight: gh,
      icicles,
      chests,
      stairs,
      enemies
    }
  }

  private randomGrid(icicles: Icicle[], exclude: Vec2[] = []): Vec2 | null {
    const { gridWidth: gw, gridHeight: gh } = this.config
    const attempts = gw * gh * 2
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * gw)
      const y = Math.floor(Math.random() * gh)
      if (icicles.some(ic => ic.gridPos.x === x && ic.gridPos.y === y)) continue
      if (exclude.some(ex => ex.x === x && ex.y === y)) continue
      return { x, y }
    }
    return null
  }

  private placeIcicles(_floor: number, center: Vec2, _ids: IdCounters): Icicle[] {
    const count = this.config.icicleMinCount +
      Math.floor(Math.random() * (this.config.icicleMaxCount - this.config.icicleMinCount + 1))
    const icicles: Icicle[] = []
    const exclude: Vec2[] = [
      center,
      { x: 0, y: Math.floor(this.config.gridHeight / 2) },
      { x: this.config.gridWidth - 1, y: Math.floor(this.config.gridHeight / 2) }
    ]
    for (let i = 0; i < count; i++) {
      const pos = this.randomGrid(icicles, exclude)
      if (!pos) break
      icicles.push({ gridPos: pos })
      exclude.push(pos)
    }
    return icicles
  }

  private placeChests(center: Vec2, icicles: Icicle[], startId: number): TreasureChest[] {
    const exclude: Vec2[] = [
      center,
      { x: 0, y: Math.floor(this.config.gridHeight / 2) },
      { x: this.config.gridWidth - 1, y: Math.floor(this.config.gridHeight / 2) }
    ]
    const chests: TreasureChest[] = []
    const pos = this.randomGrid(icicles, exclude)
    if (pos) {
      chests.push({ id: startId, pos, opened: false })
    }
    return chests
  }

  private placeStairs(gw: number, gh: number, icicles: Icicle[], center: Vec2): Staircase[] {
    const midY = Math.floor(gh / 2)
    const left: Vec2 = { x: 0, y: midY }
    const right: Vec2 = { x: gw - 1, y: midY }

    const hasLeftIcicle = icicles.some(i => i.gridPos.x === left.x && i.gridPos.y === left.y)
    const hasRightIcicle = icicles.some(i => i.gridPos.x === right.x && i.gridPos.y === right.y)

    const stairs: Staircase[] = []

    if (hasLeftIcicle) {
      const icIdx = icicles.findIndex(i => i.gridPos.x === left.x && i.gridPos.y === left.y)
      if (icIdx >= 0) icicles.splice(icIdx, 1)
    }
    if (hasRightIcicle) {
      const icIdx = icicles.findIndex(i => i.gridPos.x === right.x && i.gridPos.y === right.y)
      if (icIdx >= 0) icicles.splice(icIdx, 1)
    }

    const exclude: Vec2[] = [center]
    if (this.isNear(left, center, 3) || icicles.some(i => i.gridPos.x === left.x && i.gridPos.y === left.y)) {
      for (let y = 0; y < gh; y++) {
        const p = { x: 0, y }
        if (!icicles.some(i => i.gridPos.x === p.x && i.gridPos.y === p.y) && !this.isNear(p, center, 2)) {
          stairs.push({ pos: p, direction: 'up' })
          exclude.push(p)
          break
        }
      }
    } else {
      stairs.push({ pos: left, direction: 'up' })
      exclude.push(left)
    }

    if (this.isNear(right, center, 3)) {
      for (let y = 0; y < gh; y++) {
        const p = { x: gw - 1, y }
        if (!icicles.some(i => i.gridPos.x === p.x && i.gridPos.y === p.y) && !this.isNear(p, center, 2)) {
          stairs.push({ pos: p, direction: 'up' })
          exclude.push(p)
          break
        }
      }
    } else {
      stairs.push({ pos: right, direction: 'up' })
      exclude.push(right)
    }

    return stairs
  }

  private isNear(a: Vec2, b: Vec2, r: number): boolean {
    return Math.abs(a.x - b.x) <= r && Math.abs(a.y - b.y) <= r
  }

  private placeEnemies(_floor: number, center: Vec2, icicles: Icicle[], startId: number): Enemy[] {
    const enemies: Enemy[] = []
    let nextId = startId
    const exclude: Vec2[] = [
      center,
      { x: 0, y: Math.floor(this.config.gridHeight / 2) },
      { x: this.config.gridWidth - 1, y: Math.floor(this.config.gridHeight / 2) }
    ]

    const used: Vec2[] = []

    for (let i = 0; i < this.config.snowMonsterCount; i++) {
      const pos = this.randomGrid([...icicles, ...used.map(u => ({ gridPos: u }))], [...exclude, ...used])
      if (!pos) break
      used.push(pos)
      enemies.push({
        id: nextId++,
        type: 'snow_monster',
        pos: { x: -9999, y: -9999 },
        hp: this.config.snowMonsterHp,
        maxHp: this.config.snowMonsterHp,
        baseSpeed: this.config.snowMonsterSpeed,
        slowedUntil: 0,
        patrolTarget: null,
        damageDealt: false
      })
      const eIdx = enemies.length - 1
      enemies[eIdx].pos = this.gridToWorld(pos, enemies[eIdx], icicles)
    }

    for (let i = 0; i < this.config.iceGolemCount; i++) {
      const pos = this.randomGrid([...icicles, ...used.map(u => ({ gridPos: u }))], [...exclude, ...used])
      if (!pos) break
      used.push(pos)
      enemies.push({
        id: nextId++,
        type: 'ice_golem',
        pos: { x: -9999, y: -9999 },
        hp: this.config.iceGolemHp,
        maxHp: this.config.iceGolemHp,
        baseSpeed: this.config.iceGolemSpeed,
        slowedUntil: 0,
        patrolTarget: pos,
        damageDealt: false
      })
      const eIdx = enemies.length - 1
      enemies[eIdx].pos = this.gridToWorld(pos, enemies[eIdx], icicles)
    }

    return enemies
  }

  private gridToWorld(g: Vec2, _e: Enemy, _icicles: Icicle[]): Vec2 {
    return { x: g.x * 64 + 32, y: g.y * 64 + 32 }
  }
}
