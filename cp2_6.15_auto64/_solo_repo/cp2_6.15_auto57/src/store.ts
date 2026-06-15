import { create } from 'zustand'

export type GamePhase = 'menu' | 'galaxy-select' | 'playing' | 'game-over'
export type GalaxyType = 'safe' | 'medium' | 'dangerous'
export type MineralType = 'iron' | 'copper' | 'crystal'

export interface Minerals {
  iron: number
  copper: number
  crystal: number
}

export interface GameState {
  gamePhase: GamePhase
  selectedGalaxy: GalaxyType
  minerals: Minerals
  totalMinerals: Minerals
  shield: number
  maxShield: number
  engineLevel: number
  shieldLevel: number
  laserLevel: number
  asteroidsDestroyed: number
  experience: number
  upgradePanelOpen: boolean
  upgradeFlash: string | null

  setGamePhase: (phase: GamePhase) => void
  selectGalaxy: (galaxy: GalaxyType) => void
  collectMineral: (type: MineralType, amount?: number) => void
  spendMinerals: (cost: Minerals) => void
  upgradeEngine: () => void
  upgradeShield: () => void
  upgradeLaser: () => void
  setShield: (shield: number) => void
  addAsteroidsDestroyed: (count?: number) => void
  addExperience: (amount: number) => void
  toggleUpgradePanel: () => void
  closeUpgradePanel: () => void
  setUpgradeFlash: (type: string | null) => void
  triggerGameOver: () => void
  restartGame: () => void
  goToMenu: () => void
}

const initialState = {
  gamePhase: 'menu' as GamePhase,
  selectedGalaxy: 'safe' as GalaxyType,
  minerals: { iron: 0, copper: 0, crystal: 0 },
  totalMinerals: { iron: 0, copper: 0, crystal: 0 },
  shield: 100,
  maxShield: 100,
  engineLevel: 1,
  shieldLevel: 1,
  laserLevel: 1,
  asteroidsDestroyed: 0,
  experience: 0,
  upgradePanelOpen: false,
  upgradeFlash: null as string | null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setGamePhase: (phase) => set({ gamePhase: phase }),

  selectGalaxy: (galaxy) => set({
    selectedGalaxy: galaxy,
    gamePhase: 'playing',
    minerals: { iron: 0, copper: 0, crystal: 0 },
    totalMinerals: { iron: 0, copper: 0, crystal: 0 },
    shield: 100,
    maxShield: 100,
    engineLevel: 1,
    shieldLevel: 1,
    laserLevel: 1,
    asteroidsDestroyed: 0,
    experience: 0,
    upgradePanelOpen: false,
    upgradeFlash: null,
  }),

  collectMineral: (type, amount = 1) => set((s) => ({
    minerals: { ...s.minerals, [type]: s.minerals[type] + amount },
    totalMinerals: { ...s.totalMinerals, [type]: s.totalMinerals[type] + amount },
  })),

  spendMinerals: (cost) => set((s) => ({
    minerals: {
      iron: s.minerals.iron - cost.iron,
      copper: s.minerals.copper - cost.copper,
      crystal: s.minerals.crystal - cost.crystal,
    },
  })),

  upgradeEngine: () => {
    const s = get()
    if (s.engineLevel >= 5) return
    set({ engineLevel: s.engineLevel + 1, upgradeFlash: 'engine' })
    setTimeout(() => set({ upgradeFlash: null }), 500)
  },

  upgradeShield: () => {
    const s = get()
    if (s.shieldLevel >= 5) return
    const newLevel = s.shieldLevel + 1
    const newMax = 100 + newLevel * 25
    set({
      shieldLevel: newLevel,
      maxShield: newMax,
      shield: newMax,
      upgradeFlash: 'shield',
    })
    setTimeout(() => set({ upgradeFlash: null }), 500)
  },

  upgradeLaser: () => {
    const s = get()
    if (s.laserLevel >= 5) return
    set({ laserLevel: s.laserLevel + 1, upgradeFlash: 'laser' })
    setTimeout(() => set({ upgradeFlash: null }), 500)
  },

  setShield: (shield) => set({ shield: Math.max(0, shield) }),

  addAsteroidsDestroyed: (count = 1) => set((s) => ({
    asteroidsDestroyed: s.asteroidsDestroyed + count,
  })),

  addExperience: (amount) => set((s) => ({
    experience: s.experience + amount,
  })),

  toggleUpgradePanel: () => set((s) => ({
    upgradePanelOpen: !s.upgradePanelOpen,
  })),

  closeUpgradePanel: () => set({ upgradePanelOpen: false }),

  setUpgradeFlash: (type) => set({ upgradeFlash: type }),

  triggerGameOver: () => set({ gamePhase: 'game-over' }),

  restartGame: () => {
    const galaxy = get().selectedGalaxy
    set({
      ...initialState,
      selectedGalaxy: galaxy,
      gamePhase: 'playing',
    })
  },

  goToMenu: () => set({ ...initialState }),
}))
