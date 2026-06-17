import React, { useRef, useState, useCallback, useEffect } from 'react'
import type { TimelineClip } from '../types'
import { GRID_WIDTH, EMOTION_LABELS_CN } from '../types'
import { useStore } from '../store/useStore'
import {
  removeClip,
  moveClip,
  resizeClip,
  snapToGrid,
  calculateTotalDuration
} from '../modules/timeline/TimelineManager'

interface DragState {
  type: 'move' | 'resize' | null
  instanceId: string | null
  startClientX: number
  startScrollLeft: number
  startPosition: number
  startDuration: number
  startRightEdge: number
  currentClientX: number
  currentScrollLeft: number
}

export const TimelineArea: React.FC = () => {
  const timelineClips = useStore((state) => state.timelineClips)
  const playbackPosition = useStore((state) => state.playbackPosition)
  const isPlaying = useStore((state) => state.isPlaying)

  const trackRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState>({
    type: null,
    instanceId: null,
    startClientX: 0,
    startScrollLeft: 0,
    startPosition: 0,
    startDuration: 0,
    startRightEdge: 0,
    currentClientX: 0,
    currentScrollLeft: 0
  })
  const rafRef = useRef<number>(0)
  const [previewState, setPreviewState] = useState<{
    instanceId: string | null
    type: 'move' | 'resize' | null
    position: number
    duration: number
  } | null>(null)

  const totalDuration = calculateTotalDuration(timelineClips)
  const trackWidth = Math.max(20, totalDuration + 10) * GRID_WIDTH

  const getTrackPositionFromClientX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft || 0
    return (clientX - rect.left + scrollLeft) / GRID_WIDTH
  }, [])

  const processDragFrame = useCallback(() => {
    const ds = dragStateRef.current
    if (ds.type === null || ds.instanceId === null) {
      rafRef.current = requestAnimationFrame(processDragFrame)
      return
    }

    const currentScrollLeft = scrollRef.current?.scrollLeft || 0

    if (ds.type === 'move') {
      const deltaClientX = ds.currentClientX - ds.startClientX
      const deltaScroll = currentScrollLeft - ds.startScrollLeft
      const deltaGrids = (deltaClientX + deltaScroll) / GRID_WIDTH
      const newPosition = Math.max(0, snapToGrid(ds.startPosition + deltaGrids))

      setPreviewState({
        instanceId: ds.instanceId,
        type: 'move',
        position: newPosition,
        duration: ds.startDuration
      })
    } else if (ds.type === 'resize') {
      const mouseTrackPosition = getTrackPositionFromClientX(ds.currentClientX)
      const newLeftPosition = Math.max(0, snapToGrid(mouseTrackPosition))
      const rightEdge = ds.startRightEdge
      let newDuration = Math.round(rightEdge - newLeftPosition)
      newDuration = Math.min(5, Math.max(1, newDuration))
      const actualLeftPosition = rightEdge - newDuration

      setPreviewState({
        instanceId: ds.instanceId,
        type: 'resize',
        position: actualLeftPosition,
        duration: newDuration
      })
    }

    rafRef.current = requestAnimationFrame(processDragFrame)
  }, [getTrackPositionFromClientX])

  const handleClipPointerDown = useCallback((
    e: React.PointerEvent,
    clip: TimelineClip,
    type: 'move' | 'resize'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    const scrollLeft = scrollRef.current?.scrollLeft || 0
    const ds: DragState = {
      type,
      instanceId: clip.instanceId,
      startClientX: e.clientX,
      startScrollLeft: scrollLeft,
      startPosition: clip.position,
      startDuration: clip.duration,
      startRightEdge: clip.position + clip.duration,
      currentClientX: e.clientX,
      currentScrollLeft: scrollLeft
    }
    dragStateRef.current = ds

    setPreviewState({
      instanceId: clip.instanceId,
      type,
      position: clip.position,
      duration: clip.duration
    })

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(processDragFrame)
  }, [processDragFrame])

  const handleClipPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragStateRef.current
    if (ds.type === null) return
    dragStateRef.current = {
      ...ds,
      currentClientX: e.clientX,
      currentScrollLeft: scrollRef.current?.scrollLeft || 0
    }
  }, [])

  const handleClipPointerUp = useCallback((e: React.PointerEvent) => {
    const ds = dragStateRef.current
    if (ds.type === null || !ds.instanceId) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    const currentScrollLeft = scrollRef.current?.scrollLeft || 0

    if (ds.type === 'move') {
      const deltaClientX = e.clientX - ds.startClientX
      const deltaScroll = currentScrollLeft - ds.startScrollLeft
      const deltaGrids = (deltaClientX + deltaScroll) / GRID_WIDTH
      const newPosition = Math.max(0, snapToGrid(ds.startPosition + deltaGrids))
      if (newPosition !== ds.startPosition) {
        moveClip(ds.instanceId, newPosition)
      }
    } else if (ds.type === 'resize') {
      const mouseTrackPosition = getTrackPositionFromClientX(e.clientX)
      const newLeftPosition = Math.max(0, snapToGrid(mouseTrackPosition))
      const rightEdge = ds.startRightEdge
      let newDuration = Math.round(rightEdge - newLeftPosition)
      newDuration = Math.min(5, Math.max(1, newDuration))
      const actualLeftPosition = rightEdge - newDuration

      if (newDuration !== ds.startDuration) {
        moveClip(ds.instanceId, actualLeftPosition)
        resizeClip(ds.instanceId, newDuration)
      }
    }

    dragStateRef.current = {
      type: null,
      instanceId: null,
      startClientX: 0,
      startScrollLeft: 0,
      startPosition: 0,
      startDuration: 0,
      startRightEdge: 0,
      currentClientX: 0,
      currentScrollLeft: 0
    }
    setPreviewState(null)
  }, [getTrackPositionFromClientX])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(processDragFrame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [processDragFrame])

  const handleClipDoubleClick = useCallback((instanceId: string) => {
    removeClip(instanceId)
  }, [])

  const isClipHighlighted = (clip: TimelineClip): boolean => {
    if (!isPlaying) return false
    return playbackPosition >= clip.position && playbackPosition < clip.position + clip.duration
  }

  const getClipDisplayState = (clip: TimelineClip) => {
    if (previewState && previewState.instanceId === clip.instanceId) {
      return {
        position: previewState.position,
        duration: previewState.duration,
        opacity: previewState.type === 'move' ? 0.5 : 1
      }
    }
    return {
      position: clip.position,
      duration: clip.duration,
      opacity: 1
    }
  }

  const renderRuler = () => {
    const marks = []
    for (let i = 0; i <= Math.max(totalDuration, 10); i++) {
      marks.push(
        <div
          key={i}
          className="ruler-mark"
          style={{
            position: 'absolute',
            left: i * GRID_WIDTH,
            bottom: 0,
            width: 1,
            height: i % 5 === 0 ? 20 : 10,
            backgroundColor: '#4A4A6A'
          }}
        >
          {i % 5 === 0 && (
            <span style={{
              position: 'absolute',
              bottom: 22,
              left: -10,
              fontSize: '10px',
              color: '#B0B0B0'
            }}>
              {i}s
            </span>
          )}
        </div>
      )
    }
    return marks
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '0 4px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#E0E0E0' }}>
          时间线轨道
        </h3>
        <span style={{ fontSize: '12px', color: '#B0B0B0' }}>
          总时长: <strong style={{ color: '#FF6B6B' }}>{totalDuration}s</strong>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="timeline-scroll-container"
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          borderRadius: '8px',
          backgroundColor: '#2D2D2D',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4A4A6A #2D2D2D'
        }}
      >
        <div
          ref={trackRef}
          className="timeline-track"
          style={{
            position: 'relative',
            height: '100px',
            minWidth: '100%',
            width: trackWidth,
            backgroundColor: '#2D2D2D',
            borderRadius: '8px'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            pointerEvents: 'none'
          }}>
            {timelineClips.map((clip) => {
              const display = getClipDisplayState(clip)
              const isHighlighted = isClipHighlighted(clip)
              const isResizing = previewState?.instanceId === clip.instanceId && previewState.type === 'resize'

              return (
                <div
                  key={clip.instanceId}
                  className="timeline-clip"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: display.position * GRID_WIDTH,
                    width: display.duration * GRID_WIDTH - 2,
                    height: '40px',
                    backgroundColor: clip.color,
                    borderRadius: '6px',
                    cursor: previewState?.instanceId === clip.instanceId ? 'grabbing' : 'grab',
                    opacity: display.opacity,
                    border: isHighlighted ? '1px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                    transition: isResizing || previewState?.type === 'move'
                      ? 'opacity 0.1s ease'
                      : 'opacity 0.2s ease, border 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    userSelect: 'none',
                    boxShadow: isHighlighted ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                    zIndex: isHighlighted || isResizing ? 3 : 1,
                    pointerEvents: 'auto',
                    touchAction: 'none',
                    willChange: isResizing || previewState?.type === 'move' ? 'left, width' : 'auto'
                  }}
                  onPointerDown={(e) => handleClipPointerDown(e, clip, 'move')}
                  onPointerMove={handleClipPointerMove}
                  onPointerUp={handleClipPointerUp}
                  onDoubleClick={() => handleClipDoubleClick(clip.instanceId)}
                  title={`${clip.name} - ${EMOTION_LABELS_CN[clip.emotionLabel]} (${clip.duration}s)\n双击删除`}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 4px',
                    pointerEvents: 'none'
                  }}>
                    {clip.name}
                  </span>
                  <div
                    className="resize-handle"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '-6px',
                      transform: 'translateY(-50%)',
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      cursor: 'ew-resize',
                      border: '2px solid #2D2D2D',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                      zIndex: 5
                    }}
                    onPointerDown={(e) => handleClipPointerDown(e, clip, 'resize')}
                    onPointerMove={handleClipPointerMove}
                    onPointerUp={handleClipPointerUp}
                  />
                  {isResizing && (
                    <span style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      color: '#FF6B6B',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {previewState?.duration}s
                    </span>
                  )}
                </div>
              )
            })}

            {isPlaying && (
              <div
                className="playhead"
                style={{
                  position: 'absolute',
                  top: '-5px',
                  left: playbackPosition * GRID_WIDTH - 10,
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '20px solid #FF4136',
                  pointerEvents: 'none',
                  zIndex: 10,
                  filter: 'drop-shadow(0 2px 4px rgba(255,65,54,0.5))'
                }}
              />
            )}

            {isPlaying && (
              <div
                style={{
                  position: 'absolute',
                  top: '15px',
                  left: playbackPosition * GRID_WIDTH,
                  width: '2px',
                  height: '70px',
                  backgroundColor: '#FF4136',
                  pointerEvents: 'none',
                  zIndex: 9,
                  opacity: 0.7
                }}
              />
            )}
          </div>

          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            backgroundColor: '#252540',
            borderTop: '1px solid #3A3A5A'
          }}>
            {renderRuler()}
          </div>
        </div>
      </div>

      <p style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#808080',
        textAlign: 'center'
      }}>
        拖拽素材到轨道 · 拖动色块移动位置 · 拖动左侧圆点调整时长 · 双击删除
      </p>
    </div>
  )
}
