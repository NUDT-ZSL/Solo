import type { TimelineClip, EmotionRatio, CurvePoint, EmotionLabel } from '../../types'
import { EMOTION_COLORS, EMOTION_INTENSITY } from '../../types'
import { useStore } from '../../store/useStore'
import { eventBus } from '../clip/ClipManager'

let offscreenDonut: HTMLCanvasElement | null = null
let offscreenCurveBg: HTMLCanvasElement | null = null
let cachedCurveData: CurvePoint[] = []
let cachedCurvePoints: { x: number; y: number }[] = []
let lastDonutHash: string = ''
let lastCurveHash: string = ''

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

export const getCurveData = (clips: TimelineClip[], sampleCount?: number): CurvePoint[] => {
  const dynamicSampleCount = sampleCount ?? Math.max(10, clips.length * 3)

  if (clips.length === 0) {
    return Array(dynamicSampleCount).fill(null).map((_, i) => ({
      x: i,
      y: 0,
      emotion: 'calm' as EmotionLabel
    }))
  }

  const totalDuration = Math.max(...clips.map((clip) => clip.position + clip.duration), 1)
  const points: CurvePoint[] = []

  for (let i = 0; i < dynamicSampleCount; i++) {
    const timePosition = (i / (dynamicSampleCount - 1)) * totalDuration
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

const hashRatios = (ratios: EmotionRatio[]): string => {
  return ratios.map(r => `${r.label}:${r.percentage.toFixed(2)}`).join('|')
}

const hashCurveData = (data: CurvePoint[]): string => {
  return data.map(p => `${p.x}:${p.y}:${p.emotion}`).join('|')
}

const drawDonutToOffscreen = (ratios: EmotionRatio[]): boolean => {
  const hash = hashRatios(ratios)
  if (hash === lastDonutHash && offscreenDonut) {
    return false
  }
  lastDonutHash = hash

  const size = 120
  if (!offscreenDonut) {
    offscreenDonut = document.createElement('canvas')
    offscreenDonut.width = size
    offscreenDonut.height = size
  }

  const ctx = offscreenDonut.getContext('2d')
  if (!ctx) return false

  const center = size / 2
  const outerRadius = size / 2 - 4
  const innerRadius = size / 2 - 20

  ctx.clearRect(0, 0, size, size)

  let startAngle = -Math.PI / 2

  ratios.forEach((ratio) => {
    if (ratio.percentage <= 0) return

    const sliceAngle = (ratio.percentage / 100) * 2 * Math.PI

    ctx.beginPath()
    ctx.arc(center, center, outerRadius, startAngle, startAngle + sliceAngle)
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

  return true
}

const drawCurveBackgroundToOffscreen = (data: CurvePoint[]): boolean => {
  const hash = hashCurveData(data)
  if (hash === lastCurveHash && offscreenCurveBg) {
    return false
  }
  lastCurveHash = hash

  const width = 280
  const height = 180
  if (!offscreenCurveBg) {
    offscreenCurveBg = document.createElement('canvas')
    offscreenCurveBg.width = width
    offscreenCurveBg.height = height
  }

  if (data.length < 2) return false

  const ctx = offscreenCurveBg.getContext('2d')
  if (!ctx) return false

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

  cachedCurvePoints = data.map((point, i) => ({
    x: padding.left + (chartWidth / (data.length - 1)) * i,
    y: padding.top + chartHeight - (point.y / 100) * chartHeight
  }))

  const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0)
  gradient.addColorStop(0, '#FF6B6B')
  gradient.addColorStop(1, '#6B5B95')

  ctx.beginPath()
  ctx.moveTo(cachedCurvePoints[0].x, padding.top + chartHeight)
  cachedCurvePoints.forEach((point) => {
    ctx.lineTo(point.x, point.y)
  })
  ctx.lineTo(cachedCurvePoints[cachedCurvePoints.length - 1].x, padding.top + chartHeight)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.globalAlpha = 0.1
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.beginPath()
  ctx.moveTo(cachedCurvePoints[0].x, cachedCurvePoints[0].y)
  for (let i = 1; i < cachedCurvePoints.length; i++) {
    const xc = (cachedCurvePoints[i].x + cachedCurvePoints[i - 1].x) / 2
    const yc = (cachedCurvePoints[i].y + cachedCurvePoints[i - 1].y) / 2
    ctx.quadraticCurveTo(cachedCurvePoints[i - 1].x, cachedCurvePoints[i - 1].y, xc, yc)
  }
  ctx.lineTo(cachedCurvePoints[cachedCurvePoints.length - 1].x, cachedCurvePoints[cachedCurvePoints.length - 1].y)
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()

  cachedCurvePoints.forEach((point) => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
    ctx.fillStyle = '#6B5B95'
    ctx.fill()
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

  return true
}

export const renderDonutChart = (canvas: HTMLCanvasElement, ratios: EmotionRatio[]): void => {
  if (!canvas) return
  const redrawn = drawDonutToOffscreen(ratios)
  const ctx = canvas.getContext('2d')
  if (!ctx || !offscreenDonut) return
  if (!redrawn && canvas.dataset.drawn === 'true') return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreenDonut, 0, 0)
  canvas.dataset.drawn = 'true'
}

export const renderCurveBackground = (canvas: HTMLCanvasElement, data: CurvePoint[]): boolean => {
  if (!canvas || data.length < 2) return false
  const redrawn = drawCurveBackgroundToOffscreen(data)
  cachedCurveData = data
  return redrawn
}

export const renderCurveOverlay = (
  canvas: HTMLCanvasElement,
  options: {
    hoverIndex?: number | null
    playbackInfo?: { playbackPosition: number; totalDuration: number } | null
  } = {}
): { hoverIndex: number | null } => {
  if (!canvas || !offscreenCurveBg) return { hoverIndex: null }

  const ctx = canvas.getContext('2d')
  if (!ctx) return { hoverIndex: null }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreenCurveBg, 0, 0)

  let resultHoverIndex: number | null = null

  const { hoverIndex: rawHoverIndex, playbackInfo } = options

  if (playbackInfo && playbackInfo.totalDuration > 0 && cachedCurvePoints.length > 0) {
    const progress = playbackInfo.playbackPosition / playbackInfo.totalDuration
    const dataIndex = Math.min(
      Math.round(progress * (cachedCurveData.length - 1)),
      cachedCurveData.length - 1
    )
    resultHoverIndex = dataIndex
    const point = cachedCurvePoints[dataIndex]
    if (point) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  } else if (rawHoverIndex !== null && rawHoverIndex !== undefined && rawHoverIndex >= 0 && rawHoverIndex < cachedCurvePoints.length) {
    resultHoverIndex = rawHoverIndex
    const point = cachedCurvePoints[rawHoverIndex]
    if (point) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 7, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 2
      ctx.stroke()

      const data = cachedCurveData[rawHoverIndex]
      if (data) {
        const emotionLabel = {
          excited: '兴奋',
          calm: '平静',
          nostalgic: '怀旧',
          tense: '紧张'
        }[data.emotion] || data.emotion
        const labelText = `${data.y} · ${emotionLabel}`
        ctx.font = 'bold 10px sans-serif'
        const textWidth = ctx.measureText(labelText).width
        const labelX = Math.min(point.x - textWidth / 2, canvas.width - textWidth - 8)
        const labelY = point.y - 14

        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        ctx.beginPath()
        const rx = Math.max(2, labelX - 4)
        const ry = labelY - 10
        const rw = textWidth + 8
        const rh = 16
        const radius = 4
        ctx.moveTo(rx + radius, ry)
        ctx.lineTo(rx + rw - radius, ry)
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius)
        ctx.lineTo(rx + rw, ry + rh - radius)
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh)
        ctx.lineTo(rx + radius, ry + rh)
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius)
        ctx.lineTo(rx, ry + radius)
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'left'
        ctx.fillText(labelText, Math.max(6, labelX), labelY + 2)
      }
    }
  }

  return { hoverIndex: resultHoverIndex }
}

