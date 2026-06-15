import type { AudioAnalysisResult, ThemeConfig, SpectrumPeak, VolumePoint, EmotionPoint } from './types'
import { formatTimeShort } from './audioAnalyzer'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

const MARGIN_X = 80
const MARGIN_TOP = 100
const MARGIN_BOTTOM = 80

const PLOT_TOP = MARGIN_TOP
const PLOT_BOTTOM = CARD_HEIGHT - MARGIN_BOTTOM
const PLOT_LEFT = MARGIN_X
const PLOT_RIGHT = CARD_WIDTH - MARGIN_X
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP

const VOLUME_TOP_OFFSET = 0
const VOLUME_HEIGHT_RATIO = 0.3

const EMOTION_TOP_OFFSET = 0.35
const EMOTION_HEIGHT_RATIO = 0.3

const WAVEFORM_TOP_OFFSET = 0.72
const WAVEFORM_HEIGHT_RATIO = 0.28

const SVG_NS = 'http://www.w3.org/2000/svg'

interface GenerateOptions {
  fileName?: string
  generatedAt?: Date
  animationId?: string
}

export function generateCardSVG(
  analysis: AudioAnalysisResult,
  theme: ThemeConfig,
  options: GenerateOptions = {}
): string {
  const { fileName = 'Unknown', generatedAt = new Date() } = options

  const gradientId = `bg-grad-${Date.now().toString(36)}`
  const emotionGradId = `emotion-grad-${Date.now().toString(36)}`
  const volumeGradId = `volume-grad-${Date.now().toString(36)}`

  const svgParts: string[] = []

  svgParts.push(`<svg xmlns="${SVG_NS}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`)

  svgParts.push(`<defs>`)
  svgParts.push(`<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`)
  svgParts.push(`<stop offset="0%" stop-color="${theme.bgStart}" />`)
  svgParts.push(`<stop offset="100%" stop-color="${theme.bgEnd}" />`)
  svgParts.push(`</linearGradient>`)

  svgParts.push(`<linearGradient id="${emotionGradId}" x1="0%" y1="0%" x2="100%" y2="0%">`)
  svgParts.push(`<stop offset="0%" stop-color="${theme.emotionStart}" />`)
  svgParts.push(`<stop offset="50%" stop-color="${mixHexColors(theme.emotionStart, theme.emotionEnd, 0.5)}" />`)
  svgParts.push(`<stop offset="100%" stop-color="${theme.emotionEnd}" />`)
  svgParts.push(`</linearGradient>`)

  svgParts.push(`<linearGradient id="${volumeGradId}" x1="0%" y1="0%" x2="0%" y2="100%">`)
  svgParts.push(`<stop offset="0%" stop-color="${theme.volumeColor}" stop-opacity="0.8" />`)
  svgParts.push(`<stop offset="100%" stop-color="${theme.volumeColor}" stop-opacity="0.1" />`)
  svgParts.push(`</linearGradient>`)

  svgParts.push(`<filter id="glow">`)
  svgParts.push(`<feGaussianBlur stdDeviation="3" result="coloredBlur" />`)
  svgParts.push(`<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`)
  svgParts.push(`</filter>`)

  svgParts.push(`</defs>`)

  svgParts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#${gradientId})" rx="24" />`)

  drawDecorativeDots(svgParts, theme)
  drawHeader(svgParts, theme, fileName, generatedAt, analysis.duration)

  drawVolumeEnvelope(svgParts, analysis.volumeEnvelope, analysis.duration, theme, volumeGradId)
  drawEmotionCurve(svgParts, analysis.emotionCurve, analysis.duration, theme, emotionGradId)
  drawWaveform(svgParts, analysis.waveform, analysis.duration, theme)
  drawSpectrumPeaks(svgParts, analysis.spectrumPeaks, analysis.duration, theme)
  drawAxisLabels(svgParts, theme, analysis.duration)
  drawFooter(svgParts, theme)

  svgParts.push(`</svg>`)

  return svgParts.join('\n')
}

function drawDecorativeDots(svg: string[], theme: ThemeConfig) {
  const dots = 20
  for (let i = 0; i < dots; i++) {
    const x = (i * 137.5) % CARD_WIDTH
    const y = (i * 97.3) % CARD_HEIGHT
    const r = 1 + (i % 4)
    const opacity = 0.05 + (i % 7) * 0.01
    svg.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${theme.textColor}" opacity="${opacity.toFixed(2)}" />`)
  }
}

