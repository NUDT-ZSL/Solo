import { v4 as uuidv4 } from 'uuid'

export interface Card {
  id: string
  source: string
  target: string
  tags: string[]
  example: string
  level: number
  createdAt: number
  nextReviewAt: number
  reviewCount: number
  correctCount: number
}

export type ReviewFeedback = 'remembered' | 'fuzzy' | 'forgotten'

export interface ReviewStats {
  total: number
  correct: number
  startTime: number
  endTime: number
}

const INTERVALS = [1, 2, 4, 8, 16, 32]

export function createCard(source: string, target: string, tags: string[] = [], example: string = ''): Card {
  const now = Date.now()
  return {
    id: uuidv4(),
    source,
    target,
    tags,
    example,
    level: 1,
    createdAt: now,
    nextReviewAt: now + 24 * 60 * 60 * 1000,
    reviewCount: 0,
    correctCount: 0
  }
}

export function updateCard(card: Card, updates: Partial<Pick<Card, 'source' | 'target' | 'tags' | 'example'>>): Card {
  return { ...card, ...updates }
}

export function applyReviewFeedback(card: Card, feedback: ReviewFeedback): Card {
  const now = Date.now()
  let newLevel = card.level
  let intervalDays: number

  switch (feedback) {
    case 'remembered':
      newLevel = Math.min(5, card.level + 1)
      intervalDays = INTERVALS[Math.min(newLevel - 1, INTERVALS.length - 1)]
      break
    case 'fuzzy':
      newLevel = card.level
      intervalDays = 1
      break
    case 'forgotten':
      newLevel = Math.max(1, card.level - 1)
      intervalDays = 1
      break
  }

  return {
    ...card,
    level: newLevel,
    nextReviewAt: now + intervalDays * 24 * 60 * 60 * 1000,
    reviewCount: card.reviewCount + 1,
    correctCount: feedback === 'remembered' ? card.correctCount + 1 : card.correctCount
  }
}

export function isCardDueForReview(card: Card, now: number = Date.now()): boolean {
  return card.nextReviewAt <= now
}

export function getDueCards(cards: Card[]): Card[] {
  return cards.filter(card => isCardDueForReview(card))
}

export function sortCardsByCreatedAt(cards: Card[], ascending: boolean = true): Card[] {
  return [...cards].sort((a, b) => ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
}

export function filterCardsByLevel(cards: Card[], level: number | null): Card[] {
  if (level === null) return cards
  return cards.filter(card => card.level === level)
}

export function getCardsByLevel(cards: Card[]): Record<number, number> {
  const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  cards.forEach(card => {
    result[card.level] = (result[card.level] || 0) + 1
  })
  return result
}

export function getDailyNewCards(cards: Card[], days: number = 7): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(day.getDate() - i)
    const dayStart = day.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const count = cards.filter(card => card.createdAt >= dayStart && card.createdAt < dayEnd).length
    result.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      count
    })
  }
  return result
}

export function getTotalReviewCount(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.reviewCount, 0)
}

export function calculateAccuracy(stats: ReviewStats): number {
  if (stats.total === 0) return 0
  return Math.round((stats.correct / stats.total) * 100)
}
