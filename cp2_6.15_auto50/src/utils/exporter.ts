import { saveAs } from 'file-saver'

export interface LyricLine {
  id: string
  text: string
  startTime: number
  endTime: number
  index: number
}

export interface TimelineValidationResult {
  valid: boolean
  overlaps: Array<{ lyric1: string; lyric2: string; lyric1Index: number; lyric2Index: number }>
  gaps: Array<{ afterLyric: string; beforeLyric: string; afterLyricIndex: number; beforeLyricIndex: number; gapDuration: number }>
  invalidRanges: Array<{ lyric: string; lyricIndex: number; reason: string }>
}

export function validateTimeline(lyrics: LyricLine[]): TimelineValidationResult {
  const result: TimelineValidationResult = {
    valid: true,
    overlaps: [],
    gaps: [],
    invalidRanges: [],
  }

  if (lyrics.length === 0) {
    return result
  }

  const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime)

  sorted.forEach((lyric) => {
    if (lyric.startTime < 0 || lyric.endTime < 0) {
      result.valid = false
      result.invalidRanges.push({
        lyric: lyric.text,
        lyricIndex: lyric.index,
        reason: '时间值不能为负数',
      })
    }
    if (lyric.endTime <= lyric.startTime) {
      result.valid = false
      result.invalidRanges.push({
        lyric: lyric.text,
        lyricIndex: lyric.index,
        reason: '结束时间必须大于开始时间',
      })
    }
  })

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    if (next.startTime < current.endTime) {
      result.valid = false
      result.overlaps.push({
        lyric1: current.text,
        lyric2: next.text,
        lyric1Index: current.index,
        lyric2Index: next.index,
      })
    } else if (next.startTime > current.endTime) {
      const gapDuration = next.startTime - current.endTime
      if (gapDuration > 0.5) {
        result.valid = false
        result.gaps.push({
          afterLyric: current.text,
          beforeLyric: next.text,
          afterLyricIndex: current.index,
          beforeLyricIndex: next.index,
          gapDuration,
        })
      }
    }
  }

  return result
}

function formatTimeSRT(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function formatTimeASS(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs)}:${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
}

export function generateSRT(lyrics: LyricLine[]): string {
  const sortedLyrics = [...lyrics].sort((a, b) => a.startTime - b.startTime)
  return sortedLyrics
    .map((lyric, index) => {
      return `${index + 1}\n${formatTimeSRT(lyric.startTime)} --> ${formatTimeSRT(lyric.endTime)}\n${lyric.text}\n`
    })
    .join('\n')
}

export function generateASS(lyrics: LyricLine[], fontSize: number = 24): string {
  const sortedLyrics = [...lyrics].sort((a, b) => a.startTime - b.startTime)
  const header = `[Script Info]
Title: Lyric Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const events = sortedLyrics
    .map((lyric) => {
      return `Dialogue: 0,${formatTimeASS(lyric.startTime)},${formatTimeASS(lyric.endTime)},Default,,0,0,0,,${lyric.text}`
    })
    .join('\n')

  return header + events
}

export function exportSRT(lyrics: LyricLine[], filename: string = 'lyrics.srt'): void {
  const content = generateSRT(lyrics)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, filename)
}

export function exportASS(lyrics: LyricLine[], fontSize: number = 24, filename: string = 'lyrics.ass'): void {
  const content = generateASS(lyrics, fontSize)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, filename)
}
