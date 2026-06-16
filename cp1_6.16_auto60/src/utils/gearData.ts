import { v4 as uuidv4 } from 'uuid'

export enum GearType {
  LARGE = 'large',
  SMALL = 'small',
  SPEED = 'speed',
  CLUTCH = 'clutch'
}

export interface Gear {
  id: string
  type: GearType
  row: number
  col: number
  rotation: number
  isSource: boolean
  isTarget: boolean
  isEmpty: boolean
  teethCount: number
}

export interface GearPos {
  row: number
  col: number
}

export interface MoveRecord {
  gearId: string
  fromRotation: number
  toRotation: number
  timestamp: number
}

export interface PuzzleConfig {
  size: number
  difficulty: number
  gears: Gear[]
  maxSteps: number
  minPathLength: number
}

export const GEAR_COLORS: Record<GearType, string> = {
  [GearType.LARGE]: '#8D6E63',
  [GearType.SMALL]: '#A1887F',
  [GearType.SPEED]: '#795548',
  [GearType.CLUTCH]: '#6D4C41'
}

export const GEAR_TEETH: Record<GearType, number> = {
  [GearType.LARGE]: 16,
  [GearType.SMALL]: 8,
  [GearType.SPEED]: 12,
  [GearType.CLUTCH]: 10
}

export const GEAR_RADIUS_RATIO: Record<GearType, number> = {
  [GearType.LARGE]: 1.0,
  [GearType.SMALL]: 0.5,
  [GearType.SPEED]: 0.75,
  [GearType.CLUTCH]: 0.65
}

export const DEFAULT_CONFIG = {
  MIN_SIZE: 4,
  MAX_SIZE: 6,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 3,
  STEP_MULTIPLIER: 1.5,
  MAX_HINTS: 3,
  ROTATION_STEP: 90,
  RUST_THRESHOLD: 0.5,
  RUST_INCREMENT: 0.1
}

export function createGear(
  type: GearType,
  row: number,
  col: number,
  options: Partial<Gear> = {}
): Gear {
  return {
    id: uuidv4(),
    type,
    row,
    col,
    rotation: options.rotation ?? 0,
    isSource: options.isSource ?? false,
    isTarget: options.isTarget ?? false,
    isEmpty: false,
    teethCount: GEAR_TEETH[type],
    ...options
  }
}

export function createEmptyGear(row: number, col: number): Gear {
  return {
    id: uuidv4(),
    type: GearType.SMALL,
    row,
    col,
    rotation: 0,
    isSource: false,
    isTarget: false,
    isEmpty: true,
    teethCount: 0
  }
}
