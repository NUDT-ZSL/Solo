import { create } from 'zustand'

export type BottleStyle = 1 | 2 | 3 | 4 | 5 | 6

export interface Wish {
  id: string
  content: string
  style: BottleStyle
  created_at: string
  light_count: number
}

export interface BottleRenderData {
  id: string
  x: number
  y: number
  baseX: number
  baseY: number
  rotation: number
  scale: number
  style: BottleStyle
  content: string
  lightCount: number
  glowIntensity: number
  floatOffset: number
  floatSpeed: number
  floatAmplitude: number
  rotationSpeed: number
  driftSpeedX: number
  driftSpeedY: number
  isLit: boolean
  litGlowDecay: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: 'splash' | 'sparkle' | 'star'
}

export interface StarFlightData {
  startX: number
  startY: number
  endX: number
  endY: number
  progress: number
  wishId: string
}

export const BOTTLE_COLORS: Record<BottleStyle, string> = {
  1: '#FF6B8A',
  2: '#4FC3F7',
  3: '#00E5A0',
  4: '#FF8A50',
  5: '#C0C8D8',
  6: '#B388FF',
}

export const BOTTLE_NAMES: Record<BottleStyle, string> = {
  1: '珊瑚粉·圆肚瓶',
  2: '海蓝·细长瓶',
  3: '宝石绿·方肩瓶',
  4: '日落橙·葫芦瓶',
  5: '月光银·三角瓶',
  6: '星夜紫·水滴瓶',
}

const API_BASE = '/api'

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function createBottleRenderData(wish: Wish, canvasW: number, canvasH: number): BottleRenderData {
  const padding = 80
  const x = randomBetween(padding, canvasW - padding)
  const y = randomBetween(padding, canvasH - padding - 60)
  return {
    id: wish.id,
    x,
    y,
    baseX: x,
    baseY: y,
    rotation: randomBetween(-0.3, 0.3),
    scale: 1,
    style: wish.style,
    content: wish.content,
    lightCount: wish.light_count,
    glowIntensity: randomBetween(0.4, 0.8),
    floatOffset: randomBetween(0, Math.PI * 2),
    floatSpeed: randomBetween(0.3, 0.8),
    floatAmplitude: randomBetween(8, 20),
    rotationSpeed: randomBetween(-0.1, 0.1),
    driftSpeedX: randomBetween(-0.15, 0.15),
    driftSpeedY: randomBetween(-0.1, 0.1),
    isLit: false,
    litGlowDecay: 0,
  }
}

interface BottleStore {
  bottles: BottleRenderData[]
  particles: Particle[]
  starFlights: StarFlightData[]
  hoveredBottleId: string | null
  selectedWish: Wish | null
  showCard: boolean
  showInputPanel: boolean
  activeTab: 'ocean' | 'leaderboard'
  canvasWidth: number
  canvasHeight: number
  loading: boolean

  setCanvasSize: (w: number, h: number) => void
  fetchWishes: () => Promise<void>
  submitWish: (content: string, style: BottleStyle) => Promise<void>
  lightWish: (wishId: string, cardCenterX: number, cardCenterY: number) => Promise<void>
  setHoveredBottle: (id: string | null) => void
  setSelectedWish: (wish: Wish | null) => void
  setShowCard: (show: boolean) => void
  setShowInputPanel: (show: boolean) => void
  setActiveTab: (tab: 'ocean' | 'leaderboard') => void
  spawnBreakParticles: (x: number, y: number, style: BottleStyle) => void
  updateBottlePositions: (deltaTime: number) => void
  updateParticles: (deltaTime: number) => void
  updateStarFlights: (deltaTime: number) => void
  repositionBottles: () => void
}

