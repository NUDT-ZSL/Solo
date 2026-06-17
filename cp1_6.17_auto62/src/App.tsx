import React, { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { TimelineArea } from './components/TimelineArea'
import { useStore } from './store/useStore'
import { initializePresetClips, setEmotion, eventBus } from './modules/clip/ClipManager'
import { addClip, startPlayback, stopPlayback, calculateTotalDuration } from './modules/timeline/TimelineManager'
import { renderToCanvases, renderCurveOverlay, findNearestCurvePoint } from './modules/emotion/EmotionAnalyzer'
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
  const donutCanvasRef = useRef<HTMLCanvasElement>(null)
  const curveCanvasRef = useRef<HTMLCanvasElement>(null)
  const timelineSectionRef = useRef<HTMLElement>(null)

  const [showComplete, setShowComplete] = useState(false)
  const [draggedClip, setDraggedClip] = useState<PresetClip | null>(null)
  const [clonePos, setClonePos] = useState<{ x: number; y: number } | null>(null)
  const cloneRafRef = useRef<number>(0)
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)
  const curveHoverIndexRef = useRef<number | null>(null)
  const isExportingRef = useRef(false)

  const totalDuration = calculateTotalDuration(timelineClips)

  useEffect(() => {
    initializePresetClips()
  }, [])

  useEffect(() => {
    if (donutCanvasRef.current && curveCanvasRef.current) {
      renderToCanvases([], donutCanvasRef.current, curveCanvasRef.current, { hoverIndex: null })
    }
  }, [])

  useEffect(() => {
    if (!donutCanvasRef.current || !curveCanvasRef.current) return
    if (timelineClips.length === 0) {
      renderToCanvases([], donutCanvasRef.current, curveCanvasRef.current, { hoverIndex: null })
      return
    }
    if (!isPlaying) {
      renderToCanvases(timelineClips, donutCanvasRef.current, curveCanvasRef.current, {
        hoverIndex: curveHoverIndexRef.current
      })
    }
  }, [timelineClips, isPlaying])

  useEffect(() => {
    if (isPlaying && curveCanvasRef.current) {
      renderCurveOverlay(curveCanvasRef.current, {
        playbackInfo: { playbackPosition, totalDuration }
      })
    }
  }, [playbackPosition, isPlaying, totalDuration])

  useEffect(() => {
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

  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
      if (curveCanvasRef.current) {
        renderCurveOverlay(curveCanvasRef.current, { hoverIndex: null })
      }
    } else {
      resetPlayback()
      startPlayback()
    }
  }, [isPlaying, resetPlayback])

  const handleExport = useCallback(async () => {
    if (!appRef.current || !donutCanvasRef.current || !curveCanvasRef.current) return
    if (isExportingRef.current) return
    isExportingRef.current = true

    try {
      const wasPlaying = isPlaying
      if (wasPlaying) stopPlayback()

      renderToCanvases(timelineClips, donutCanvasRef.current, curveCanvasRef.current, {
        hoverIndex: null
      })

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve()
          })
        })
      })

      const scrollContainers = appRef.current.querySelectorAll('*')
      const scrollStates: { el: HTMLElement; overflow: string; scrollLeft?: number; scrollTop?: number }[] = []
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.scrollHeight > htmlEl.clientHeight + 2 || htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
          const computed = getComputedStyle(htmlEl)
          if (computed.overflow === 'auto' || computed.overflow === 'scroll' ||
              computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
              computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
            scrollStates.push({
              el: htmlEl,
              overflow: htmlEl.style.overflow,
              scrollLeft: htmlEl.scrollLeft,
              scrollTop: htmlEl.scrollTop
            })
            htmlEl.style.overflow = 'hidden'
            if (htmlEl.scrollLeft > 0) htmlEl.scrollLeft = 0
            if (htmlEl.scrollTop > 0) htmlEl.scrollTop = 0
          }
        }
      })

      const clipRect = appRef.current.getBoundingClientRect()

      const canvas = await html2canvas(appRef.current, {
        backgroundColor: '#1A1A2E',
        scale: 2,
        useCORS: true,
        windowWidth: Math.ceil(clipRect.width),
        windowHeight: Math.ceil(clipRect.height),
        x: 0,
        y: 0,
        width: Math.ceil(clipRect.width),
        height: Math.ceil(clipRect.height),
        ignoreElements: (element) => {
          if (element.classList.contains('drag-clone')) return true
          if ((element as HTMLElement).style.zIndex === '10000') return true
          return false
        },
        logging: false
      })

      scrollStates.forEach(({ el, overflow, scrollLeft, scrollTop }) => {
        el.style.overflow = overflow
        if (scrollLeft !== undefined) el.scrollLeft = scrollLeft
        if (scrollTop !== undefined) el.scrollTop = scrollTop
      })

      const link = document.createElement('a')
      link.download = `混剪报告_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      if (wasPlaying) startPlayback()
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      isExportingRef.current = false
    }
  }, [timelineClips, isPlaying])

  const updateClonePosition = useCallback(() => {
    const pos = pendingPointerRef.current
    if (pos) {
      const margin = 8
      const cloneW = 130
      const cloneH = 80
      const x = Math.max(margin, Math.min(window.innerWidth - cloneW - margin, pos.x - cloneW / 2))
      const y = Math.max(margin, Math.min(window.innerHeight - cloneH - margin, pos.y - cloneH / 2))
      setClonePos({ x, y })
    }
    cloneRafRef.current = requestAnimationFrame(updateClonePosition)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent, clip: PresetClip) => {
    if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'OPTION') return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    setDraggedClip(clip)
    pendingPointerRef.current = { x: e.clientX, y: e.clientY }
    setClonePos({ x: e.clientX - 65, y: e.clientY - 40 })
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

    const sectionEl = timelineSectionRef.current
    if (sectionEl) {
      const sectionRect = sectionEl.getBoundingClientRect()
      if (
        e.clientX >= sectionRect.left &&
        e.clientX <= sectionRect.right &&
        e.clientY >= sectionRect.top &&
        e.clientY <= sectionRect.bottom
      ) {
        const scrollEl = sectionEl.querySelector('.timeline-scroll-container') as HTMLElement | null
        const scrollLeft = scrollEl?.scrollLeft ?? 0
        const trackEl = sectionEl.querySelector('.timeline-track') as HTMLElement | null
        const trackRect = trackEl ? trackEl.getBoundingClientRect() : sectionRect
        const position = Math.max(0, Math.round((e.clientX - trackRect.left + scrollLeft) / GRID_WIDTH))
        addClip(draggedClip, position)

        if (scrollEl && position * GRID_WIDTH > scrollEl.clientWidth * 0.7) {
          scrollEl.scrollTo({
            left: Math.max(scrollEl.scrollLeft, position * GRID_WIDTH - scrollEl.clientWidth / 2),
            behavior: 'smooth'
          })
        }
      }
    }

    setDraggedClip(null)
  }, [draggedClip])

  const handleEmotionChange = useCallback((clipId: string, label: EmotionLabel) => {
    setEmotion(clipId, label)
    setTimeout(() => {
      if (donutCanvasRef.current && curveCanvasRef.current) {
        renderToCanvases(timelineClips, donutCanvasRef.current, curveCanvasRef.current, {
          hoverIndex: curveHoverIndexRef.current
        })
      }
    }, 0)
  }, [timelineClips])

  const handleCurveCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!curveCanvasRef.current || isPlaying) return
    const canvas = curveCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const nearest = findNearestCurvePoint(x, y, 20)
    if (nearest !== curveHoverIndexRef.current) {
      curveHoverIndexRef.current = nearest
      renderCurveOverlay(canvas, { hoverIndex: nearest })
    }
  }, [isPlaying])

  const handleCurveCanvasMouseLeave = useCallback(() => {
    if (isPlaying) return
    curveHoverIndexRef.current = null
    if (curveCanvasRef.current) {
      renderCurveOverlay(curveCanvasRef.current, { hoverIndex: null })
    }
  }, [isPlaying])

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

        <section className="timeline-section" ref={timelineSectionRef}>
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
            <canvas ref={donutCanvasRef} className="donut-canvas" width={120} height={120} />
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
                ref={curveCanvasRef}
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
            left: clonePos.x,
            top: clonePos.y,
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
            willChange: 'left, top',
            userSelect: 'none'
          }}
        >
          {draggedClip.name}
        </div>
      )}
    </div>
  )
}
