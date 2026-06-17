import React, { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { TimelineArea } from './components/TimelineArea'
import { useStore } from './store/useStore'
import { initializePresetClips, setEmotion, eventBus } from './modules/clip/ClipManager'
import { startPlayback, stopPlayback, calculateTotalDuration } from './modules/timeline/TimelineManager'
import { renderDonutChart, renderCurveChart, analyzeTimeline } from './modules/emotion/EmotionAnalyzer'
import type { EmotionLabel, PresetClip } from './types'
import { EMOTION_LABELS_CN, EMOTION_COLORS } from './types'
import './App.css'

export const App: React.FC = () => {
  const presetClips = useStore((state) => state.presetClips)
  const timelineClips = useStore((state) => state.timelineClips)
  const emotionRatios = useStore((state) => state.emotionRatios)
  const curveData = useStore((state) => state.curveData)
  const playbackPosition = useStore((state) => state.playbackPosition)
  const isPlaying = useStore((state) => state.isPlaying)
  const resetPlayback = useStore((state) => state.resetPlayback)

  const donutCanvasRef = useRef<HTMLCanvasElement>(null)
  const curveCanvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const [showComplete, setShowComplete] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [chartPoints, setChartPoints] = useState<{ x: number; y: number }[]>([])
  const [draggedClip, setDraggedClip] = useState<PresetClip | null>(null)

  const totalDuration = calculateTotalDuration(timelineClips)

  useEffect(() => {
    initializePresetClips()
    analyzeTimeline([])

    const handlePlaybackComplete = () => {
      setShowComplete(true)
      setTimeout(() => setShowComplete(false), 3000)
    }

    eventBus.on('playbackComplete', handlePlaybackComplete)
    return () => eventBus.off('playbackComplete', handlePlaybackComplete)
  }, [])

  useEffect(() => {
    if (donutCanvasRef.current) {
      renderDonutChart(donutCanvasRef.current, emotionRatios)
    }
  }, [emotionRatios])

  useEffect(() => {
    if (curveCanvasRef.current) {
      const result = renderCurveChart(
        curveCanvasRef.current,
        curveData,
        isPlaying ? playbackPosition : hoveredPoint !== null ? hoveredPoint / (curveData.length - 1) * totalDuration : -1,
        totalDuration
      )
      setChartPoints(result.points)
    }
  }, [curveData, playbackPosition, isPlaying, hoveredPoint, totalDuration])

  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
    } else {
      resetPlayback()
      startPlayback()
    }
  }, [isPlaying, resetPlayback])

  const handleExport = useCallback(async () => {
    if (!appRef.current) return

    try {
      const canvas = await html2canvas(appRef.current, {
        backgroundColor: '#1A1A2E',
        scale: 2,
        useCORS: true
      })

      const link = document.createElement('a')
      link.download = `混剪报告_${new Date().toLocaleDateString()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    }
  }, [])

  const handleCurveMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!curveCanvasRef.current || chartPoints.length === 0) return

    const rect = curveCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let closestIndex: number | null = null
    let closestDistance = Infinity

    chartPoints.forEach((point, index) => {
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2)
      if (distance < 15 && distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    setHoveredPoint(closestIndex)
  }, [chartPoints])

  const handleCurveMouseLeave = useCallback(() => {
    setHoveredPoint(null)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, clip: PresetClip) => {
    e.dataTransfer.setData('clip-id', clip.id)
    e.dataTransfer.effectAllowed = 'copy'
    setDraggedClip(clip)

    const dragImage = document.createElement('div')
    dragImage.style.width = '130px'
    dragImage.style.height = '80px'
    dragImage.style.backgroundColor = clip.color
    dragImage.style.borderRadius = '8px'
    dragImage.style.opacity = '0.8'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.display = 'flex'
    dragImage.style.alignItems = 'center'
    dragImage.style.justifyContent = 'center'
    dragImage.style.color = '#FFFFFF'
    dragImage.style.fontSize = '12px'
    dragImage.style.fontWeight = '600'
    dragImage.textContent = clip.name
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 65, 40)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedClip(null)
  }, [])

  const handleEmotionChange = useCallback((clipId: string, label: EmotionLabel) => {
    setEmotion(clipId, label)
  }, [])

  return (
    <div className="app-container" ref={appRef}>
      <header className="app-header">
        <h1 className="app-title">混剪情绪分析</h1>
        <button className="export-btn" onClick={handleExport}>
          导出报告
        </button>
      </header>

      <main className="app-main">
        <section className="material-library">
          <h2 className="section-title">素材库</h2>
          <div className="clip-grid">
            {presetClips.map((clip) => (
              <div
                key={clip.id}
                className={`clip-card ${draggedClip?.id === clip.id ? 'dragging' : ''}`}
                style={{ backgroundColor: clip.color }}
                draggable
                onDragStart={(e) => handleDragStart(e, clip)}
                onDragEnd={handleDragEnd}
              >
                <div className="clip-info">
                  <span className="clip-name">{clip.name}</span>
                  <span className="clip-duration">{clip.duration}s</span>
                </div>
                <div className="clip-emotion">
                  <select
                    className="emotion-select"
                    value={clip.emotionLabel}
                    onChange={(e) => handleEmotionChange(clip.id, e.target.value as EmotionLabel)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: EMOTION_COLORS[clip.emotionLabel] }}
                  >
                    {Object.entries(EMOTION_LABELS_CN).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="clip-hover-info">
                  <span>{clip.name}</span>
                  <span style={{ color: EMOTION_COLORS[clip.emotionLabel] }}>
                    {EMOTION_LABELS_CN[clip.emotionLabel]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="library-hint">拖拽素材到时间线轨道</p>
        </section>

        <section className="timeline-section">
          <TimelineArea />

          <div className="playback-controls">
            <button
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlayClick}
              disabled={timelineClips.length === 0}
              title={isPlaying ? '停止' : '播放'}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <span className="playback-status">
              {isPlaying ? '播放中...' : timelineClips.length === 0 ? '添加素材开始' : '点击播放预览'}
            </span>
          </div>
        </section>

        <section className="emotion-panel">
          <h2 className="section-title">情绪分析</h2>

          <div className="emotion-donut-section">
            <canvas ref={donutCanvasRef} className="donut-canvas" />
            <div className="emotion-legend">
              {emotionRatios.map((ratio) => (
                <div key={ratio.label} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: ratio.color }}
                  />
                  <span className="legend-label">{EMOTION_LABELS_CN[ratio.label]}</span>
                  <span className="legend-value">
                    {ratio.percentage > 0 ? `${ratio.percentage.toFixed(1)}%` : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="emotion-curve-section">
            <h3 className="subsection-title">情绪曲线</h3>
            <div className="curve-container">
              <canvas
                ref={curveCanvasRef}
                width={280}
                height={180}
                className="curve-canvas"
                onMouseMove={handleCurveMouseMove}
                onMouseLeave={handleCurveMouseLeave}
              />
              {hoveredPoint !== null && curveData[hoveredPoint] && (
                <div
                  className="tooltip"
                  style={{
                    left: chartPoints[hoveredPoint]?.x || 0,
                    top: (chartPoints[hoveredPoint]?.y || 0) - 30
                  }}
                >
                  强度: {curveData[hoveredPoint].y}
                  <br />
                  {EMOTION_LABELS_CN[curveData[hoveredPoint].emotion]}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showComplete && (
        <div className="complete-toast">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          播放完成！
        </div>
      )}
    </div>
  )
}
