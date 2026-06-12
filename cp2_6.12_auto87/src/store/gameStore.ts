import { create } from 'zustand'
import type { Player, Spirit, TerrainType } from '@/types'
import { randomSpirit } from '@/types'

export type Scene = 'explore' | 'tame' | 'battle'

interface EncounterSpirit {
  name: string
  element: Spirit['element']
  skills: Spirit['skills']
  resistance: number
  maxResistance: number
}

interface GameState {
  scene: Scene
  player: Player
  spirits: Spirit[]
  playerPosition: { x: number; y: number }
  mapGrid: TerrainType[][]
  encounterSpirit: EncounterSpirit | null
  battleResult: { result: 'win' | 'lose' | null; expGained: number; unlockedArea: string | null }
  setScene: (scene: Scene) => void
  setPlayer: (player: Player) => void
  updatePlayer: (patch: Partial<Player>) => void
  setSpirits: (spirits: Spirit[]) => void
  addSpirit: (spirit: Spirit) => void
  setPlayerPosition: (x: number, y: number) => void
  setMapGrid: (grid: TerrainType[][]) => void
  setEncounterSpirit: (spirit: EncounterSpirit | null) => void
  triggerEncounter: () => void
  setBattleResult: (r: { result: 'win' | 'lose' | null; expGained: number; unlockedArea: string | null }) => void
}

function generateGrid(): TerrainType[][] {
  const terrains: TerrainType[] = ['forest', 'water', 'volcano', 'grassland']
  const grid: TerrainType[][] = []
  for (let y = 0; y < 8; y++) {
    const row: TerrainType[] = []
    for (let x = 0; x < 8; x++) {
      let terrain: TerrainType
      if (y < 3) terrain = x < 4 ? 'forest' : 'grassland'
      else if (y < 5) terrain = x < 4 ? 'water' : 'grassland'
      else terrain = x < 4 ? 'volcano' : 'forest'
      if (Math.random() < 0.25) {
        terrain = terrains[Math.floor(Math.random() * terrains.length)]
      }
      row.push(terrain)
    }
    grid.push(row)
  }
  return grid
}

export const useGameStore = create<GameState>((set, get) => ({
  scene: 'explore',
  player: {
    id: 'player-1',
    name: '驯养师',
    hp: 100,
    maxHp: 100,
    exp: 0,
    level: 1,
    unlockedAreas: ['forest'],
    createdAt: new Date().toISOString(),
  },
  spirits: [],
  playerPosition: { x: 3, y: 3 },
  mapGrid: generateGrid(),
  encounterSpirit: null,
  battleResult: { result: null, expGained: 0, unlockedArea: null },
  setScene: (scene) => set({ scene }),
  setPlayer: (player) => set({ player }),
  updatePlayer: (patch) => set((s) => ({ player: { ...s.player, ...patch } })),
  setSpirits: (spirits) => set({ spirits }),
  addSpirit: (spirit) => set((s) => ({ spirits: [...s.spirits, spirit] })),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  setMapGrid: (grid) => set({ mapGrid: grid }),
  setEncounterSpirit: (spirit) => set({ encounterSpirit: spirit }),
  triggerEncounter: () => {
    const tmpl = randomSpirit()
    const resistance = 80 + Math.floor(Math.random() * 60)
    set({
      encounterSpirit: {
        name: tmpl.name,
        element: tmpl.element,
        skills: tmpl.skills,
        resistance,
        maxResistance: resistance,
      },
      scene: 'tame',
    })
  },
  setBattleResult: (r) => set({ battleResult: r }),
}))
