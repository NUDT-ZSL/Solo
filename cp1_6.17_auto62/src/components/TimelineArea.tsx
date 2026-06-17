import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { TimelineClip } from '../types'
import { GRID_WIDTH, EMOTION_LABELS_CN } from '../types'
import { useStore } from '../store/useStore'
import {
  addClip,
  removeClip,
  moveClip,
  resizeClip,
  snapToGrid,
  calculateTotalDuration
} from '../modules/timeline/TimelineManager'

interface DragState {
  type: 'move' | 'resize' | null
  instanceId: string | null
  startX: number
  startPosition: number
  startDuration: number
}

export const TimelineArea: React.FC = () => {
  const timelineClips = useStore((state) => state.timelineClips)
  const playbackPosition = useStore((state) => state.playbackPosition)
  const isPlaying = useStore((state) => state.isPlaying)
  const presetClips = useStore((state) => state.presetClips)

  const trackRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    instanceId: null,
    startX: 0,
    startPosition: 0,
    startDuration: 0
  })
  const [ghostPosition, setGhostPosition] = useState<number | null>(null)
  const [ghostWidth, setGhostWidth] = useState<number>(0)

  const totalDuration = calculateTotalDuration(timelineClips)
  const trackWidth = Math.max(20, totalDuration + 10) * GRID_WIDTH

  const getTrackPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft || 0
    return (clientX - rect.left + scrollLeft) / GRID_WIDTH
  }, [])

  const handleTrackDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const position = getTrackPosition(e.clientX)
    const snapped = snapToGrid(Math.max(0, position))
    setGhostPosition(snapped)

    const dragData = e.dataTransfer.types.includes('clip-id')
    if (dragData) {
      const clipId = e.dataTransfer.getData('clip-id')
      const presetClip = presetClips.find((c) => c.id === clipId)
      if (presetClip) {
        setGhostWidth(presetClip.duration * GRID_WIDTH)
      }
    }
  }, [getTrackPosition, presetClips])

  const handleTrackDragLeave = useCallback(() => {
    setGhostPosition(null)
  }, [])

  const handleTrackDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setGhostPosition(null)

    const clipId = e.dataTransfer.getData('clip-id')
    if (!clipId) return

    const presetClip = presetClips.find((c) => c.id === clipId)
    if (!presetClip) return

    const position = getTrackPosition(e.clientX)
    addClip(presetClip, position)
  }, [getTrackPosition, presetClips])

  const handleClipMouseDown = useCallback((
    e: React.MouseEvent,
    clip: TimelineClip,
    type: 'move' | 'resize'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    setDragState({
      type,
      instanceId: clip.instanceId,
      startX: e.clientX,
      startPosition: clip.position,
      startDuration: clip.duration
    })

    if (type === 'move') {
      setGhostPosition(clip.position)
      setGhostWidth(clip.duration * GRID_WIDTH)
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.type === null || !dragState.instanceId) return

    const deltaX = (e.clientX - dragState.startX) / GRID_WIDTH

    if (dragState.type === 'move') {
      const newPosition = snapToGrid(Math.max(0, dragState.startPosition + deltaX))
      setGhostPosition(newPosition)
    } else if (dragState.type === 'resize') {
      const newDuration = Math.min(5, Math.max(1, snapToGrid(dragState.startDuration + deltaX)))
      setGhostWidth(newDuration * GRID_WIDTH)
    }
  }, [dragState])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (dragState.type === null || !dragState.instanceId) return

    const deltaX = (e.clientX - dragState.startX) / GRID_WIDTH

    if (dragState.type === 'move') {
      const newPosition = snapToGrid(Math.max(0, dragState.startPosition + deltaX))
      moveClip(dragState.instanceId, newPosition)
    } else if (dragState.type === 'resize') {
      const newDuration = Math.min(5, Math.max(1, snapToGrid(dragState.startDuration + deltaX)))
      resizeClip(dragState.instanceId, newDuration)
    }

    setDragState({ type: null, instanceId: null, startX: 0, startPosition: 0, startDuration: 0 })
    setGhostPosition(null)
    setGhostWidth(0)
  }, [dragState])

  const handleClipDoubleClick = useCallback((instanceId: string) => {
    removeClip(instanceId)
  }, [])

  useEffect(() => {
    if (dragState.type !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState.type, handleMouseMove, handleMouseUp])

  const isClipHighlighted = (clip: TimelineClip): boolean => {
    if (!isPlaying) return false
    return playbackPosition >= clip.position && playbackPosition < clip.position + clip.duration
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
          style={{
            position: 'relative',
            height: '100px',
            minWidth: '100%',
            width: trackWidth,
            backgroundColor: '#2D2D2D',
            borderRadius: '8px',
            transition: 'background-color 0.2s ease'
          }}
          onDragOver={handleTrackDragOver}
          onDragLeave={handleTrackDragLeave}
          onDrop={handleTrackDrop}
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
              const isDragging = dragState.instanceId === clip.instanceId && dragState.type === 'move'
              const isResizing = dragState.instanceId === clip.instanceId && dragState.type === 'resize'
              const isHighlighted = isClipHighlighted(clip)

              return (
                <div
                  key={clip.instanceId}
                  className="timeline-clip"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: clip.position * GRID_WIDTH,
                    width: clip.duration * GRID_WIDTH - 2,
                    height: '40px',
                    backgroundColor: clip.color,
                    borderRadius: '6px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    border: isHighlighted ? '1px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                    transition: 'opacity 0.2s ease, border 0.2s ease, transform 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    userSelect: 'none',
                    boxShadow: isHighlighted ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                    transform: isResizing ? 'none' : 'none',
                    zIndex: isHighlighted ? 2 : 1
                  }}
                  onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                  onDoubleClick={() => handleClipDoubleClick(clip.instanceId)}
                  title={`${clip.name} - ${EMOTION_LABELS_CN[clip.emotionLabel]} (${clip.duration}s)\n双击删除`}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 4px'
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
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize')}
                  />
                </div>
              )
            })}

            {ghostPosition !== null && dragState.type === 'move' && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: ghostPosition * GRID_WIDTH,
                  width: ghostWidth - 2,
                  height: '40px',
                  backgroundColor: 'rgba(255, 107, 107, 0.3)',
                  borderRadius: '6px',
                  border: '2px dashed #FF6B6B',
                  pointerEvents: 'none'
                }}
              />
            )}

            {ghostPosition !== null && dragState.type === null && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: ghostPosition * GRID_WIDTH,
                  width: ghostWidth - 2,
                  height: '40px',
                  backgroundColor: 'rgba(78, 205, 196, 0.3)',
                  borderRadius: '6px',
                  border: '2px dashed #4ECDC4',
                  pointerEvents: 'none'
                }}
              />
            )}

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
