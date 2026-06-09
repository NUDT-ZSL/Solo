export interface CardData {
  id: string
  word: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  isHovered: boolean
  scale: number
  glowIntensity: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
  color: string
}

export interface PoemDisplay {
  id: string
  poem: string
  poemId: string
  word1: string
  word2: string
  card1Id: string
  card2Id: string
  x: number
  y: number
  startTime: number
  duration: number
  scale: number
  opacity: number
  voteButtonVisible: boolean
  votes: number
  voted: boolean
  historyId: string
}

export interface HistoryItem {
  id: string
  timestamp: number
  word1: string
  word2: string
  poemId: string
  poem: string
  votes: number
}

export interface CollideResponse {
  success: boolean
  poemId: string
  poem: string
  word1: string
  word2: string
  similarity: number
  templateId: string
  historyId: string
}

export interface VoteResponse {
  success: boolean
  newVoteCount: number
  isTopPoem: boolean
  replacement?: {
    cardId: string
    newWord: string
  }
  error?: string
}
