import type { TimelineClip, EmotionRatio, CurvePoint, EmotionLabel } from '../../types'
import { EMOTION_COLORS, EMOTION_INTENSITY } from '../../types'
import { useStore } from '../../store/useStore'
import { eventBus } from '../clip/ClipManager'

let offscreenDonut: HTMLCanvasElement | null = null
let offscreenCurve: HTMLCanvasElement | null = null
let cachedCurveData: CurvePoint[] = []
let cachedCurvePoints: { x: number; y: number }[] = []

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

const drawDonutToOffscreen = (ratios: EmotionRatio[]): void => {
  const size = 120
  if (!offscreenDonut) {
    offscreenDonut = document.createElement('canvas')
    offscreenDonut.width = size
    offscreenDonut.height = size
  }

  const ctx = offscreenDonut.getContext('2d')
  if (!ctx) return

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
}

const drawCurveToOffscreen = (data: CurvePoint[]): void => {
  const width = 280
  const height = 180
  if (!offscreenCurve) {
    offscreenCurve = document.createElement('canvas')
    offscreenCurve.width = width
    offscreenCurve.height = height
  }

  if (data.length < 2) return

  const ctx = offscreenCurve.getContext('2d')
  if (!ctx) return

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
}

const drawCurveHighlight = (
  targetCanvas: HTMLCanvasElement,
  highlightIndex: number | null,
  playbackInfo: { playbackPosition: number; totalDuration: number } | null
): void => {
  const ctx = targetCanvas.getContext('2d')
  if (!ctx || !offscreenCurve) return

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
  ctx.drawImage(offscreenCurve, 0, 0)

  if (playbackInfo && cachedCurvePoints.length > 0 && cachedCurveData.length > 1) {
    const progress = playbackInfo.playbackPosition / playbackInfo.totalDuration
    const dataIndex = Math.min(Math.round(progress * (cachedCurveData.length - 1)), cachedCurveData.length - 1)
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
  } else if (highlightIndex !== null && highlightIndex >= 0 && highlightIndex < cachedCurvePoints.length) {
    const point = cachedCurvePoints[highlightIndex]
    if (point) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 7, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.strokeStyle = '#FF6B6B'
      ctx.lineWidth = 2
      ctx.stroke()

      const data = cachedCurveData[highlightIndex]
      if (data) {
        const labelText = `${data.y} - ${data.emotion}`
        ctx.font = 'bold 10px sans-serif'
        const textWidth = ctx.measureText(labelText).width
        const labelX = Math.min(point.x - textWidth / 2, targetCanvas.width - textWidth - 8)
        const labelY = point.y - 14

        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        ctx.beginPath()
        ctx.roundRect(Math.max(2, labelX - 4), labelY - 10, textWidth + 8, 16, 4)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'left'
        ctx.fillText(labelText, Math.max(6, labelX), labelY + 2)
      }
    }
  }
}

export const renderDonutChart = (canvas: HTMLCanvasElement, ratios: EmotionRatio[]): void => {
  drawDonutToOffscreen(ratios)
  const ctx = canvas.getContext('2d')
  if (!ctx || !offscreenDonut) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreenDonut, 0, 0)
}

export const renderCurveChart = (
  canvas: HTMLCanvasElement,
  data: CurvePoint[],
  playbackPosition: number = -1,
  totalDuration: number = 0
): { points: { x: number; y: number }[]; hoverIndex: number | null } => {
  if (data.length < 2) return { points: [], hoverIndex: null }

  const needsRedraw = data !== cachedCurveData || data.length !== cachedCurveData.length
  if (needsRedraw) {
    cachedCurveData = data
    drawCurveToOffscreen(data)
  }

  let hoverIndex: number | null = null
  let playbackInfo: { playbackPosition: number; totalDuration: number } | null = null

  if (playbackPosition >= 0 && totalDuration > 0) {
    playbackInfo = { playbackPosition, totalDuration }
    const progress = playbackPosition / totalDuration
    hoverIndex = Math.min(Math.round(progress * (data.length - 1)), data.length - 1)
  }

  drawCurveHighlight(canvas, null, playbackInfo)

  return { points: cachedCurvePoints, hoverIndex }
}

export const renderCurveWithHover = (
  canvas: HTMLCanvasElement,
  hoverIndex: number | null
): void => {
  drawCurveHighlight(canvas, hoverIndex, null)
}

export const analyzeTimeline = (clips: TimelineClip[]): void => {
  const ratios = getEmotionRatios(clips)
  const curveData = getCurveData(clips)
  useStore.getState().setEmotionRatios(ratios)
  useStore.getState().setCurveData(curveData)
}

export const analyzeAndRender = (
  clips: TimelineClip[],
  hoverIndex: number | null,
  playbackInfo: { playbackPosition: number; totalDuration: number } | null
): void => {
  const ratios = getEmotionRatios(clips)
  const curveData = getCurveData(clips)

  const prevRatios = useStore.getState().emotionRatios
  const prevCurveData = useStore.getState().curveData
  const ratiosChanged = prevRatios.length !== ratios.length ||
    prevRatios.some((r, i) => r.percentage !== ratios[i].percentage || r.label !== ratios[i].label)
  const curveChanged = prevCurveData !== curveData || prevCurveData.length !== curveData.length

  useStore.getState().setEmotionRatios(ratios)
  useStore.getState().setCurveData(curveData)

  const donutCanvas = document.getElementById('donut-canvas') as HTMLCanvasElement | null
  const curveCanvas = document.getElementById('curve-canvas') as HTMLCanvasElement | null

  if (donutCanvas) {
    if (ratiosChanged || !offscreenDonut) {
      renderDonutChart(donutCanvas, ratios)
    }
  }

  if (curveCanvas) {
    if (curveChanged || !offscreenCurve) {
      cachedCurveData = curveData
      drawCurveToOffscreen(curveData)
    }

    if (playbackInfo) {
      drawCurveHighlight(curveCanvas, null, playbackInfo)
    } else if (hoverIndex !== null) {
      drawCurveHighlight(curveCanvas, hoverIndex, null)
    } else {
      const ctx = curveCanvas.getContext('2d')
      if (ctx && offscreenCurve) {
        ctx.clearRect(0, 0, curveCanvas.width, curveCanvas.height)
        ctx.drawImage(offscreenCurve, 0, 0)
      }
    }
  }
}

eventBus.on('timelineChanged', () => {
  const state = useStore.getState()
  analyzeAndRender(state.timelineClips, null, null)
})
