export interface Memo {
  id: number
  lng: number
  lat: number
  content: string
  timestamp: number
}

export interface DisplayMemo extends Memo {
  readonly opacity: number
}

export interface MemoInput {
  lng: number
  lat: number
  content: string
  timestamp: number
}

export type DateRange = '7days' | '30days' | 'all'

export function toDisplayMemo(memo: Memo, opacity: number = 1): DisplayMemo {
  return { ...memo, opacity }
}

export function toBaseMemo(displayMemo: DisplayMemo): Memo {
  const { opacity: _opacity, ...base } = displayMemo
  return base
}