function drawHeader(
  svg: string[],
  theme: ThemeConfig,
  fileName: string,
  generatedAt: Date,
  duration: number
) {
  const displayName = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName

  svg.push(`<g font-family="'JetBrains Mono', 'Fira Code', monospace">`)

  svg.push(`<text x="${MARGIN_X}" y="${50}" fill="${theme.volumeColor}" font-size="16" font-weight="bold" letter-spacing="4">`)
  svg.push(`VOICEPRINT · 声纹摘要`)
  svg.push(`</text>`)

  svg.push(`<text x="${MARGIN_X}" y="${82}" fill="${theme.textColor}" font-size="22" font-weight="bold">`)
  svg.push(escapeXML(displayName))
  svg.push(`</text>`)

  const rightX = CARD_WIDTH - MARGIN_X
  const dateStr = formatDate(generatedAt)
  const durStr = formatTimeShort(duration)

  svg.push(`<text x="${rightX}" y="${50}" fill="${theme.textColor}" font-size="14" text-anchor="end" opacity="0.7">`)
  svg.push(`${dateStr}`)
  svg.push(`</text>`)

  svg.push(`<text x="${rightX}" y="${82}" fill="${theme.peakColor}" font-size="18" font-weight="bold" text-anchor="end">`)
  svg.push(`⏱ ${durStr}`)
  svg.push(`</text>`)

  svg.push(`</g>`)
}

