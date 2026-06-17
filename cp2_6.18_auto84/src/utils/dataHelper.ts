import type { ScoreRecord, RehearsalSummary } from '../types'

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}年${m}月${d}日`
}

export function calculateAverage(scores: number[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((a, b) => a + b, 0)
  return Math.round(sum / scores.length)
}

export function buildRadarData(latest: ScoreRecord | undefined) {
  if (!latest) return []
  return [
    { subject: '音准', score: latest.pitch, fullMark: 100 },
    { subject: '节奏', score: latest.rhythm, fullMark: 100 },
    { subject: '表现力', score: latest.expression, fullMark: 100 }
  ]
}

export function buildPitchLineData(records: ScoreRecord[]) {
  return records.map(r => ({
    date: formatDate(r.date),
    score: r.pitch
  }))
}

export function buildRhythmLineData(records: ScoreRecord[]) {
  return records.map(r => ({
    date: formatDate(r.date),
    score: r.rhythm
  }))
}

export function buildRehearsalSummaries(records: ScoreRecord[]): RehearsalSummary[] {
  const map = new Map<string, ScoreRecord[]>()
  records.forEach(r => {
    const key = r.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  })
  const result: RehearsalSummary[] = []
  map.forEach((list, date) => {
    const allSongs = Array.from(new Set(list.flatMap(r => r.songs)))
    result.push({
      date,
      songs: allSongs,
      avgPitch: calculateAverage(list.map(r => r.pitch)),
      avgRhythm: calculateAverage(list.map(r => r.rhythm)),
      avgExpression: calculateAverage(list.map(r => r.expression)),
      memberCount: list.length
    })
  })
  result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return result
}

export function filterSummariesByDate(
  summaries: RehearsalSummary[],
  startDate: string,
  endDate: string
): RehearsalSummary[] {
  return summaries.filter(s => {
    const d = new Date(s.date).getTime()
    const start = startDate ? new Date(startDate).getTime() : -Infinity
    const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity
    return d >= start && d < end
  })
}

export function filterSummariesBySongs(
  summaries: RehearsalSummary[],
  selectedSongs: string[]
): RehearsalSummary[] {
  if (selectedSongs.length === 0) return summaries
  return summaries.filter(s =>
    s.songs.some(song => selectedSongs.includes(song))
  )
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
