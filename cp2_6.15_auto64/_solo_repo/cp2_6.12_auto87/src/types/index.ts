export type Element = 'fire' | 'water' | 'wood' | 'light' | 'dark'
export type Direction = 'up' | 'down' | 'left' | 'right'
export type TerrainType = 'forest' | 'water' | 'volcano' | 'grassland'

export interface Skill {
  name: string
  element: Element
  power: number
}

export interface Spirit {
  id: string
  playerId: string
  name: string
  element: Element
  hp: number
  maxHp: number
  attack: number
  defense: number
  resistance: number
  skills: Skill[]
  level: number
  exp: number
}

export interface Player {
  id: string
  name: string
  hp: number
  maxHp: number
  exp: number
  level: number
  unlockedAreas: string[]
  createdAt: string
}

export interface Cell {
  x: number
  y: number
  terrain: TerrainType
  hasEncounter: boolean
}

export interface Footprint {
  id: number
  x: number
  y: number
  createdAt: number
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff6b3d',
  water: '#3d8bff',
  wood: '#4caf50',
  light: '#ffd700',
  dark: '#8b5cf6',
}

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '火',
  water: '水',
  wood: '木',
  light: '光',
  dark: '暗',
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: '#2d5a3d',
  water: '#2a5488',
  volcano: '#7a2e2e',
  grassland: '#6b7a2e',
}

export const SPIRIT_TEMPLATES: Array<{ name: string; element: Element; skills: Skill[] }> = [
  {
    name: '炎尾狐',
    element: 'fire',
    skills: [
      { name: '烈焰弹', element: 'fire', power: 20 },
      { name: '焚烧', element: 'fire', power: 30 },
      { name: '极速冲撞', element: 'dark', power: 15 },
    ],
  },
  {
    name: '蓝鳞蛟',
    element: 'water',
    skills: [
      { name: '水龙卷', element: 'water', power: 22 },
      { name: '冰封', element: 'water', power: 28 },
      { name: '净化之泉', element: 'light', power: 18 },
    ],
  },
  {
    name: '翠叶鹿',
    element: 'wood',
    skills: [
      { name: '藤蔓缠绕', element: 'wood', power: 20 },
      { name: '光合作用', element: 'wood', power: 25 },
      { name: '自然之力', element: 'wood', power: 32 },
    ],
  },
  {
    name: '光羽鹰',
    element: 'light',
    skills: [
      { name: '圣光柱', element: 'light', power: 26 },
      { name: '光之翼', element: 'light', power: 18 },
      { name: '审判', element: 'light', power: 35 },
    ],
  },
  {
    name: '暗影狼',
    element: 'dark',
    skills: [
      { name: '暗影球', element: 'dark', power: 24 },
      { name: '撕咬', element: 'dark', power: 20 },
      { name: '噩梦', element: 'dark', power: 33 },
    ],
  },
  {
    name: '熔岩龟',
    element: 'fire',
    skills: [
      { name: '岩浆喷射', element: 'fire', power: 28 },
      { name: '坚硬外壳', element: 'wood', power: 15 },
      { name: '爆燃', element: 'fire', power: 30 },
    ],
  },
]

export function getElementAdvantage(attacker: Element, defender: Element): number {
  const advantages: Record<Element, Element[]> = {
    fire: ['wood'],
    wood: ['water'],
    water: ['fire'],
    light: ['dark'],
    dark: ['light'],
  }
  if (advantages[attacker].includes(defender)) return 1.5
  if (advantages[defender].includes(attacker)) return 0.7
  return 1.0
}

export function randomSpirit(): { name: string; element: Element; skills: Skill[] } {
  return SPIRIT_TEMPLATES[Math.floor(Math.random() * SPIRIT_TEMPLATES.length)]
}
