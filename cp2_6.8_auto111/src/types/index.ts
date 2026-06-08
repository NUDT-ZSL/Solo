export type RetroType = 'good' | 'improve' | 'action'

export interface RetroItem {
  id: string
  type: RetroType
  content: string
  created_at: string
  order: number
}

export interface WordFreq {
  text: string
  value: number
}

export interface SentimentStats {
  positive: number
  neutral: number
  negative: number
}

export interface RetroResponse {
  items: RetroItem[]
  word_freq: WordFreq[]
  sentiment: SentimentStats
}
