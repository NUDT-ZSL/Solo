export interface Resonance {
  id: string
  bottleId: string
  description: string
  emoji: string
  authorId: string
  createdAt: string
}

export interface ScentBottle {
  id: string
  description: string
  emoji: string
  category: string
  authorId: string
  resonances: Resonance[]
  resonanceCount: number
  createdAt: string
}

export interface UserProfile {
  id: string
  publishedBottles: ScentBottle[]
  resonatedBottles: ScentBottle[]
  totalPublished: number
  totalResonated: number
  topCategory: string
}

export const API_BASE = "http://localhost:8000/api"

export const CATEGORIES = ["自然", "食物", "生活", "书卷", "花香", "木质", "雨露", "烟火"] as const

export const EMOJI_OPTIONS = [
  "🌧️", "🥐", "📖", "🌸", "🪵", "🔥", "⛈️", "💜",
  "✨", "🌿", "💫", "🍃", "🌾", "🕯️", "🫧", "🍂",
  "☕", "🌊", "🌙", "🧴", "🎵", "🌺", "🍊", "🪷",
  "🏔️", "🍄", "🌾", "🧺", "🫖", "🎆", "🪻", "🧊",
] as const
