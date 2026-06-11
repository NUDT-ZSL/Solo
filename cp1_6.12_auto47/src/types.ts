export interface Memo {
  id: number
  lng: number
  lat: number
  content: string
  timestamp: number
}

export interface MemoInput {
  lng: number
  lat: number
  content: string
  timestamp: number
}

export type DateRange = '7days' | '30days' | 'all'
