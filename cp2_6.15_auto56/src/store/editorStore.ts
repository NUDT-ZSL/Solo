import { create } from 'zustand'
import { Shape, ShapeType, generateId } from '../utils/geometry'

export type Tool = 'select' | 'rect' | 'circle' | 'triangle'

const MAX_HISTORY = 50

interface EditorState {
  shapes: Shape[]
  selectedId: string | null
  currentTool: Tool
  history: Shape[][]
  historyIndex: number
  recentNewId: string | null

  setTool: (tool: Tool) => void
  selectShape: (id: string | null) => void
  addShape: (shape: Omit<Shape, 'id'>) => void
  removeShape: (id: string) => void
  updateShape: (id: string, updates: Partial<Shape>) => void
  updateShapeWithoutHistory: (id: string, updates: Partial<Shape>) => void
  commitHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearRecentNewId: () => void
}

function cloneShapes(shapes: Shape[]): Shape[] {
  return structuredClone(shapes)
}

const defaultColors: Record<ShapeType, string> = {
  rect: '#42a5f5',
  circle: '#66bb6a',
  triangle: '#ffa726',
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: [],
  selectedId: null,
  currentTool: 'select',
  history: [[]],
  historyIndex: 0,
  recentNewId: null,

  setTool: (tool) => set({ currentTool: tool }),

  selectShape: (id) => set({ selectedId: id }),

  addShape: (shape) => {
    const state = get()
    const id = generateId()
    const newShape: Shape = {
      id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      width: Math.max(shape.width, 1),
      height: Math.max(shape.height, 1),
      rotation: shape.rotation ?? 0,
      fill: shape.fill ?? defaultColors[shape.type],
    }
    const newShapes = [...state.shapes, newShape]
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(cloneShapes(newShapes))
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      shapes: newShapes,
      selectedId: id,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      recentNewId: id,
    })
  },

  removeShape: (id) => {
    const state = get()
    const newShapes = state.shapes.filter((s) => s.id !== id)
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(cloneShapes(newShapes))
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      shapes: newShapes,
      selectedId: state.selectedId === id ? null : state.selectedId,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  updateShape: (id, updates) => {
    const state = get()
    const newShapes = state.shapes.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(cloneShapes(newShapes))
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  updateShapeWithoutHistory: (id, updates) => {
    const state = get()
    const newShapes = state.shapes.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
    set({ shapes: newShapes })
  },

  commitHistory: () => {
    const state = get()
    const currentSnapshot = cloneShapes(state.shapes)
    const lastSnapshot = state.history[state.historyIndex]
    if (JSON.stringify(currentSnapshot) === JSON.stringify(lastSnapshot)) {
      return
    }
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(currentSnapshot)
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  undo: () => {
    const state = get()
    if (state.historyIndex <= 0) return
    const newIndex = state.historyIndex - 1
    set({
      shapes: cloneShapes(state.history[newIndex]),
      historyIndex: newIndex,
      selectedId: null,
    })
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return
    const newIndex = state.historyIndex + 1
    set({
      shapes: cloneShapes(state.history[newIndex]),
      historyIndex: newIndex,
      selectedId: null,
    })
  },

  canUndo: () => {
    return get().historyIndex > 0
  },

  canRedo: () => {
    return get().historyIndex < get().history.length - 1
  },

  clearRecentNewId: () => set({ recentNewId: null }),
}))
