import { HistoryEntry, TagCloudItem, TimeRange } from './types'
import { mockHistoryData } from './mockData'

class DataStore {
  private entries: HistoryEntry[]

  constructor(initialData: HistoryEntry[]) {
    this.entries = initialData
  }

  getAllEntries(): HistoryEntry[] {
    return this.entries
  }

  filterByTimeRange(range: TimeRange): HistoryEntry[] {
    return this.entries.filter(
      (entry) => entry.timestamp >= range.start && entry.timestamp <= range.end
    )
  }

  filterByTags(entries: HistoryEntry[], tags: string[]): HistoryEntry[] {
    if (tags.length === 0) return entries
    return entries.filter((entry) =>
      tags.some((tag) => entry.tags.includes(tag))
    )
  }

  fuzzySearch(entries: HistoryEntry[], query: string): HistoryEntry[] {
    if (!query.trim()) return entries
    const lowerQuery = query.toLowerCase()
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.url.toLowerCase().includes(lowerQuery)
    )
  }

  getTagCloud(entries: HistoryEntry[]): TagCloudItem[] {
    const tagCount = new Map<string, number>()

    entries.forEach((entry) => {
      entry.tags.forEach((tag) => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
      })
    })

    const tagsArray = Array.from(tagCount.entries()).map(([tag, count]) => ({
      tag,
      count,
      size: 0
    }))

    if (tagsArray.length === 0) return []

    const maxCount = Math.max(...tagsArray.map((t) => t.count))
    const minCount = Math.min(...tagsArray.map((t) => t.count))

    const minFontSize = 12
    const maxFontSize = 28

    tagsArray.forEach((item) => {
      if (maxCount === minCount) {
        item.size = (minFontSize + maxFontSize) / 2
      } else {
        const ratio = (item.count - minCount) / (maxCount - minCount)
        item.size = minFontSize + ratio * (maxFontSize - minFontSize)
      }
    })

    return tagsArray.sort((a, b) => b.count - a.count)
  }

  getHighlightedText(text: string, query: string): { text: string; highlighted: boolean }[] {
    if (!query.trim()) {
      return [{ text, highlighted: false }]
    }

    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const result: { text: string; highlighted: boolean }[] = []
    let lastIndex = 0

    let index = lowerText.indexOf(lowerQuery)
    while (index !== -1) {
      if (index > lastIndex) {
        result.push({
          text: text.substring(lastIndex, index),
          highlighted: false
        })
      }
      result.push({
        text: text.substring(index, index + query.length),
        highlighted: true
      })
      lastIndex = index + query.length
      index = lowerText.indexOf(lowerQuery, lastIndex)
    }

    if (lastIndex < text.length) {
      result.push({
        text: text.substring(lastIndex),
        highlighted: false
      })
    }

    return result
  }
}

export const dataStore = new DataStore(mockHistoryData)

export function getTimeRangeForDays(days: number): TimeRange {
  const now = Date.now()
  const start = now - days * 24 * 60 * 60 * 1000
  return { start, end: now }
}
