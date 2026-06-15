import { create } from 'zustand'
import type { Galaxy, SimulationParams, GalaxyType } from '../constants'
import { DEFAULT_SIMULATION_PARAMS, createGalaxy } from '../constants'

interface AppState {
  galaxies: Galaxy[]
  selectedGalaxyIds: string[]
  params: SimulationParams
  placementMode: GalaxyType | null
  collisionActive: boolean
  collisionFlash: boolean
  paused: boolean
  totalParticles: number

  addGalaxy: (type: GalaxyType, position: [number, number, number], rotationSpeed?: number, particleCount?: number) => void
  removeGalaxy: (id: string) => void
  selectGalaxy: (id: string) => void
  deselectGalaxy: (id: string) => void
  clearSelection: () => void
  updateParams: (params: Partial<SimulationParams>) => void
  setPlacementMode: (mode: GalaxyType | null) => void
  startCollision: (ids: [string, string]) => void
  endCollision: () => void
  triggerFlash: () => void
  clearFlash: () => void
  togglePause: () => void
  updateGalaxyParticleData: (galaxyId: string, particles: typeof Galaxy extends { particles: infer P } ? P : never) => void
  setGalaxies: (galaxies: Galaxy[]) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  galaxies: [],
  selectedGalaxyIds: [],
  params: { ...DEFAULT_SIMULATION_PARAMS },
  placementMode: null,
  collisionActive: false,
  collisionFlash: false,
  paused: false,
  totalParticles: 0,

  addGalaxy: (type, position, rotationSpeed, particleCount) => {
    const galaxy = createGalaxy(type, position, rotationSpeed, particleCount)
    set(state => {
      const galaxies = [...state.galaxies, galaxy]
      return {
        galaxies,
        totalParticles: galaxies.reduce((s, g) => s + g.particleCount, 0),
      }
    })
    return
  },

  removeGalaxy: (id) => {
    set(state => {
      const galaxies = state.galaxies.filter(g => g.id !== id)
      return {
        galaxies,
        selectedGalaxyIds: state.selectedGalaxyIds.filter(sid => sid !== id),
        totalParticles: galaxies.reduce((s, g) => s + g.particleCount, 0),
      }
    })
  },

  selectGalaxy: (id) => {
    set(state => {
      const ids = state.selectedGalaxyIds.includes(id)
        ? state.selectedGalaxyIds
        : [...state.selectedGalaxyIds, id].slice(-2)
      return { selectedGalaxyIds: ids }
    })
  },

  deselectGalaxy: (id) => {
    set(state => ({
      selectedGalaxyIds: state.selectedGalaxyIds.filter(sid => sid !== id),
    }))
  },

  clearSelection: () => set({ selectedGalaxyIds: [] }),

  updateParams: (params) => {
    set(state => ({
      params: { ...state.params, ...params },
    }))
  },

  setPlacementMode: (mode) => set({ placementMode: mode }),

  startCollision: (ids) => {
    set({ collisionActive: true, selectedGalaxyIds: ids })
  },

  endCollision: () => set({ collisionActive: false }),

  triggerFlash: () => set({ collisionFlash: true }),

  clearFlash: () => set({ collisionFlash: false }),

  togglePause: () => set(state => ({ paused: !state.paused })),

  updateGalaxyParticleData: (galaxyId, particles) => {
    set(state => ({
      galaxies: state.galaxies.map(g =>
        g.id === galaxyId ? { ...g, particles } : g
      ),
    }))
  },

  setGalaxies: (galaxies) => {
    set({
      galaxies,
      totalParticles: galaxies.reduce((s, g) => s + g.particleCount, 0),
    })
  },
}))
