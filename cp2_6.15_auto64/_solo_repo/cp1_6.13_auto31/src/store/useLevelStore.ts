import { create } from 'zustand'
import {
  type LevelElement,
  type EnemyEntity,
  type PlayerState,
  type ElementType,
  isEnemyElement,
  ELEMENT_DEFAULTS,
  GRID_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SIZE,
} from '@/types'

interface LevelStore {
  elements: LevelElement[]
  selectedId: string | null
  isTestMode: boolean
  player: PlayerState
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean

  addElement: (type: ElementType, x: number, y: number) => void
  removeElement: (id: string) => void
  selectElement: (id: string | null) => void
  updateElement: (id: string, updates: Partial<LevelElement>) => void
  updateEnemy: (id: string, updates: Partial<EnemyEntity>) => void
  setTestMode: (mode: boolean) => void
  resetPlayer: () => void
  updatePlayer: (player: Partial<PlayerState>) => void
  setLeftPanelCollapsed: (collapsed: boolean) => void
  setRightPanelCollapsed: (collapsed: boolean) => void
}

let nextId = 1
function generateId(): string {
  return `el_${nextId++}_${Date.now()}`
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function findSpawnPoint(elements: LevelElement[]): { x: number; y: number } {
  const flag = elements.find(el => el.type === 'flag')
  if (flag) {
    return { x: flag.x, y: flag.y - PLAYER_SIZE }
  }
  const grounds = elements.filter(el => el.type === 'ground')
  if (grounds.length > 0) {
    const first = grounds[0]
    return { x: first.x + first.width / 2 - PLAYER_SIZE / 2, y: first.y - PLAYER_SIZE }
  }
  return { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - PLAYER_SIZE - 40 }
}

const defaultPlayer: PlayerState = {
  x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
  y: CANVAS_HEIGHT - PLAYER_SIZE - 40,
  velocityX: 0,
  velocityY: 0,
  isGrounded: false,
  isDead: false,
  deathTimer: 0,
}

export const useLevelStore = create<LevelStore>((set, get) => ({
  elements: [],
  selectedId: null,
  isTestMode: false,
  player: { ...defaultPlayer },
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,

  addElement: (type: ElementType, centerX: number, centerY: number) => {
    const defaults = ELEMENT_DEFAULTS[type]
    const leftX = centerX - defaults.width / 2
    const topY = centerY - defaults.height / 2
    const snappedX = snapToGrid(leftX)
    const snappedY = snapToGrid(topY)
    const id = generateId()

    if (type === 'slime' || type === 'dragon') {
      const enemy: EnemyEntity = {
        id,
        type,
        x: snappedX,
        y: snappedY,
        width: defaults.width,
        height: defaults.height,
        enemyType: type as 'slime' | 'dragon',
        speed: 1.0,
        patrolInterval: 2,
        pathPoints: [
          { x: snappedX, y: snappedY },
          { x: snapToGrid(leftX + 120), y: snappedY },
        ],
      }
      set(state => ({ elements: [...state.elements, enemy] }))
    } else {
      const element: LevelElement = {
        id,
        type,
        x: snappedX,
        y: snappedY,
        width: defaults.width,
        height: defaults.height,
      }
      set(state => ({ elements: [...state.elements, element] }))
    }
  },

  removeElement: (id: string) => {
    set(state => ({
      elements: state.elements.filter(el => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },

  selectElement: (id: string | null) => {
    set({ selectedId: id })
  },

  updateElement: (id: string, updates: Partial<LevelElement>) => {
    set(state => ({
      elements: state.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }))
  },

  updateEnemy: (id: string, updates: Partial<EnemyEntity>) => {
    set(state => ({
      elements: state.elements.map(el => {
        if (el.id !== id) return el
        if (!isEnemyElement(el)) return el
        return { ...el, ...updates }
      }),
    }))
  },

  setTestMode: (mode: boolean) => {
    if (mode) {
      const spawn = findSpawnPoint(get().elements)
      set({
        isTestMode: true,
        player: {
          x: spawn.x,
          y: spawn.y,
          velocityX: 0,
          velocityY: 0,
          isGrounded: false,
          isDead: false,
          deathTimer: 0,
        },
        selectedId: null,
      })
    } else {
      set({ isTestMode: false })
    }
  },

  resetPlayer: () => {
    const spawn = findSpawnPoint(get().elements)
    set({
      player: {
        x: spawn.x,
        y: spawn.y,
        velocityX: 0,
        velocityY: 0,
        isGrounded: false,
        isDead: false,
        deathTimer: 0,
      },
    })
  },

  updatePlayer: (updates: Partial<PlayerState>) => {
    set(state => ({
      player: { ...state.player, ...updates },
    }))
  },

  setLeftPanelCollapsed: (collapsed: boolean) => {
    set({ leftPanelCollapsed: collapsed })
  },

  setRightPanelCollapsed: (collapsed: boolean) => {
    set({ rightPanelCollapsed: collapsed })
  },
}))
