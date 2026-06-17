import { create } from 'zustand'
import { Planet, getUpgradeCost } from './planetData'

export interface Resources {
  iron: number
  uranium: number
  crystal: number
}

export interface CollectParticle {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  color: string
  startTime: number
  duration: number
  perpX: number
  perpY: number
  arcHeight: number
}

export interface ResourceFlash {
  iron: number
  uranium: number
  crystal: number
}

export type ResourceType = 'iron' | 'uranium' | 'crystal'

export interface MiningCompleteEvent {
  id: number
  resourceType: ResourceType
  timestamp: number
}

export interface Ship {
  x: number
  y: number
  targetX: number | null
  targetY: number | null
  isSelected: boolean
  isFlying: boolean
  isMining: boolean
  isReturning: boolean
  currentPlanetId: string | null
  returnStartX: number
  returnStartY: number
  returnProgress: number
}

export interface Upgrades {
  engine: { level: number; speedBonus: number }
  cargo: { level: number; capacity: number }
  laser: { level: number; efficiencyBonus: number }
}

interface GameState {
  ship: Ship
  resources: Resources
  upgrades: Upgrades
  selectedPlanetId: string | null
  hoveredPlanetId: string | null
  miningProgress: number
  totalMiningCount: number
  shipLevel: number
  collectParticles: CollectParticle[]
  resourceFlash: ResourceFlash
  miningRingRotation: number
  miningCompleteEvents: MiningCompleteEvent[]
  canMine: (planet: Planet) => boolean
  selectShip: () => void
  setTargetPlanet: (planet: Planet | null) => void
  setHoveredPlanet: (planetId: string | null) => void
  updateShipPosition: (x: number, y: number) => void
  startMining: (planetId: string) => void
  updateMiningProgress: (progress: number) => void
  finishMining: (resourceType: ResourceType, amount: number, planetX: number, planetY: number, shipX: number, shipY: number, planetColor: string) => void
  startReturning: (startX: number, startY: number) => void
  updateReturnProgress: (progress: number) => void
  finishReturning: () => void
  upgradePart: (part: 'engine' | 'cargo' | 'laser') => boolean
  addCollectParticle: (particle: Omit<CollectParticle, 'id'>) => void
  removeCollectParticle: (id: number) => void
  triggerResourceFlash: (resourceType: ResourceType) => void
  updateMiningRingRotation: (rotation: number) => void
  removeMiningCompleteEvent: (id: number) => void
}

const initialShip: Ship = {
  x: 400,
  y: 450,
  targetX: null,
  targetY: null,
  isSelected: false,
  isFlying: false,
  isMining: false,
  isReturning: false,
  currentPlanetId: null,
  returnStartX: 400,
  returnStartY: 450,
  returnProgress: 0,
}

const initialUpgrades: Upgrades = {
  engine: { level: 1, speedBonus: 0 },
  cargo: { level: 1, capacity: 10 },
  laser: { level: 1, efficiencyBonus: 0 },
}

let particleIdCounter = 0
let miningEventIdCounter = 0

