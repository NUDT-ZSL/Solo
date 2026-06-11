export const GRID_SIZE = 20

export type OrganismType = 'grass' | 'rabbit' | 'fox' | 'empty'

export enum CreatureType {
  Grass = 'grass',
  Rabbit = 'rabbit',
  Fox = 'fox'
}

export interface Position {
  x: number
  y: number
}

export interface Grass {
  type: CreatureType.Grass
  regrowTimer: number
}

export interface Animal {
  type: CreatureType.Rabbit | CreatureType.Fox
  energy: number
  x: number
  y: number
  prevX: number
  prevY: number
  id: number
}

export interface CellState {
  x: number
  y: number
  grass: Grass | null
  animal: Animal | null
  forbidden: boolean
}

export interface EcosystemStats {
  grassCount: number
  rabbitCount: number
  foxCount: number
  grassCoverage: number
  turn: number
}

export interface SimConfig {
  grassDensity: number
  rabbitCount: number
  foxCount: number
  grassRegrowTime: number
  rabbitBreedThreshold: number
}

export interface RegrowTask {
  x: number
  y: number
  remainingTurns: number
}
