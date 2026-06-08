import { create } from 'zustand'

export type OreType = 'copper' | 'iron' | 'crystal' | 'mithril'
export type FuelType = 'coal' | 'lavaCoal' | 'spiritFlame'
export type AlloyType = 'bronze' | 'steel' | 'crystalAlloy' | 'arcaneMetal'

export interface ForgeInstance {
  id: string
  level: number
  position: { x: number; y: number }
  status: 'idle' | 'smelting' | 'upgrading'
  smeltingProgress: number
  activeRecipe: string | null
}

export interface Recipe {
  id: string
  name: string
  requiredOres: Partial<Record<OreType, number>>
  requiredFuel: Partial<Record<FuelType, number>>
  output: { type: AlloyType; amount: number }
  duration: number
  requiredTech?: string
}

export interface Technology {
  id: string
  name: string
  description: string
  cost: { coins: number; alloys?: Partial<Record<AlloyType, number>> }
  unlocked: boolean
  tier: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  type: 'spark' | 'flame' | 'steam' | 'glow' | 'fragment'
}

export const ORE_COLORS: Record<OreType, string> = {
  copper: '#B87333',
  iron: '#71797E',
  crystal: '#9B59B6',
  mithril: '#00CED1',
}

export const ORE_NAMES: Record<OreType, string> = {
  copper: '铜矿',
  iron: '铁矿',
  crystal: '水晶',
  mithril: '秘银矿',
}

export const FUEL_COLORS: Record<FuelType, string> = {
  coal: '#FF4500',
  lavaCoal: '#FF6B35',
  spiritFlame: '#7B68EE',
}

export const FUEL_NAMES: Record<FuelType, string> = {
  coal: '煤块',
  lavaCoal: '熔岩煤',
  spiritFlame: '灵焰',
}

export const ALLOY_NAMES: Record<AlloyType, string> = {
  bronze: '青铜',
  steel: '钢铁',
  crystalAlloy: '水晶合金',
  arcaneMetal: '奥术金属',
}

export const ALLOY_COLORS: Record<AlloyType, string> = {
  bronze: '#CD7F32',
  steel: '#C0C0C0',
  crystalAlloy: '#E0B0FF',
  arcaneMetal: '#00FF7F',
}

export const RECIPES: Recipe[] = [
  {
    id: 'bronze',
    name: '炼制青铜',
    requiredOres: { copper: 3 },
    requiredFuel: { coal: 2 },
    output: { type: 'bronze', amount: 1 },
    duration: 5000,
  },
  {
    id: 'steel',
    name: '炼制钢铁',
    requiredOres: { iron: 3 },
    requiredFuel: { coal: 3 },
    output: { type: 'steel', amount: 1 },
    duration: 8000,
    requiredTech: 'basicSmelting',
  },
  {
    id: 'crystalAlloy',
    name: '炼制水晶合金',
    requiredOres: { crystal: 2, iron: 1 },
    requiredFuel: { lavaCoal: 2 },
    output: { type: 'crystalAlloy', amount: 1 },
    duration: 12000,
    requiredTech: 'crystalRefining',
  },
  {
    id: 'arcaneMetal',
    name: '炼制奥术金属',
    requiredOres: { mithril: 2, crystal: 1 },
    requiredFuel: { spiritFlame: 2 },
    output: { type: 'arcaneMetal', amount: 1 },
    duration: 18000,
    requiredTech: 'arcaneForging',
  },
]

export const TECHNOLOGIES: Technology[] = [
  {
    id: 'basicSmelting',
    name: '基础冶炼',
    description: '解锁钢铁炼制配方',
    cost: { coins: 50, alloys: { bronze: 2 } },
    unlocked: false,
    tier: 1,
  },
  {
    id: 'crystalRefining',
    name: '水晶精炼',
    description: '解锁水晶合金炼制配方',
    cost: { coins: 150, alloys: { steel: 3 } },
    unlocked: false,
    tier: 2,
  },
  {
    id: 'arcaneForging',
    name: '奥术锻造',
    description: '解锁奥术金属炼制配方',
    cost: { coins: 500, alloys: { crystalAlloy: 3 } },
    unlocked: false,
    tier: 3,
  },
  {
    id: 'forgeUpgrade2',
    name: '熔炉强化 II',
    description: '熔炉炼制速度提升50%',
    cost: { coins: 100, alloys: { bronze: 5 } },
    unlocked: false,
    tier: 1,
  },
  {
    id: 'forgeUpgrade3',
    name: '熔炉强化 III',
    description: '熔炉炼制速度提升100%',
    cost: { coins: 300, alloys: { steel: 5 } },
    unlocked: false,
    tier: 2,
  },
]

