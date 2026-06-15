import { saveAs } from 'file-saver'

export interface LyricLine {
  id: string
  text: string
  startTime: number
  endTime: number
  index: number
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
