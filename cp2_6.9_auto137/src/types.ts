export interface TagPosition {
  x: number
  y: number
  z: number
}

export interface Tag {
  id: string
  text: string
  color: string
  votes: number
  position: TagPosition
}

export type WSMessage =
  | { type: 'tags'; data: Tag[] }
  | { type: 'add'; data: Tag }
  | { type: 'delete'; data: string }
  | { type: 'vote'; data: { id: string; votes: number } }
  | { type: 'clear' }