interface GameState {
  resources: {
    coins: number
    ores: Record<OreType, number>
    fuels: Record<FuelType, number>
    alloys: Record<AlloyType, number>
  }
  forges: ForgeInstance[]
  technologies: Record<string, boolean>
  selectedForgeId: string | null
  selectedRecipeId: string | null
  buildingForge: boolean
  completionEffects: { forgeId: string; time: number }[]

  gatherOre: (ore: OreType) => void
  gatherFuel: (fuel: FuelType) => void
  buildForge: (x: number, y: number) => void
  upgradeForge: (id: string) => void
  selectForge: (id: string | null) => void
  selectRecipe: (id: string | null) => void
  startSmelting: (forgeId: string, recipeId: string) => void
  updateSmelting: (deltaMs: number) => void
  unlockTech: (techId: string) => void
  setBuildingForge: (val: boolean) => void
  addCompletionEffect: (forgeId: string) => void
  removeCompletionEffect: (forgeId: string) => void
  sellAlloy: (alloy: AlloyType) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  resources: {
    coins: 100,
    ores: { copper: 10, iron: 5, crystal: 0, mithril: 0 },
    fuels: { coal: 10, lavaCoal: 0, spiritFlame: 0 },
    alloys: { bronze: 0, steel: 0, crystalAlloy: 0, arcaneMetal: 0 },
  },
  forges: [],
  technologies: {},
  selectedForgeId: null,
  selectedRecipeId: null,
  buildingForge: false,
  completionEffects: [],

  gatherOre: (ore) =>
    set((s) => ({
      resources: {
        ...s.resources,
        ores: { ...s.resources.ores, [ore]: s.resources.ores[ore] + 1 },
      },
    })),

  gatherFuel: (fuel) =>
    set((s) => ({
      resources: {
        ...s.resources,
        fuels: { ...s.resources.fuels, [fuel]: s.resources.fuels[fuel] + 1 },
      },
    })),

  buildForge: (x, y) => {
    const s = get()
    if (s.resources.coins < 30) return
    const id = `forge_${Date.now()}`
    set((s) => ({
      resources: { ...s.resources, coins: s.resources.coins - 30 },
      forges: [
        ...s.forges,
        { id, level: 1, position: { x, y }, status: 'idle', smeltingProgress: 0, activeRecipe: null },
      ],
      buildingForge: false,
    }))
  },

  upgradeForge: (id) => {
    const s = get()
    const forge = s.forges.find((f) => f.id === id)
    if (!forge || forge.status !== 'idle') return
    const cost = forge.level * 50
    if (s.resources.coins < cost) return
    set((s) => ({
      resources: { ...s.resources, coins: s.resources.coins - cost },
      forges: s.forges.map((f) =>
        f.id === id ? { ...f, level: f.level + 1, status: 'upgrading' as const } : f
      ),
    }))
    setTimeout(() => {
      set((s) => ({
        forges: s.forges.map((f) =>
          f.id === id ? { ...f, status: 'idle' as const } : f
        ),
      }))
    }, 2000)
  },

  selectForge: (id) => set({ selectedForgeId: id }),
  selectRecipe: (id) => set({ selectedRecipeId: id }),

