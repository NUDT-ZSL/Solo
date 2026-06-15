import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useLyricStore, parseLyrics, LyricLine } from '../store/useLyricStore'
import { eventBus, EVENT_TYPES } from '../utils/eventBus'

interface DragState {
  isDragging: boolean
  lyricId: string | null
  startX: number
  initialStartTime: number
  initialEndTime: number
}

const TimelineEditor: React.FC = () => {
  const {
    lyrics,
    setLyrics,
    selectedLyricId,
    setSelectedLyricId,
    updateLyricTime,
    totalDuration,
    setTotalDuration,
    currentTime,
    setCurrentTime,
  } = useLyricStore()

  const [isDragOver, setIsDragOver] = useState(false)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    lyricId: null,
    startX: 0,
    initialStartTime: 0,
    initialEndTime: 0,
  })

  const timelineRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const parsedLyrics = parseLyrics(text)
        setLyrics(parsedLyrics)
        const newDuration = Math.max(
          60,
          parsedLyrics.length > 0
            ? parsedLyrics[parsedLyrics.length - 1].endTime + 10
            : 60
        )
        setTotalDuration(newDuration)
        eventBus.emit(EVENT_TYPES.LYRIC_TIMELINE_UPDATED, parsedLyrics)
      }
      reader.readAsText(file)
    },
    [setLyrics, setTotalDuration]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.txt')) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload]
  )

  const handleTimebarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, lyric: LyricLine) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedLyricId(lyric.id)
      eventBus.emit(EVENT_TYPES.LYRIC_SELECTED, lyric.id)
      setDragState({
        isDragging: true,
        lyricId: lyric.id,
        startX: e.clientX,
        initialStartTime: lyric.startTime,
        initialEndTime: lyric.endTime,
      })
    },
    [setSelectedLyricId]
  )

  const handleTimelineMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.isDragging || !dragState.lyricId || !timelineRef.current) {
        return
      }

      const rect = timelineRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragState.startX
      const pixelsPerSecond = rect.width / totalDuration
      const deltaTime = deltaX / pixelsPerSecond

      let newStartTime = dragState.initialStartTime + deltaTime
      let newEndTime = dragState.initialEndTime + deltaTime

      const duration = dragState.initialEndTime - dragState.initialStartTime

      if (newStartTime < 0) {
        newStartTime = 0
        newEndTime = duration
      }
      if (newEndTime > totalDuration) {
        newEndTime = totalDuration
        newStartTime = totalDuration - duration
      }

      updateLyricTime(dragState.lyricId, newStartTime, newEndTime)
    },
    [dragState, totalDuration, updateLyricTime]
  )

  const handleTimelineMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        lyricId: null,
        startX: 0,
        initialStartTime: 0,
        initialEndTime: 0,
      })
      eventBus.emit(EVENT_TYPES.LYRIC_TIMELINE_UPDATED, lyrics)
    }
  }, [dragState.isDragging, lyrics])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.lyricId || !timelineRef.current) {
        return
      }

      const rect = timelineRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragState.startX
      const pixelsPerSecond = rect.width / totalDuration
      const deltaTime = deltaX / pixelsPerSecond

      let newStartTime = dragState.initialStartTime + deltaTime
      let newEndTime = dragState.initialEndTime + deltaTime

      const duration = dragState.initialEndTime - dragState.initialStartTime

      if (newStartTime < 0) {
        newStartTime = 0
        newEndTime = duration
      }
      if (newEndTime > totalDuration) {
        newEndTime = totalDuration
        newStartTime = totalDuration - duration
      }

      updateLyricTime(dragState.lyricId, newStartTime, newEndTime)
    }

    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        setDragState({
          isDragging: false,
          lyricId: null,
          startX: 0,
          initialStartTime: 0,
          initialEndTime: 0,
        })
        eventBus.emit(EVENT_TYPES.LYRIC_TIMELINE_UPDATED, lyrics)
      }
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragState, totalDuration, updateLyricTime, lyrics])

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || dragState.isDragging) return
      const rect = timelineRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const time = (clickX / rect.width) * totalDuration
      setCurrentTime(Math.max(0, Math.min(time, totalDuration)))
    },
    [totalDuration, setCurrentTime, dragState.isDragging]
  )

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const timeMarkers = []
  const markerInterval = Math.ceil(totalDuration / 10)
  for (let t = 0; t <= totalDuration; t += markerInterval) {
    timeMarkers.push(t)
  }

  return (
    <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          width: '700px',
          height: '160px',
          borderRadius: '16px',
          border: `2px ${isDragOver ? 'solid' : 'dashed'} #b388ff`,
          background: isDragOver ? '#ede7f6' : '#f3e5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          margin: '0 auto',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7e57c2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: '12px' }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span
          style={{
            color: '#5e35b1',
            fontSize: '16px',
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {isDragOver ? '释放以上传歌词文件' : '拖拽TXT歌词文件到这里，或点击选择'}
        </span>
        <span
          style={{
            color: '#7e57c2',
            fontSize: '13px',
            marginTop: '6px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          支持 .txt 格式
        </span>
      </div>

      <div
        style={{
          background: '#263238',
          borderRadius: '12px',
          padding: '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '400px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            时间轴编辑器
          </h3>
          <span
            style={{
              color: '#90a4ae',
              fontSize: '13px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {lyrics.length} 句歌词
          </span>
        </div>

        {lyrics.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#546e7a',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            请上传歌词文件开始编辑
          </div>
        ) : (
          <>
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onMouseLeave={handleTimelineMouseUp}
              style={{
                position: 'relative',
                flex: 1,
                background: '#1e2a2e',
                borderRadius: '8px',
                padding: '16px',
                overflow: 'hidden',
                cursor: dragState.isDragging ? 'grabbing' : 'pointer',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '24px',
                    borderBottom: '1px solid #37474f',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 4px',
                  }}
                >
                  {timeMarkers.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        color: '#78909c',
                        fontSize: '11px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      {formatTime(t)}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: '24px',
                    left: `${(currentTime / totalDuration) * 100}%`,
                    width: '2px',
                    height: `calc(100% - 24px)`,
                    background: '#ffb74d',
                    zIndex: 10,
                    pointerEvents: 'none',
                    transition: dragState.isDragging ? 'none' : 'left 0.1s linear',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '-5px',
                      width: '12px',
                      height: '12px',
                      background: '#ffb74d',
                      borderRadius: '50%',
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '0 4px',
                  }}
                >
                  {lyrics.map((lyric, index) => {
                    const leftPercent = (lyric.startTime / totalDuration) * 100
                    const widthPercent =
                      ((lyric.endTime - lyric.startTime) / totalDuration) * 100
                    const isSelected = selectedLyricId === lyric.id
                    const bgColor = index % 2 === 0 ? '#4db6ac' : '#81c784'

                    return (
                      <div
                        key={lyric.id}
                        onMouseDown={(e) => handleTimebarMouseDown(e, lyric)}
                        style={{
                          position: 'relative',
                          height: '32px',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                            height: '32px',
                            borderRadius: '6px',
                            background: bgColor,
                            border: isSelected
                              ? '2px solid #ffb74d'
                              : '2px solid transparent',
                            cursor: dragState.lyricId === lyric.id ? 'grabbing' : 'grab',
                            padding: '0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            boxShadow: isSelected
                              ? '0 4px 12px rgba(255, 183, 77, 0.3)'
                              : '0 2px 6px rgba(0,0,0,0.2)',
                            transition:
                              'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                            willChange: 'transform, left',
                            userSelect: 'none',
                            boxSizing: 'border-box',
                          }}
                          className="time-bar"
                          onMouseEnter={(e) => {
                            if (!dragState.isDragging) {
                              ;(
                                e.currentTarget as HTMLDivElement
                              ).style.transform = 'translateY(-2px)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLDivElement).style.transform =
                              'translateY(0)'
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {lyric.text}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TimelineEditor
