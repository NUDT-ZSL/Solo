export interface Card {
  id: string
  name: string
  category: 'science' | 'history' | 'literature' | 'art'
  shortDef: string
  detail: string
  relatedIds: string[]
  quizQuestion: string
  quizAnswer: string
  quizExplanation: string
}

export interface Connection {
  source: string
  target: string
}

export interface GraphNode {
  id: string
  name: string
  category: string
  x: number
  y: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: Connection[]
}

export interface Quiz {
  cardId: string
  question: string
  hint: string
}

export interface AnswerResult {
  correct: boolean
  correctAnswer: string
  explanation: string
}

export interface LearningProgress {
  totalCards: number
  learnedCards: number
  correctRate: number
}

export const CATEGORY_COLORS: Record<string, string> = {
  science: '#4fc3f7',
  history: '#ff8a65',
  literature: '#aed581',
  art: '#ba68c8',
}

export const CATEGORY_LABELS: Record<string, string> = {
  science: '科学',
  history: '历史',
  literature: '文学',
  art: '艺术',
}