  startSmelting: (forgeId, recipeId) => {
    const s = get()
    const forge = s.forges.find((f) => f.id === forgeId)
    const recipe = RECIPES.find((r) => r.id === recipeId)
    if (!forge || !recipe || forge.status !== 'idle') return
    if (recipe.requiredTech && !s.technologies[recipe.requiredTech]) return

    const newOres = { ...s.resources.ores }
    const newFuels = { ...s.resources.fuels }
    for (const [ore, amt] of Object.entries(recipe.requiredOres)) {
      if ((newOres[ore as OreType] ?? 0) < amt) return
      newOres[ore as OreType] -= amt
    }
    for (const [fuel, amt] of Object.entries(recipe.requiredFuel)) {
      if ((newFuels[fuel as FuelType] ?? 0) < amt) return
      newFuels[fuel as FuelType] -= amt
    }

    set((s) => ({
      resources: { ...s.resources, ores: newOres, fuels: newFuels },
      forges: s.forges.map((f) =>
        f.id === forgeId
          ? { ...f, status: 'smelting' as const, smeltingProgress: 0, activeRecipe: recipeId }
          : f
      ),
      selectedRecipeId: null,
    }))
  },

  updateSmelting: (deltaMs) => {
    const s = get()
    let changed = false
    const newForges = s.forges.map((f) => {
      if (f.status !== 'smelting') return f
      const recipe = RECIPES.find((r) => r.id === f.activeRecipe)
      if (!recipe) return f
      const speedMultiplier = 1 + (s.technologies['forgeUpgrade2'] ? 0.5 : 0) + (s.technologies['forgeUpgrade3'] ? 0.5 : 0)
      const newProgress = f.smeltingProgress + (deltaMs * speedMultiplier) / recipe.duration
      changed = true
      if (newProgress >= 1) {
        return { ...f, status: 'idle' as const, smeltingProgress: 0, activeRecipe: null }
      }
      return { ...f, smeltingProgress: newProgress }
    })

    if (!changed) return

    const completedForges = s.forges.filter(
      (f, i) => f.status === 'smelting' && newForges[i].status === 'idle'
    )

    const newAlloys = { ...s.resources.alloys }
    const newCoins = { ...s.resources, coins: s.resources.coins }
    for (const f of completedForges) {
      const recipe = RECIPES.find((r) => r.id === f.activeRecipe)
      if (recipe) {
        newAlloys[recipe.output.type] = (newAlloys[recipe.output.type] ?? 0) + recipe.output.amount
      }
    }

    set({
      forges: newForges,
      resources: { ...newCoins, alloys: newAlloys },
      completionEffects: [
        ...s.completionEffects,
        ...completedForges.map((f) => ({ forgeId: f.id, time: Date.now() })),
      ],
    })
  },

  unlockTech: (techId) => {
    const s = get()
    const tech = TECHNOLOGIES.find((t) => t.id === techId)
    if (!tech || s.technologies[techId]) return
    if (s.resources.coins < tech.cost.coins) return
    if (tech.cost.alloys) {
      for (const [alloy, amt] of Object.entries(tech.cost.alloys)) {
        if ((s.resources.alloys[alloy as AlloyType] ?? 0) < amt) return
      }
    }

    const newAlloys = { ...s.resources.alloys }
    if (tech.cost.alloys) {
      for (const [alloy, amt] of Object.entries(tech.cost.alloys)) {
        newAlloys[alloy as AlloyType] -= amt
      }
    }

    set((s) => ({
      resources: { ...s.resources, coins: s.resources.coins - tech.cost.coins, alloys: newAlloys },
      technologies: { ...s.technologies, [techId]: true },
    }))
  },

  setBuildingForge: (val) => set({ buildingForge: val }),

  addCompletionEffect: (forgeId) =>
    set((s) => ({
      completionEffects: [...s.completionEffects, { forgeId, time: Date.now() }],
    })),

  removeCompletionEffect: (forgeId) =>
    set((s) => ({
      completionEffects: s.completionEffects.filter((e) => e.forgeId !== forgeId),
    })),

  sellAlloy: (alloy) =>
    set((s) => {
      if (s.resources.alloys[alloy] <= 0) return s
      const prices: Record<AlloyType, number> = {
        bronze: 15,
        steel: 30,
        crystalAlloy: 60,
        arcaneMetal: 120,
      }
      return {
        resources: {
          ...s.resources,
          alloys: { ...s.resources.alloys, [alloy]: s.resources.alloys[alloy] - 1 },
          coins: s.resources.coins + prices[alloy],
        },
      }
    }),
}))