export const useBottleStore = create<BottleStore>((set, get) => ({
  bottles: [],
  particles: [],
  starFlights: [],
  hoveredBottleId: null,
  selectedWish: null,
  showCard: false,
  showInputPanel: false,
  activeTab: 'ocean',
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  loading: false,

  setCanvasSize: (w, h) => set({ canvasWidth: w, canvasHeight: h }),

  fetchWishes: async () => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_BASE}/wishes`)
      const wishes: Wish[] = await res.json()
      const { canvasWidth, canvasHeight, bottles } = get()
      const existingIds = new Set(bottles.map(b => b.id))
      const newBottles = wishes
        .filter(w => !existingIds.has(w.id))
        .map(w => createBottleRenderData(w, canvasWidth, canvasHeight))
      const updatedBottles = bottles.map(b => {
        const wish = wishes.find(w => w.id === b.id)
        if (wish) {
          return { ...b, lightCount: wish.light_count }
        }
        return b
      })
      set({ bottles: [...updatedBottles, ...newBottles], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  submitWish: async (content, style) => {
    try {
      const res = await fetch(`${API_BASE}/wishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, style }),
      })
      const wish: Wish = await res.json()
      const { canvasWidth, canvasHeight } = get()
      const newBottle = createBottleRenderData(wish, canvasWidth, canvasHeight)
      set(state => ({ bottles: [...state.bottles, newBottle] }))
    } catch {
      // silent fail
    }
  },

  lightWish: async (wishId, cardCenterX, cardCenterY) => {
    try {
      const res = await fetch(`${API_BASE}/wishes/${wishId}/light`, { method: 'POST' })
      const updated: Wish = await res.json()
      const bottle = get().bottles.find(b => b.id === wishId)
      if (bottle) {
        set(state => ({
          bottles: state.bottles.map(b =>
            b.id === wishId
              ? { ...b, lightCount: updated.light_count, isLit: true, litGlowDecay: 1 }
              : b
          ),
          starFlights: [
            ...state.starFlights,
            {
              startX: cardCenterX,
              startY: cardCenterY,
              endX: bottle.x,
              endY: bottle.y,
              progress: 0,
              wishId,
            },
          ],
          selectedWish: state.selectedWish
            ? { ...state.selectedWish, light_count: updated.light_count }
            : null,
        }))
      }
    } catch {
      // silent fail
    }
  },

  setHoveredBottle: (id) => set({ hoveredBottleId: id }),
  setSelectedWish: (wish) => set({ selectedWish: wish }),
  setShowCard: (show) => set({ showCard: show }),
  setShowInputPanel: (show) => set({ showInputPanel: show }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  spawnBreakParticles: (x, y, style) => {
    const color = BOTTLE_COLORS[style]
    const newParticles: Particle[] = []
    for (let i = 0; i < 20; i++) {
      const angle = randomBetween(0, Math.PI * 2)
      const speed = randomBetween(1, 4)
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: randomBetween(0.6, 1.2),
        color,
        size: randomBetween(2, 5),
        type: 'splash',
      })
    }
    for (let i = 0; i < 12; i++) {
      const angle = randomBetween(0, Math.PI * 2)
      const speed = randomBetween(2, 6)
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: randomBetween(0.8, 1.5),
        color: '#ffffff',
        size: randomBetween(1, 3),
        type: 'sparkle',
      })
    }
    set(state => ({ particles: [...state.particles, ...newParticles] }))
  },

  updateBottlePositions: (deltaTime) => {
    const { canvasWidth, canvasHeight } = get()
    set(state => ({
      bottles: state.bottles.map(b => {
        const dt = deltaTime / 1000
        let newX = b.baseX + b.driftSpeedX * dt * 60
        let newY = b.baseY + b.driftSpeedY * dt * 60
        if (newX < -60) newX = canvasWidth + 60
        if (newX > canvasWidth + 60) newX = -60
        if (newY < -60) newY = canvasHeight + 60
        if (newY > canvasHeight - 60) newY = -60

        const floatY = Math.sin(Date.now() / 1000 * b.floatSpeed + b.floatOffset) * b.floatAmplitude
        const floatX = Math.cos(Date.now() / 1000 * b.floatSpeed * 0.5 + b.floatOffset) * b.floatAmplitude * 0.3
        const newRotation = b.rotation + b.rotationSpeed * dt
        const breathe = 0.5 + 0.3 * Math.sin(Date.now() / 1000 * 0.8 + b.floatOffset)
        let glow = b.glowIntensity * breathe
        let litDecay = b.litGlowDecay
        if (b.isLit) {
          glow += 0.5 * litDecay
          litDecay = Math.max(0, litDecay - dt * 0.3)
          if (litDecay <= 0) {
            return {
              ...b,
              baseX: newX,
              baseY: newY,
              x: newX + floatX,
              y: newY + floatY,
              rotation: newRotation,
              glowIntensity: glow,
              isLit: false,
              litGlowDecay: 0,
            }
          }
        }
        return {
          ...b,
          baseX: newX,
          baseY: newY,
          x: newX + floatX,
          y: newY + floatY,
          rotation: newRotation,
          glowIntensity: glow,
          litGlowDecay: litDecay,
        }
      }),
    }))
  },

  updateParticles: (deltaTime) => {
    const dt = deltaTime / 1000
    set(state => ({
      particles: state.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx * dt * 60,
          y: p.y + p.vy * dt * 60,
          vy: p.vy + 0.05,
          life: p.life - dt / p.maxLife,
          size: p.size * 0.98,
        }))
        .filter(p => p.life > 0),
    }))
  },

  updateStarFlights: (deltaTime) => {
    const dt = deltaTime / 1000
    set(state => ({
      starFlights: state.starFlights
        .map(sf => ({
          ...sf,
          progress: sf.progress + dt * 1.2,
        }))
        .filter(sf => sf.progress < 1),
    }))
  },

  repositionBottles: () => {
    const { canvasWidth, canvasHeight } = get()
    set(state => ({
      bottles: state.bottles.map(b => {
        const padding = 80
        const x = randomBetween(padding, canvasWidth - padding)
        const y = randomBetween(padding, canvasHeight - padding - 60)
        return { ...b, baseX: x, baseY: y, x, y }
      }),
    }))
  },
}))
