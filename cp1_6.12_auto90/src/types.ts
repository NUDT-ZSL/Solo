export interface HistoryEntry {
  id: string
  title: string
  url: string
  favicon: string
  timestamp: number
  visitCount: number
  tags: string[]
}

export interface TagCloudItem {
  tag: string
  count: number
  size: number
}

export interface TimeRange {
  start: number
  end: number
}
