import { create } from 'zustand'
import {
  type StrokeData,
  type WSMessage,
  generateRegionId,
  generateUserId,
  generateSeed,
  getStrokeDescription,
} from '@/utils/canvasUtils'

interface Activity {
  text: string
  timestamp: number
}

interface CanvasState {
  regionId: string
  regionSeed: number
  brightness: number
  likeCount: number
  strokes: StrokeData[]
  brushColor: string
  brushSize: number
  glowMode: boolean
  isDrawing: boolean
  currentStrokePoints: { x: number; y: number; timestamp: number }[]
  onlineCount: number
  activities: Activity[]
  userId: string
  ws: WebSocket | null
  connected: boolean

  setRegion: (regionId: string, seed: number, strokes: StrokeData[], likeCount: number, brightness: number) => void
  setBrushColor: (color: string) => void
  setBrushSize: (size: number) => void
  setGlowMode: (on: boolean) => void
  startDrawing: (x: number, y: number) => void
  continueDrawing: (x: number, y: number) => void
  finishDrawing: () => void
  addRemoteStroke: (stroke: StrokeData) => void
  setOnlineCount: (count: number) => void
  addActivity: (text: string) => void
  discoverNewRegion: () => void
  likeRegion: () => void
  updateBrightness: (brightness: number, likeCount: number) => void
  connectWS: () => void
  disconnectWS: () => void
}

const BRUSH_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF7F50', '#87CEEB',
  '#FF69B4', '#32CD32', '#FF9AA2', '#B5EAD7',
]

export { BRUSH_COLORS }

export const useCanvasStore = create<CanvasState>((set, get) => ({
  regionId: generateRegionId(),
  regionSeed: generateSeed(),
  brightness: 1,
  likeCount: 0,
  strokes: [],
  brushColor: '#FF7F50',
  brushSize: 4,
  glowMode: false,
  isDrawing: false,
  currentStrokePoints: [],
  onlineCount: 1,
  activities: [],
  userId: generateUserId(),
  ws: null,
  connected: false,

  setRegion: (regionId, seed, strokes, likeCount, brightness) => {
    set({
      regionId,
      regionSeed: seed,
      strokes,
      likeCount,
      brightness,
    })
  },

  setBrushColor: (color) => set({ brushColor: color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setGlowMode: (on) => set({ glowMode: on }),

  startDrawing: (x, y) => {
    set({
      isDrawing: true,
      currentStrokePoints: [{ x, y, timestamp: Date.now() }],
    })
  },

  continueDrawing: (x, y) => {
    const state = get()
    if (!state.isDrawing) return
    set({
      currentStrokePoints: [...state.currentStrokePoints, { x, y, timestamp: Date.now() }],
    })
  },

  finishDrawing: () => {
    const state = get()
    if (!state.isDrawing) return

    if (state.currentStrokePoints.length >= 2) {
      const stroke: StrokeData = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        regionId: state.regionId,
        points: state.currentStrokePoints,
        color: state.brushColor,
        size: state.brushSize,
        glow: state.glowMode,
        userId: state.userId,
        timestamp: Date.now(),
      }

      set({
        strokes: [...state.strokes, stroke],
        isDrawing: false,
        currentStrokePoints: [],
      })

      const ws = state.ws
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg: WSMessage = { type: 'stroke', payload: stroke }
        ws.send(JSON.stringify(msg))
      }

      const colorName = getStrokeDescription(stroke.color)
      const activityText = `匿名用户画了一道${colorName}`
      get().addActivity(activityText)
    } else {
      set({ isDrawing: false, currentStrokePoints: [] })
    }
  },

  addRemoteStroke: (stroke) => {
    set((state) => {
      if (stroke.regionId !== state.regionId) return state
      return { strokes: [...state.strokes, stroke] }
    })
  },

  setOnlineCount: (count) => set({ onlineCount: count }),

  addActivity: (text) => {
    set((state) => ({
      activities: [{ text, timestamp: Date.now() }, ...state.activities].slice(0, 8),
    }))
  },

  discoverNewRegion: () => {
    const state = get()
    const newRegionId = generateRegionId()
    const newSeed = generateSeed()
    set({
      regionId: newRegionId,
      regionSeed: newSeed,
      strokes: [],
      brightness: 1,
      likeCount: 0,
    })
    get().addActivity('匿名用户发现了一座新岛屿')

    const ws = state.ws
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg: WSMessage = { type: 'discover', payload: { regionId: newRegionId } }
      ws.send(JSON.stringify(msg))
    }
  },

  likeRegion: () => {
    const state = get()
    const ws = state.ws
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg: WSMessage = { type: 'like', payload: { regionId: state.regionId } }
      ws.send(JSON.stringify(msg))
    }
    get().addActivity('匿名用户点亮了这片区域')
  },

  updateBrightness: (brightness, likeCount) => {
    set({ brightness, likeCount })
  },

  connectWS: () => {
    const state = get()
    if (state.ws) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:3001`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      set({ connected: true })
      const initMsg: WSMessage = {
        type: 'discover',
        payload: { regionId: state.regionId },
      }
      ws.send(JSON.stringify(initMsg))
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        switch (msg.type) {
          case 'stroke':
            get().addRemoteStroke(msg.payload)
            break
          case 'online_count':
            get().setOnlineCount(msg.payload.count)
            break
          case 'activity':
            get().addActivity(msg.payload.text)
            break
          case 'region_update':
            get().updateBrightness(msg.payload.brightness, msg.payload.likeCount)
            break
          case 'strokes_sync':
            if (msg.payload.regionId === get().regionId) {
              set({ strokes: msg.payload.strokes })
            }
            break
          case 'init':
            get().setRegion(
              msg.payload.regionId,
              msg.payload.seed,
              msg.payload.strokes,
              msg.payload.likeCount,
              msg.payload.brightness
            )
            break
        }
      } catch (e) {
        console.error('Failed to parse WS message', e)
      }
    }

    ws.onclose = () => {
      set({ connected: false, ws: null })
      setTimeout(() => {
        if (!get().ws) get().connectWS()
      }, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    set({ ws })
  },

  disconnectWS: () => {
    const ws = get().ws
    if (ws) {
      ws.onclose = null
      ws.close()
      set({ ws: null, connected: false })
    }
  },
}))
