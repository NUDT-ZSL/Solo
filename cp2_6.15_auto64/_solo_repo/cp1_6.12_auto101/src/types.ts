export type StickerKind =
  | 'smile'
  | 'cry'
  | 'fire'
  | 'star'
  | 'heart'
  | 'bomb'
  | 'lightning'
  | 'snowflake'
  | 'question'
  | 'crown'
  | 'bubble'

export interface StickerObject {
  id: string
  kind: StickerKind
  emoji?: string
  text?: string
  color: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  density: number
  restitution: number
  friction: number
  isSquashing: boolean
  squashScaleX: number
  squashScaleY: number
  isRemoving: boolean
  isDragging: boolean
  rotation: number
}

export interface StickerLibraryItem {
  kind: StickerKind
  emoji: string
  name: string
  glowColor: string
  color: string
}

export const STICKER_LIBRARY: StickerLibraryItem[] = [
  { kind: 'smile', emoji: '😊', name: '笑脸', glowColor: '#ffd93d', color: '#ffd93d' },
  { kind: 'cry', emoji: '😢', name: '哭脸', glowColor: '#6ec1e4', color: '#6ec1e4' },
  { kind: 'fire', emoji: '🔥', name: '火焰', glowColor: '#ff6b35', color: '#ff6b35' },
  { kind: 'star', emoji: '⭐', name: '星星', glowColor: '#ffd93d', color: '#ffd93d' },
  { kind: 'heart', emoji: '❤️', name: '爱心', glowColor: '#ff4d6d', color: '#ff4d6d' },
  { kind: 'bomb', emoji: '💣', name: '炸弹', glowColor: '#495057', color: '#495057' },
  { kind: 'lightning', emoji: '⚡', name: '闪电', glowColor: '#ffd60a', color: '#ffd60a' },
  { kind: 'snowflake', emoji: '❄️', name: '雪花', glowColor: '#90e0ef', color: '#90e0ef' },
  { kind: 'question', emoji: '❓', name: '问号', glowColor: '#e63946', color: '#e63946' },
  { kind: 'crown', emoji: '👑', name: '皇冠', glowColor: '#ffb703', color: '#ffb703' },
]