export const getCurvePointAtIndex = (index: number): { x: number; y: number } | null => {
  return cachedCurvePoints[index] || null
}

export const findNearestCurvePoint = (
  canvasX: number,
  canvasY: number,
  threshold: number = 20
): number | null => {
  let closest: number | null = null
  let closestDist = Infinity

  for (let i = 0; i < cachedCurvePoints.length; i++) {
    const point = cachedCurvePoints[i]
    const dist = Math.sqrt((canvasX - point.x) ** 2 + (canvasY - point.y) ** 2)
    if (dist < threshold && dist < closestDist) {
      closestDist = dist
      closest = i
    }
  }

  return closest
}

export const analyzeTimeline = (clips: TimelineClip[]): void => {
  const ratios = getEmotionRatios(clips)
  const curveData = getCurveData(clips)
  useStore.getState().setEmotionRatios(ratios)
  useStore.getState().setCurveData(curveData)
}

export const renderToCanvases = (
  clips: TimelineClip[],
  donutCanvas: HTMLCanvasElement | null,
  curveCanvas: HTMLCanvasElement | null,
  options: {
    hoverIndex?: number | null
    playbackInfo?: { playbackPosition: number; totalDuration: number } | null
  } = {}
): void => {
  const ratios = getEmotionRatios(clips)
  const curveData = getCurveData(clips)

  useStore.getState().setEmotionRatios(ratios)
  useStore.getState().setCurveData(curveData)

  if (donutCanvas) {
    renderDonutChart(donutCanvas, ratios)
  }

  if (curveCanvas) {
    renderCurveBackground(curveCanvas, curveData)
    renderCurveOverlay(curveCanvas, options)
  }
}

eventBus.on('timelineChanged', () => {
  const state = useStore.getState()
  analyzeTimeline(state.timelineClips)
})