export const useGameStore = create<GameState>((set, get) => ({
  ship: initialShip,
  resources: { iron: 0, uranium: 0, crystal: 0 },
  upgrades: initialUpgrades,
  selectedPlanetId: null,
  hoveredPlanetId: null,
  miningProgress: 0,
  totalMiningCount: 0,
  shipLevel: 1,
  collectParticles: [],
  resourceFlash: { iron: 0, uranium: 0, crystal: 0 },
  miningRingRotation: 0,
  miningCompleteEvents: [],

  canMine: (planet: Planet) => {
    const { upgrades } = get()
    return planet.distance <= upgrades.engine.level
  },

  selectShip: () =>
    set((state) => ({
      ship: { ...state.ship, isSelected: !state.ship.isSelected },
    })),

  setTargetPlanet: (planet) =>
    set((state) => {
      if (!planet) {
        return {
          ship: { ...state.ship, targetX: null, targetY: null, isFlying: false },
          selectedPlanetId: null,
        }
      }
      return {
        ship: {
          ...state.ship,
          targetX: planet.x,
          targetY: planet.y,
          isFlying: true,
          isSelected: false,
        },
        selectedPlanetId: planet.id,
      }
    }),

  setHoveredPlanet: (planetId) => set({ hoveredPlanetId: planetId }),

  updateShipPosition: (x, y) =>
    set((state) => ({
      ship: { ...state.ship, x, y },
    })),

  startMining: (planetId) =>
    set((state) => ({
      ship: { ...state.ship, isFlying: false, isMining: true, currentPlanetId: planetId },
      miningProgress: 0,
    })),

  updateMiningProgress: (progress) => set({ miningProgress: progress }),

  finishMining: (resourceType, amount, planetX, planetY, shipX, shipY, planetColor) =>
    set((state) => {
      const newResources = { ...state.resources }
      newResources[resourceType] += amount

      const particleCount = 4 + Math.floor(Math.random() * 3)
      const newParticles: CollectParticle[] = []
      const now = performance.now()

      const dx = shipX - planetX
      const dy = shipY - planetY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const dirX = dx / dist
      const dirY = dy / dist
      const perpX = -dirY
      const perpY = dirX

      for (let i = 0; i < particleCount; i++) {
        const angleOffset = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5
        const startOffset = 5 + Math.random() * 10
        const arcHeight = 25 + Math.random() * 20
        const side = i % 2 === 0 ? 1 : -1
        newParticles.push({
          id: particleIdCounter++,
          startX: planetX + Math.cos(angleOffset) * startOffset,
          startY: planetY + Math.sin(angleOffset) * startOffset,
          targetX: shipX,
          targetY: shipY,
          color: planetColor,
          startTime: now + i * 50,
          duration: 600,
          perpX: perpX * side,
          perpY: perpY * side,
          arcHeight,
        })
      }

      const newEvent: MiningCompleteEvent = {
        id: miningEventIdCounter++,
        resourceType,
        timestamp: now,
      }

      return {
        resources: newResources,
        ship: { ...state.ship, isMining: false, isReturning: true },
        miningProgress: 0,
        totalMiningCount: state.totalMiningCount + 1,
        collectParticles: [...state.collectParticles, ...newParticles],
        miningCompleteEvents: [...state.miningCompleteEvents, newEvent],
      }
    }),

  startReturning: (startX, startY) =>
    set((state) => ({
      ship: {
        ...state.ship,
        returnStartX: startX,
        returnStartY: startY,
        returnProgress: 0,
      },
    })),

  updateReturnProgress: (progress) =>
    set((state) => ({
      ship: { ...state.ship, returnProgress: progress },
    })),

  finishReturning: () =>
    set((state) => ({
      ship: {
        ...state.ship,
        isReturning: false,
        currentPlanetId: null,
        targetX: null,
        targetY: null,
        x: 400,
        y: 450,
      },
      selectedPlanetId: null,
    })),

  upgradePart: (part) => {
    const state = get()
    const currentLevel = state.upgrades[part].level
    const cost = getUpgradeCost(part, currentLevel)

    if (
      state.resources.iron < cost.iron ||
      state.resources.uranium < cost.uranium ||
      state.resources.crystal < cost.crystal
    ) {
      return false
    }

    const newResources = {
      iron: state.resources.iron - cost.iron,
      uranium: state.resources.uranium - cost.uranium,
      crystal: state.resources.crystal - cost.crystal,
    }

    const newUpgrades = { ...state.upgrades }
    if (part === 'engine') {
      newUpgrades.engine = {
        level: currentLevel + 1,
        speedBonus: currentLevel * 0.2,
      }
    } else if (part === 'cargo') {
      newUpgrades.cargo = {
        level: currentLevel + 1,
        capacity: (currentLevel + 1) * 10,
      }
    } else if (part === 'laser') {
      newUpgrades.laser = {
        level: currentLevel + 1,
        efficiencyBonus: currentLevel * 0.15,
      }
    }

    const totalLevel =
      newUpgrades.engine.level + newUpgrades.cargo.level + newUpgrades.laser.level - 2

    set({
      resources: newResources,
      upgrades: newUpgrades,
      shipLevel: totalLevel,
    })

    return true
  },

  addCollectParticle: (particle) =>
    set((state) => ({
      collectParticles: [...state.collectParticles, { ...particle, id: particleIdCounter++ }],
    })),

  removeCollectParticle: (id) =>
    set((state) => ({
      collectParticles: state.collectParticles.filter((p) => p.id !== id),
    })),

  triggerResourceFlash: (resourceType) =>
    set((state) => ({
      resourceFlash: {
        ...state.resourceFlash,
        [resourceType]: performance.now(),
      },
    })),

  updateMiningRingRotation: (rotation) => set({ miningRingRotation: rotation }),

  removeMiningCompleteEvent: (id) =>
    set((state) => ({
      miningCompleteEvents: state.miningCompleteEvents.filter((e) => e.id !== id),
    })),
}))