function drawVolumeEnvelope(
  svg: string[],
  points: VolumePoint[],
  duration: number,
  theme: ThemeConfig,
  gradId: string
) {
  if (points.length === 0) return

  const topY = PLOT_TOP + PLOT_HEIGHT * VOLUME_TOP_OFFSET
  const height = PLOT_HEIGHT * VOLUME_HEIGHT_RATIO
  const bottomY = topY + height

  let pathD = ''
  let areaD = ''

  points.forEach((pt, i) => {
    const x = PLOT_LEFT + (pt.time / duration) * PLOT_WIDTH
    const y = bottomY - pt.volume * height

    if (i === 0) {
      pathD += `M ${x.toFixed(2)} ${y.toFixed(2)}`
      areaD += `M ${x.toFixed(2)} ${bottomY.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)}`
    } else {
      const prev = points[i - 1]
      const prevX = PLOT_LEFT + (prev.time / duration) * PLOT_WIDTH
      const prevY = bottomY - prev.volume * height

      const cpX1 = prevX + (x - prevX) * 0.4
      const cpY1 = prevY
      const cpX2 = prevX + (x - prevX) * 0.6
      const cpY2 = y

      pathD += ` C ${cpX1.toFixed(2)} ${cpY1.toFixed(2)}, ${cpX2.toFixed(2)} ${cpY2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
      areaD += ` C ${cpX1.toFixed(2)} ${cpY1.toFixed(2)}, ${cpX2.toFixed(2)} ${cpY2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
    }
  })

  const lastX = PLOT_LEFT + PLOT_WIDTH
  areaD += ` L ${lastX.toFixed(2)} ${bottomY.toFixed(2)} Z`

  svg.push(`<path d="${areaD}" fill="url(#${gradId})" />`)
  svg.push(`<path d="${pathD}" fill="none" stroke="${theme.volumeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />`)

  svg.push(`<text x="${PLOT_LEFT}" y="${(topY - 10).toFixed(0)}" fill="${theme.volumeColor}" font-family="'JetBrains Mono', monospace" font-size="12" opacity="0.8">`)
  svg.push(`📊 音量包络 VOLUME`)
  svg.push(`</text>`)
}

function drawEmotionCurve(
  svg: string[],
  points: EmotionPoint[],
  duration: number,
  theme: ThemeConfig,
  gradId: string
) {
  if (points.length === 0) return

  const topY = PLOT_TOP + PLOT_HEIGHT * EMOTION_TOP_OFFSET
  const height = PLOT_HEIGHT * EMOTION_HEIGHT_RATIO
  const centerY = topY + height / 2
  const maxDeviation = height / 2

  let pathD = ''
  let areaD = ''

  points.forEach((pt, i) => {
    const x = PLOT_LEFT + (pt.time / duration) * PLOT_WIDTH
    const deviation = (pt.value - 0.5) * 2
    const y = centerY - deviation * maxDeviation

    if (i === 0) {
      pathD += `M ${x.toFixed(2)} ${y.toFixed(2)}`
      areaD += `M ${x.toFixed(2)} ${centerY.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)}`
    } else {
      const prev = points[i - 1]
      const prevX = PLOT_LEFT + (prev.time / duration) * PLOT_WIDTH
      const prevDeviation = (prev.value - 0.5) * 2
      const prevY = centerY - prevDeviation * maxDeviation

      const cpX1 = prevX + (x - prevX) * 0.35
      const cpY1 = prevY
      const cpX2 = prevX + (x - prevX) * 0.65
      const cpY2 = y

      pathD += ` C ${cpX1.toFixed(2)} ${cpY1.toFixed(2)}, ${cpX2.toFixed(2)} ${cpY2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
      areaD += ` C ${cpX1.toFixed(2)} ${cpY1.toFixed(2)}, ${cpX2.toFixed(2)} ${cpY2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
    }
  })

  const lastX = PLOT_LEFT + PLOT_WIDTH
  areaD += ` L ${lastX.toFixed(2)} ${centerY.toFixed(2)} Z`

  svg.push(`<path d="${areaD}" fill="url(#${gradId})" opacity="0.25" />`)
  svg.push(`<path d="${pathD}" fill="none" stroke="url(#${gradId})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />`)

  svg.push(`<line x1="${PLOT_LEFT}" y1="${centerY.toFixed(2)}" x2="${(PLOT_LEFT + PLOT_WIDTH).toFixed(2)}" y2="${centerY.toFixed(2)}" stroke="${theme.textColor}" stroke-width="1" stroke-dasharray="6,6" opacity="0.2" />`)

  svg.push(`<text x="${PLOT_LEFT}" y="${(topY - 10).toFixed(0)}" fill="${mixHexColors(theme.emotionStart, theme.emotionEnd, 0.5)}" font-family="'JetBrains Mono', monospace" font-size="12" opacity="0.9">`)
  svg.push(`🎭 情绪曲线 EMOTION`)
  svg.push(`</text>`)
}

function drawWaveform(
  svg: string[],
  waveform: number[],
  duration: number,
  theme: ThemeConfig
) {
  if (waveform.length === 0) return

  const topY = PLOT_TOP + PLOT_HEIGHT * WAVEFORM_TOP_OFFSET
  const height = PLOT_HEIGHT * WAVEFORM_HEIGHT_RATIO
  const centerY = topY + height / 2

  const widthPerBar = PLOT_WIDTH / waveform.length
  const barWidth = Math.max(1, widthPerBar * 0.6)

  svg.push(`<g fill="${theme.waveformColor}" opacity="0.9">`)
  waveform.forEach((val, i) => {
    const x = PLOT_LEFT + i * widthPerBar + (widthPerBar - barWidth) / 2
    const barHeight = val * height
    const y = centerY - barHeight / 2

    if (barHeight > 0.5) {
      svg.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="${Math.min(barWidth / 2, 2).toFixed(1)}" />`)
    }
  })
  svg.push(`</g>`)

  svg.push(`<text x="${PLOT_LEFT}" y="${(topY - 10).toFixed(0)}" fill="${theme.textColor}" font-family="'JetBrains Mono', monospace" font-size="12" opacity="0.7">`)
  svg.push(`🌊 波形 WAVEFORM`)
  svg.push(`</text>`)
}

function drawSpectrumPeaks(
  svg: string[],
  peaks: SpectrumPeak[],
  duration: number,
  theme: ThemeConfig
) {
  if (peaks.length === 0) return

  const labelY = PLOT_BOTTOM + 18

  svg.push(`<g>`)

  peaks.forEach((peak, i) => {
    const x = PLOT_LEFT + (peak.time / duration) * PLOT_WIDTH

    svg.push(`<line x1="${x.toFixed(2)}" y1="${PLOT_TOP}" x2="${x.toFixed(2)}" y2="${PLOT_BOTTOM}" stroke="${theme.peakColor}" stroke-width="1" stroke-dasharray="4,4" opacity="0.4" />`)

    svg.push(`<circle cx="${x.toFixed(2)}" cy="${labelY + 8}" r="6" fill="${theme.peakColor}" filter="url(#glow)" />`)
    svg.push(`<circle cx="${x.toFixed(2)}" cy="${labelY + 8}" r="3" fill="${theme.textColor}" />`)

    const timeLabel = formatTimeShort(peak.time)
    svg.push(`<text x="${x.toFixed(2)}" y="${(labelY + 34).toFixed(0)}" fill="${theme.peakColor}" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="bold" text-anchor="middle" filter="url(#glow)">`)
    svg.push(timeLabel)
    svg.push(`</text>`)

    const freqLabel = `${(peak.frequency / 1000).toFixed(1)}kHz`
    svg.push(`<text x="${x.toFixed(2)}" y="${(PLOT_TOP - 12).toFixed(0)}" fill="${theme.peakColor}" font-family="'JetBrains Mono', monospace" font-size="11" text-anchor="middle" opacity="0.8">`)
    svg.push(freqLabel)
    svg.push(`</text>`)
  })

  svg.push(`</g>`)
}

function drawAxisLabels(svg: string[], theme: ThemeConfig, duration: number) {
  const labels = 6
  svg.push(`<g font-family="'JetBrains Mono', monospace" font-size="11" fill="${theme.textColor}" opacity="0.5">`)

  for (let i = 0; i <= labels; i++) {
    const t = (i / labels) * duration
    const x = PLOT_LEFT + (i / labels) * PLOT_WIDTH
    const timeStr = formatTimeShort(t)

    svg.push(`<text x="${x.toFixed(2)}" y="${(PLOT_BOTTOM + 56).toFixed(0)}" text-anchor="middle">${timeStr}</text>`)

    if (i > 0 && i < labels) {
      svg.push(`<line x1="${x.toFixed(2)}" y1="${PLOT_BOTTOM + 40}" x2="${x.toFixed(2)}" y2="${PLOT_BOTTOM + 48}" stroke="${theme.textColor}" stroke-width="1" opacity="0.3" />`)
    }
  }

  svg.push(`</g>`)

  svg.push(`<line x1="${PLOT_LEFT}" y1="${PLOT_BOTTOM + 40}" x2="${PLOT_LEFT + PLOT_WIDTH}" y2="${PLOT_BOTTOM + 40}" stroke="${theme.textColor}" stroke-width="1" opacity="0.3" />`)
}

function drawFooter(svg: string[], theme: ThemeConfig) {
  svg.push(`<g font-family="'JetBrains Mono', monospace">`)

  svg.push(`<text x="${MARGIN_X}" y="${(CARD_HEIGHT - 28).toFixed(0)}" fill="${theme.textColor}" font-size="12" opacity="0.5">`)
  svg.push(`✦ Generated by Voiceprint Summary Card · 声纹摘要卡`)
  svg.push(`</text>`)

  const rightX = CARD_WIDTH - MARGIN_X
  const legends = [
    { label: 'VOL', color: theme.volumeColor },
    { label: 'EMO', color: mixHexColors(theme.emotionStart, theme.emotionEnd, 0.5) },
    { label: 'PEAK', color: theme.peakColor }
  ]

  let offsetX = rightX
  legends.reverse().forEach(leg => {
    const text = leg.label
    const textWidth = text.length * 8 + 14

    svg.push(`<rect x="${(offsetX - textWidth).toFixed(2)}" y="${(CARD_HEIGHT - 40).toFixed(0)}" width="${(textWidth - 4).toFixed(2)}" height="16" rx="4" fill="${leg.color}" opacity="0.2" />`)
    svg.push(`<circle cx="${(offsetX - textWidth + 8).toFixed(2)}" cy="${(CARD_HEIGHT - 32).toFixed(0)}" r="3" fill="${leg.color}" />`)
    svg.push(`<text x="${(offsetX - textWidth + 16).toFixed(2)}" y="${(CARD_HEIGHT - 28).toFixed(0)}" fill="${leg.color}" font-size="10" font-weight="bold">${text}</text>`)

    offsetX -= textWidth + 8
  })

  svg.push(`</g>`)
}

function mixHexColors(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio)
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio)
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio)

  return rgbToHex(r, g, b)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
        break
      case gn:
        h = ((bn - rn) / d + 2) * 60
        break
      case bn:
        h = ((rn - gn) / d + 4) * 60
        break
    }
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100

  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else if (h < 360) { r = c; g = 0; b = x }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  )
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function getTooltipContent(
  analysis: AudioAnalysisResult,
  cursorX: number,
  svgRect: DOMRect,
  cardWidth: number
): { time: number; volume: number; emotion: number; db: number } | null {
  const ratio = cursorX / svgRect.width
  const time = ratio * analysis.duration

  if (time < 0 || time > analysis.duration) return null

  const volumeIdx = binarySearch(analysis.volumeEnvelope.map(p => p.time), time)
  const emotionIdx = binarySearch(analysis.emotionCurve.map(p => p.time), time)

  const volPoint = analysis.volumeEnvelope[Math.min(volumeIdx, analysis.volumeEnvelope.length - 1)]
  const emoPoint = analysis.emotionCurve[Math.min(emotionIdx, analysis.emotionCurve.length - 1)]

  const db = -100 + volPoint.volume * 100

  return {
    time,
    volume: volPoint.volume,
    emotion: emoPoint.value,
    db
  }
}

function binarySearch(sorted: number[], target: number): number {
  let low = 0
  let high = sorted.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (sorted[mid] === target) return mid
    if (sorted[mid] < target) low = mid + 1
    else high = mid - 1
  }

  return Math.max(0, low - 1)
}
