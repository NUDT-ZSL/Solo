export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  userId: string
  tool: 'pen' | 'eraser'
  roughness?: number
}

export interface StickyNote {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  userId: string
  zIndex: number
}

export type Tool = 'pen' | 'eraser' | 'sticky' | 'pan'

export interface User {
  id: string
  color: string
  name: string
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

export interface WhiteboardState {
  strokes: Stroke[]
  stickyNotes: StickyNote[]
}

export type ServerEvent =
  | { type: 'stroke:add'; stroke: Stroke }
  | { type: 'stroke:undo'; userId: string; strokeId: string }
  | { type: 'stroke:redo'; userId: string; stroke: Stroke }
  | { type: 'sticky:add'; note: StickyNote }
  | { type: 'sticky:update'; note: StickyNote }
  | { type: 'sticky:delete'; noteId: string }
  | { type: 'init'; state: WhiteboardState; users: User[] }
  | { type: 'user:join'; user: User }
  | { type: 'user:leave'; userId: string }
