import type { TimelineClip, EmotionRatio, CurvePoint, EmotionLabel } from '../../types'
import { EMOTION_COLORS, EMOTION_INTENSITY } from '../../types'
import { useStore } from '../../store/useStore'
import { eventBus } from '../clip/ClipManager'

export const getEmotionRatios = (clips: TimelineClip[]): EmotionRatio[] => {
  if (clips.length === 0) {
    return Object.keys(EMOTION_COLORS).map((label) => ({
      label: label as EmotionLabel,
      percentage: 0,
      color: EMOTION_COLORS[label as EmotionLabel],
      duration: 0
    }))
  }

  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
  const emotionDurations: Record<EmotionLabel, number> = {
    excited: 0,
    calm: 0,
    nostalgic: 0,
    tense: 0
  }

  clips.forEach((clip) => {
    emotionDurations[clip.emotionLabel] += clip.duration
  })

  return Object.keys(emotionDurations).map((label) => ({
    label: label as EmotionLabel,
    percentage: totalDuration > 0 ? (emotionDurations[label as EmotionLabel] / totalDuration) * 100 : 0,
    color: EMOTION_COLORS[label as EmotionLabel],
    duration: emotionDurations[label as EmotionLabel]
  }))
}

export const getCurveData = (clips: TimelineClip[], sampleCount: number = 10): CurvePoint[] => {
  if (clips.length === 0) {
    return Array(sampleCount).fill(null).map((_, i) => ({
      x: i,
      y: 0,
      emotion: 'calm' as EmotionLabel
    }))
  }

  const totalDuration = Math.max(...clips.map((clip) => clip.position + clip.duration), 1)
  const points: CurvePoint[] = []

  for (let i = 0; i < sampleCount; i++) {
    const timePosition = (i / (sampleCount - 1)) * totalDuration
    const activeClips = clips.filter(
      (clip) => clip.position <= timePosition && clip.position + clip.duration > timePosition
    )

    let intensity = 0
    let dominantEmotion: EmotionLabel = 'calm'

    if (activeClips.length > 0) {
      const weightedIntensity = activeClips.reduce((sum, clip) => {
        return sum + EMOTION_INTENSITY[clip.emotionLabel]
      }, 0)
      intensity = weightedIntensity / activeClips.length

      const emotionCounts: Record<EmotionLabel, number> = {
        excited: 0,
        calm: 0,
        nostalgic: 0,
        tense: 0
      }
      activeClips.forEach((clip) => {
        emotionCounts[clip.emotionLabel]++
      })
      dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a as EmotionLabel] > emotionCounts[b as EmotionLabel] ? a : b
      ) as EmotionLabel
    }

    points.push({
      x: i,
      y: Math.round(intensity),
      emotion: dominantEmotion
    })
  }

  return points
}

export const renderDonutChart = (
  canvas: HTMLCanvasElement,
  ratios: EmotionRatio[],
  highlightedLabel?: EmotionLabel
): void => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = 120
  const center = size / 2
  const outerRadius = size / 2 - 4
  const innerRadius = size / 2 - 20

  canvas.width = size
  canvas.height = size
  ctx.clearRect(0, 0, size, size)

  let startAngle = -Math.PI / 2

  ratios.forEach((ratio) => {
    if (ratio.percentage <= 0) return

    const sliceAngle = (ratio.percentage / 100) * 2 * Math.PI
    const isHighlighted = highlightedLabel === ratio.label

    ctx.beginPath()
    ctx.arc(center, center, isHighlighted ? outerRadius + 3 : outerRadius, startAngle, startAngle + sliceAngle)
    ctx.arc(center, center, innerRadius, startAngle + sliceAngle, startAngle, true)
    ctx.closePath()
    ctx.fillStyle = ratio.color
    ctx.fill()

    startAngle += sliceAngle
  })

  ctx.beginPath()
  ctx.arc(center, center, innerRadius, 0, 2 * Math.PI)
  ctx.fillStyle = '#1A1A2E'
  ctx.fill()
}

export const renderCurveChart = (
  canvas: HTMLCanvasElement,
  data: CurvePoint[],
  playbackPosition: number = -1,
  totalDuration: number = 0
): { points: { x: number; y: number }[]; hoverIndex: number | null } => {
  const ctx = canvas.getContext('2d')
  if (!ctx || data.length < 2) return { points: [], hoverIndex: null }

  const width = canvas.width
  const height = canvas.height
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = '#3A3A5A'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  ctx.fillStyle = '#B0B0B0'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const value = 100 - i * 20
    const y = padding.top + (chartHeight / 5) * i + 3
    ctx.fillText(value.toString(), padding.left - 8, y)
  }

  const points: { x: number; y: number }[] = data.map((point, i) => ({
    x: padding.left + (chartWidth / (data.length - 1)) * i,
    y: padding.top + chartHeight - (point.y / 100) * chartHeight
  }))

  const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0)
  gradient.addColorStop(0, '#FF6B6B')
  gradient.addColorStop(1, '#6B5B95')

  ctx.beginPath()
  ctx.moveTo(points[0].x, padding.top + chartHeight)
  points.forEach((point) => {
    ctx.lineTo(point.x, point.y)
  })
  ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.globalAlpha = 0.1
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2
    const yc = (points[i].y + points[i - 1].y) / 2
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc)
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()

  let hoverIndex: number | null = null

  if (playbackPosition >= 0 && totalDuration > 0) {
    const progress = playbackPosition / totalDuration
    const dataIndex = Math.min(Math.round(progress * (data.length - 1)), data.length - 1)
    hoverIndex = dataIndex

    if (points[dataIndex]) {
      ctx.beginPath()
      ctx.arc(points[dataIndex].x, points[dataIndex].y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  points.forEach((point, i) => {
    if (i !== hoverIndex) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#6B5B95'
      ctx.fill()
    }
  })

  ctx.fillStyle = '#B0B0B0'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + (chartWidth / (data.length - 1)) * i
    ctx.fillText(`${i + 1}`, x, height - padding.bottom + 15)
  }

  ctx.fillStyle = '#E0E0E0'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('情绪强度', 20, padding.top - 5)

  return { points, hoverIndex }
}

export const analyzeTimeline = (clips: TimelineClip[]): void => {
  const ratios = getEmotionRatios(clips)
  const curveData = getCurveData(clips)
  useStore.getState().setEmotionRatios(ratios)
  useStore.getState().setCurveData(curveData)
}

eventBus.on('timelineChanged', () => {
  const state = useStore.getState()
  analyzeTimeline(state.timelineClips)
})
