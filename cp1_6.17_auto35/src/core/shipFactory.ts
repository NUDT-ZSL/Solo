import * as THREE from 'three'
import type { Ship, ShipType, Faction, ShipStats, Skill } from '../types'

export interface ShipConfig {
  type: ShipType
  name: string
  displayName: string
  starRating: number
  stats: ShipStats
  skills: Omit<Skill, 'currentCooldown'>[]
  description: string
}

export const SHIP_CONFIGS: Record<ShipType, ShipConfig> = {
  frigate: {
    type: 'frigate',
    name: '护卫舰',
    displayName: 'Frigate',
    starRating: 2,
    description: '机动性强，适合骚扰侧翼',
    stats: {
      maxHp: 80,
      attack: 12,
      range: 4,
      speed: 2.5,
      armor: 2,
      skillCooldown: 30
    },
    skills: [{
      id: 'emp',
      name: 'EMP干扰',
      description: '使3格内敌舰眩晕3秒',
      cooldown: 30,
      color: '#1E88E5',
      type: 'emp'
    }]
  },
  destroyer: {
    type: 'destroyer',
    name: '驱逐舰',
    displayName: 'Destroyer',
    starRating: 3,
    description: '攻防均衡，中流砥柱',
    stats: {
      maxHp: 150,
      attack: 20,
      range: 5,
      speed: 1.8,
      armor: 5,
      skillCooldown: 30
    },
    skills: [{
      id: 'repair',
      name: '修复光环',
      description: '4格内友舰恢复30%血量',
      cooldown: 30,
      color: '#81C784',
      type: 'repair'
    }]
  },
  battleship: {
    type: 'battleship',
    name: '战列舰',
    displayName: 'Battleship',
    starRating: 5,
    description: '火力凶猛，旗舰首选',
    stats: {
      maxHp: 300,
      attack: 35,
      range: 7,
      speed: 1.0,
      armor: 10,
      skillCooldown: 30
    },
    skills: [{
      id: 'airstrike',
      name: '主炮齐射',
      description: '对选定区域造成高额伤害',
      cooldown: 30,
      color: '#FF8A65',
      type: 'airstrike'
    }]
  },
  carrier: {
    type: 'carrier',
    name: '航母',
    displayName: 'Carrier',
    starRating: 4,
    description: '支援型单位，战术核心',
    stats: {
      maxHp: 220,
      attack: 15,
      range: 8,
      speed: 1.2,
      armor: 6,
      skillCooldown: 30
    },
    skills: [{
      id: 'shield',
      name: '能量护盾',
      description: '为友舰提供3秒无敌护盾',
      cooldown: 30,
      color: '#CE93D8',
      type: 'shield'
    }]
  }
}

let shipIdCounter = 0

export function generateShipId(): string {
  return `ship_${Date.now()}_${++shipIdCounter}`
}

export function createShip(
  type: ShipType,
  faction: Faction,
  position: THREE.Vector3,
  isFlagship: boolean = false,
  customName?: string
): Ship {
  const config = SHIP_CONFIGS[type]
  const id = generateShipId()

  const ship: Ship = {
    id,
    name: customName || `${config.name}${faction === 'player' ? '·α' : '·β'}${shipIdCounter}`,
    type,
    faction,
    isFlagship,
    position: position.clone(),
    targetPosition: null,
    hp: config.stats.maxHp,
    maxHp: config.stats.maxHp,
    stats: { ...config.stats },
    skills: config.skills.map(s => ({
      ...s,
      currentCooldown: 0
    })),
    status: {
      alive: true,
      stunned: 0,
      damaged: 0,
      selected: false
    },
    attackCooldown: 0,
    targetShipId: null,
    isLOD: false
  }

  return ship
}

export function cloneShipForReplay(ship: Ship): Ship {
  return {
    ...ship,
    position: ship.position.clone(),
    targetPosition: ship.targetPosition?.clone() ?? null,
    stats: { ...ship.stats },
    skills: ship.skills.map(s => ({ ...s })),
    status: { ...ship.status }
  }
}

export function getShipDeployCount(type: ShipType): number {
  const counts: Record<ShipType, number> = {
    frigate: 4,
    destroyer: 3,
    battleship: 1,
    carrier: 1
  }
  return counts[type]
}

export function getTotalDeploySlots(): number {
  return 8
}

export function calculateDamage(attacker: Ship, defender: Ship): number {
  const baseDamage = attacker.stats.attack
  const armor = defender.stats.armor
  const randomFactor = 0.9 + Math.random() * 0.2
  const damage = Math.max(1, Math.round((baseDamage - armor * 0.5) * randomFactor))
  return damage
}

export function canUseSkill(ship: Ship, skillIndex: number = 0): boolean {
  if (!ship.status.alive || ship.status.stunned > 0) return false
  const skill = ship.skills[skillIndex]
  if (!skill) return false
  return skill.currentCooldown <= 0
}

export function triggerSkillCooldown(ship: Ship, skillIndex: number = 0): void {
  const skill = ship.skills[skillIndex]
  if (skill) {
    skill.currentCooldown = skill.cooldown
  }
}

export function healShip(ship: Ship, amount: number): number {
  if (!ship.status.alive) return 0
  const actualHeal = Math.min(amount, ship.maxHp - ship.hp)
  ship.hp += actualHeal
  return actualHeal
}

export function damageShip(ship: Ship, amount: number): number {
  if (!ship.status.alive) return 0
  const actualDamage = Math.min(amount, ship.hp)
  ship.hp -= actualDamage
  ship.status.damaged = 0.3
  if (ship.hp <= 0) {
    ship.status.alive = false
    ship.hp = 0
  }
  return actualDamage
}

export function stunShip(ship: Ship, duration: number): void {
  if (ship.status.alive) {
    ship.status.stunned = Math.max(ship.status.stunned, duration)
  }
}

export function updateShipTimers(ship: Ship, deltaTime: number): void {
  if (ship.attackCooldown > 0) {
    ship.attackCooldown = Math.max(0, ship.attackCooldown - deltaTime)
  }
  if (ship.status.stunned > 0) {
    ship.status.stunned = Math.max(0, ship.status.stunned - deltaTime)
  }
  if (ship.status.damaged > 0) {
    ship.status.damaged = Math.max(0, ship.status.damaged - deltaTime)
  }
  for (const skill of ship.skills) {
    if (skill.currentCooldown > 0) {
      skill.currentCooldown = Math.max(0, skill.currentCooldown - deltaTime)
    }
  }
}
