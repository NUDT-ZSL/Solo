import React, { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { TimelineArea } from './components/TimelineArea'
import { useStore } from './store/useStore'
import { initializePresetClips, setEmotion, eventBus } from './modules/clip/ClipManager'
import { addClip, startPlayback, stopPlayback, calculateTotalDuration } from './modules/timeline/TimelineManager'
import { analyzeAndRender } from './modules/emotion/EmotionAnalyzer'
import type { EmotionLabel, PresetClip } from './types'
import { EMOTION_LABELS_CN, EMOTION_COLORS, GRID_WIDTH } from './types'
import './App.css'

export const App: React.FC = () => {
  const presetClips = useStore((state) => state.presetClips)
  const timelineClips = useStore((state) => state.timelineClips)
  const emotionRatios = useStore((state) => state.emotionRatios)
  const playbackPosition = useStore((state) => state.playbackPosition)
  const isPlaying = useStore((state) => state.isPlaying)
  const resetPlayback = useStore((state) => state.resetPlayback)

  const appRef = useRef<HTMLDivElement>(null)
  const [showComplete, setShowComplete] = useState(false)
  const [draggedClip, setDraggedClip] = useState<PresetClip | null>(null)
  const [clonePos, setClonePos] = useState<{ x: number; y: number } | null>(null)
  const cloneRafRef = useRef<number>(0)
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)
  const curveHoverIndexRef = useRef<number | null>(null)

  const totalDuration = calculateTotalDuration(timelineClips)

  useEffect(() => {
    initializePresetClips()
    analyzeAndRender([], null, null)

    const handlePlaybackComplete = () => {
      setShowComplete(true)
      setTimeout(() => setShowComplete(false), 3000)
    }

    eventBus.on('playbackComplete', handlePlaybackComplete)
    return () => {
      eventBus.off('playbackComplete', handlePlaybackComplete)
      if (cloneRafRef.current) cancelAnimationFrame(cloneRafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      analyzeAndRender(timelineClips, curveHoverIndexRef.current, null)
    }
  }, [timelineClips, isPlaying])

  useEffect(() => {
    if (isPlaying) {
      analyzeAndRender(timelineClips, null, { playbackPosition, totalDuration })
    }
  }, [playbackPosition, isPlaying, timelineClips, totalDuration])

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
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      })

      analyzeAndRender(timelineClips, null, null)

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      const scrollContainers = appRef.current.querySelectorAll('*')
      const scrollStates: { el: Element; overflow: string }[] = []
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.scrollHeight > htmlEl.clientHeight + 2 || htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
          const computed = getComputedStyle(htmlEl)
          if (computed.overflow === 'auto' || computed.overflow === 'scroll' ||
              computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
              computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
            scrollStates.push({ el: htmlEl, overflow: htmlEl.style.overflow })
            htmlEl.style.overflow = 'hidden'
          }
        }
      })

      const canvas = await html2canvas(appRef.current, {
        backgroundColor: '#1A1A2E',
        scale: 2,
        useCORS: true,
        windowWidth: appRef.current.scrollWidth,
        windowHeight: appRef.current.scrollHeight,
        ignoreElements: (element) => {
          return element.classList.contains('drag-clone')
        }
      })

      scrollStates.forEach(({ el, overflow }) => {
        ;(el as HTMLElement).style.overflow = overflow
      })

      const link = document.createElement('a')
      link.download = `混剪报告_${new Date().toLocaleDateString()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('导出失败:', error)
    }
  }, [timelineClips])

  const updateClonePosition = useCallback(() => {
    const pos = pendingPointerRef.current
    if (pos) {
      setClonePos({ x: pos.x, y: pos.y })
    }
    cloneRafRef.current = requestAnimationFrame(updateClonePosition)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent, clip: PresetClip) => {
    if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'OPTION') return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    setDraggedClip(clip)
    pendingPointerRef.current = { x: e.clientX, y: e.clientY }
    setClonePos({ x: e.clientX, y: e.clientY })
    cloneRafRef.current = requestAnimationFrame(updateClonePosition)
  }, [updateClonePosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedClip) return
    pendingPointerRef.current = { x: e.clientX, y: e.clientY }
  }, [draggedClip])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggedClip) return

    if (cloneRafRef.current) {
      cancelAnimationFrame(cloneRafRef.current)
      cloneRafRef.current = 0
    }
    pendingPointerRef.current = null
    setClonePos(null)

    const timelineSection = document.querySelector('.timeline-section')
    if (timelineSection) {
      const rect = timelineSection.getBoundingClientRect()
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const scrollEl = timelineSection.querySelector('.timeline-scroll-container')
        const scrollLeft = scrollEl ? (scrollEl as HTMLElement).scrollLeft : 0
        const trackEl = timelineSection.querySelector('.timeline-track')
        const trackRect = trackEl ? trackEl.getBoundingClientRect() : rect
        const position = Math.max(0, Math.round((e.clientX - trackRect.left + scrollLeft) / GRID_WIDTH))
        addClip(draggedClip, position)
      }
    }

    setDraggedClip(null)
  }, [draggedClip])

  const handleEmotionChange = useCallback((clipId: string, label: EmotionLabel) => {
    setEmotion(clipId, label)
  }, [])

  const handleCurveCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = canvas.width - padding.left - padding.right
    const chartHeight = canvas.height - padding.top - padding.bottom
    const curveData = useStore.getState().curveData
    if (curveData.length < 2) return

    const points = curveData.map((_, i) => ({
      px: padding.left + (chartWidth / (curveData.length - 1)) * i,
      py: 0
    }))

    let closest: number | null = null
    let closestDist = Infinity
    for (let i = 0; i < curveData.length; i++) {
      const px = points[i].px
      const py = padding.top + chartHeight - (curveData[i].y / 100) * chartHeight
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
      if (dist < 20 && dist < closestDist) {
        closestDist = dist
        closest = i
      }
    }

    const prevHover = curveHoverIndexRef.current
    curveHoverIndexRef.current = closest
    if (prevHover !== closest && !isPlaying) {
      analyzeAndRender(timelineClips, closest, null)
    }
  }, [isPlaying, timelineClips])

  const handleCurveCanvasMouseLeave = useCallback(() => {
    curveHoverIndexRef.current = null
    if (!isPlaying) {
      analyzeAndRender(timelineClips, null, null)
    }
  }, [isPlaying, timelineClips])

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
                onPointerDown={(e) => handlePointerDown(e, clip)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
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
                    onPointerDown={(e) => e.stopPropagation()}
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
            <canvas id="donut-canvas" className="donut-canvas" width={120} height={120} />
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
            <div className="curve-container" style={{ position: 'relative' }}>
              <canvas
                id="curve-canvas"
                width={280}
                height={180}
                className="curve-canvas"
                onMouseMove={handleCurveCanvasMouseMove}
                onMouseLeave={handleCurveCanvasMouseLeave}
              />
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

      {draggedClip && clonePos && (
        <div
          className="drag-clone"
          style={{
            position: 'fixed',
            left: clonePos.x - 65,
            top: clonePos.y - 40,
            width: '130px',
            height: '80px',
            backgroundColor: draggedClip.color,
            borderRadius: '8px',
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            transform: 'scale(0.9)',
            willChange: 'left, top'
          }}
        >
          {draggedClip.name}
        </div>
      )}
    </div>
  )
}
