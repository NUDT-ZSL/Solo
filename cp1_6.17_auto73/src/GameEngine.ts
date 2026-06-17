export type BuildingStyle = 'residential' | 'commercial' | 'industrial'

export interface Building {
  id: string
  x: number
  y: number
  floors: number
  style: BuildingStyle
  name: string
}

export interface GameState {
  buildings: Building[]
  currentStyle: BuildingStyle
  gridSize: number
}

export type GameEvent =
  | { type: 'BUILDING_PLACED'; building: Building }
  | { type: 'STYLE_CHANGED'; style: BuildingStyle; buildings: Building[] }
  | { type: 'BUILDING_CLICKED'; building: Building }

export type EventCallback = (event: GameEvent) => void

const STYLE_NAMES: Record<BuildingStyle, string> = {
  residential: '住宅',
  commercial: '商业',
  industrial: '工业'
}

const STYLE_BUILDING_NAMES: Record<BuildingStyle, string[]> = {
  residential: ['居民楼A', '居民楼B', '花园公寓', '城市住宅', '阳光小区'],
  commercial: ['商业中心', '购物广场', '写字楼A', '金融大厦', '贸易中心'],
  industrial: ['工厂A', '仓库B', '产业园', '制造基地', '物流中心']
}

export class GameEngine {
  private state: GameState
  private listeners: Set<EventCallback> = new Set()
  private nextId = 1

  constructor(gridSize = 25) {
    this.state = {
      buildings: [],
      currentStyle: 'residential',
      gridSize
    }
  }

  getState(): GameState {
    return { ...this.state, buildings: [...this.state.buildings] }
  }

  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private emit(event: GameEvent): void {
    this.listeners.forEach((cb) => cb(event))
  }

  private generateBuildingName(style: BuildingStyle): string {
    const names = STYLE_BUILDING_NAMES[style]
    return names[Math.floor(Math.random() * names.length)]
  }

  private generateId(): string {
    return `building_${this.nextId++}`
  }

  canPlaceBuilding(x: number, y: number): boolean {
    if (x < 0 || x >= this.state.gridSize || y < 0 || y >= this.state.gridSize) {
      return false
    }
    return !this.state.buildings.some((b) => b.x === x && b.y === y)
  }

  placeBuilding(x: number, y: number, floors: number): Building | null {
    if (!this.canPlaceBuilding(x, y)) {
      return null
    }

    const clampedFloors = Math.max(1, Math.min(6, Math.floor(floors)))
    const building: Building = {
      id: this.generateId(),
      x,
      y,
      floors: clampedFloors,
      style: this.state.currentStyle,
      name: this.generateBuildingName(this.state.currentStyle)
    }

    this.state.buildings.push(building)
    this.emit({ type: 'BUILDING_PLACED', building })
    return building
  }

  getBuildingAt(x: number, y: number): Building | undefined {
    return this.state.buildings.find((b) => b.x === x && b.y === y)
  }

  setCurrentStyle(style: BuildingStyle): void {
    if (this.state.currentStyle === style) {
      return
    }
    this.state.currentStyle = style
    const updatedBuildings = this.state.buildings.map((b) => ({
      ...b,
      style,
      name: this.generateBuildingName(style)
    }))
    this.state.buildings = updatedBuildings
    this.emit({ type: 'STYLE_CHANGED', style, buildings: [...updatedBuildings] })
  }

  getStyleName(style: BuildingStyle): string {
    return STYLE_NAMES[style]
  }

  clickBuilding(building: Building): void {
    this.emit({ type: 'BUILDING_CLICKED', building })
  }

  static floorsToColor(floors: number, style: BuildingStyle): string {
    const t = (floors - 1) / 5
    return getColorForStyleAndProgress(style, t)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getColorForStyleAndProgress(style: BuildingStyle, t: number): string {
  switch (style) {
    case 'residential':
      if (t <= 0.5) {
        return lerpColor('#8BC34A', '#4CAF50', t * 2)
      } else {
        return lerpColor('#4CAF50', '#2E7D32', (t - 0.5) * 2)
      }
    case 'commercial':
      if (t <= 0.5) {
        return lerpColor('#FF9800', '#F57C00', t * 2)
      } else {
        return lerpColor('#F57C00', '#E65100', (t - 0.5) * 2)
      }
    case 'industrial':
      if (t <= 0.5) {
        return lerpColor('#90A4AE', '#607D8B', t * 2)
      } else {
        return lerpColor('#607D8B', '#D32F2F', (t - 0.5) * 2)
      }
    default:
      return '#8BC34A'
  }
}

export const GRID_SIZE = 25
export const CELL_SIZE = 30
export const MIN_CLICK_DURATION = 500
export const MAX_CLICK_DURATION = 3000
export const MIN_FLOORS = 1
export const MAX_FLOORS = 6

export function durationToFloors(durationMs: number): number {
  const clamped = Math.max(MIN_CLICK_DURATION, Math.min(MAX_CLICK_DURATION, durationMs))
  const ratio = (clamped - MIN_CLICK_DURATION) / (MAX_CLICK_DURATION - MIN_CLICK_DURATION)
  return Math.round(MIN_FLOORS + ratio * (MAX_FLOORS - MIN_FLOORS))
}
