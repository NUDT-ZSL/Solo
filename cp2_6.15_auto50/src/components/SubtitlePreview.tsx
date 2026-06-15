import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLyricStore, LyricLine } from '../store/useLyricStore'
import { eventBus, EVENT_TYPES } from '../utils/eventBus'
import { exportSRT, exportASS } from '../utils/exporter'

const TYPEWRITER_INTERVAL = 0.06
const SCROLL_DISTANCE = 30
const SCROLL_DURATION = 0.4

interface DisplayLyric extends LyricLine {
  displayChars: number
  scrollProgress: number
  status: 'pending' | 'playing' | 'played'
}

const SubtitlePreview: React.FC = () => {
  const {
    lyrics,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    style,
    setFontSize,
    totalDuration,
  } = useLyricStore()

  const [displayLyrics, setDisplayLyrics] = useState<DisplayLyric[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    const unsubscribe = eventBus.on(
      EVENT_TYPES.LYRIC_TIMELINE_UPDATED,
      (updatedLyrics: LyricLine[]) => {
        setDisplayLyrics(
          updatedLyrics.map((lyric) => ({
            ...lyric,
            displayChars: 0,
            scrollProgress: 0,
            status: 'pending',
          }))
        )
      }
    )
    return unsubscribe
  }, [])

  useEffect(() => {
    setDisplayLyrics(
      lyrics.map((lyric) => ({
        ...lyric,
        displayChars: 0,
        scrollProgress: 0,
        status: 'pending',
      }))
    )
  }, [lyrics])

  const updateDisplayLyrics = useCallback(
    (time: number) => {
      setDisplayLyrics((prev) =>
        prev.map((lyric) => {
          const duration = lyric.endTime - lyric.startTime
          const progress = Math.max(
            0,
            Math.min(1, (time - lyric.startTime) / Math.max(duration, 0.001))
          )
          const typewriterDuration = Math.min(
            duration * 0.7,
            lyric.text.length * TYPEWRITER_INTERVAL
          )
          const typewriterProgress = Math.min(
            1,
            Math.max(0, (time - lyric.startTime) / Math.max(typewriterDuration, 0.001))
          )
          const displayChars = Math.ceil(typewriterProgress * lyric.text.length)

          let status: DisplayLyric['status'] = 'pending'
          let scrollProgress = 0

          if (time >= lyric.endTime) {
            status = 'played'
            const timeSinceEnd = time - lyric.endTime
            scrollProgress = Math.min(1, timeSinceEnd / SCROLL_DURATION)
          } else if (time >= lyric.startTime) {
            status = 'playing'
          }

          return {
            ...lyric,
            displayChars,
            scrollProgress,
            status,
          }
        })
      )
    },
    []
  )

  useEffect(() => {
    if (!isPlaying) {
      updateDisplayLyrics(currentTime)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      setCurrentTime((prevTime) => {
        const newTime = prevTime + deltaTime
        if (newTime >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }
        updateDisplayLyrics(newTime)
        return newTime
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = 0
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, totalDuration, setCurrentTime, setIsPlaying, updateDisplayLyrics])

  useEffect(() => {
    if (!isPlaying) {
      updateDisplayLyrics(currentTime)
    }
  }, [currentTime, isPlaying, updateDisplayLyrics])

  const handlePlayPause = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
    eventBus.emit(EVENT_TYPES.PLAYBACK_STATE_CHANGED, !isPlaying)
  }

  const handleReset = () => {
    setCurrentTime(0)
    setIsPlaying(false)
    lastTimeRef.current = 0
    eventBus.emit(EVENT_TYPES.PLAYBACK_STATE_CHANGED, false)
  }

  const handleExportSRT = () => {
    exportSRT(lyrics)
  }

  const handleExportASS = () => {
    exportASS(lyrics, style.fontSize)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const activeLyrics = displayLyrics.filter(
    (l) => l.status !== 'pending' || l.scrollProgress < 1
  )

  return (
    <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          background: '#1e1e1e',
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
            字幕预览
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid #424242',
                background: '#2a2a2a',
                color: '#e0e0e0',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#333'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#2a2a2a'
              }}
            >
              重置
            </button>
            <button
              onClick={handlePlayPause}
              style={{
                padding: '8px 20px',
                borderRadius: '12px',
                border: 'none',
                background: isPlaying ? '#ef5350' : '#66bb6a',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              }}
            >
              {isPlaying ? '暂停' : '播放'}
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: '#121212',
            borderRadius: '8px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '320px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              color: '#757575',
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>

          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '16px',
              width: '100px',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden',
              alignSelf: 'center',
              marginTop: '6px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(currentTime / totalDuration) * 100}%`,
                background: '#ffb74d',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              width: '100%',
              willChange: 'transform, opacity',
            }}
          >
            {activeLyrics.length === 0 ? (
              <div
                style={{
                  color: '#424242',
                  fontSize: style.fontSize,
                  fontFamily: style.fontFamily,
                  textAlign: 'center',
                }}
              >
                {lyrics.length === 0
                  ? '上传歌词后在此预览动态字幕效果'
                  : '点击播放开始预览'}
              </div>
            ) : (
              activeLyrics.map((lyric) => {
                const translateY =
                  lyric.status === 'played'
                    ? -SCROLL_DISTANCE * lyric.scrollProgress
                    : 0
                const opacity =
                  lyric.status === 'played'
                    ? 0.3 * (1 - lyric.scrollProgress)
                    : lyric.status === 'playing'
                    ? 1
                    : 0.3

                const textToShow =
                  lyric.status === 'played'
                    ? lyric.text
                    : lyric.text.slice(0, lyric.displayChars)

                return (
                  <div
                    key={lyric.id}
                    style={{
                      fontSize: `${style.fontSize}px`,
                      fontFamily: style.fontFamily,
                      color: lyric.status === 'playing' ? style.color : '#aaa',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                      opacity,
                      transform: `translateY(${translateY}px)`,
                      transition:
                        lyric.status === 'played'
                          ? `opacity ${SCROLL_DURATION}s ease-out, transform ${SCROLL_DURATION}s ease-out`
                          : 'none',
                      textAlign: 'center',
                      lineHeight: 1.5,
                      maxWidth: '90%',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {textToShow}
                    {lyric.status === 'playing' &&
                      lyric.displayChars < lyric.text.length && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: '2px',
                            height: `${style.fontSize}px`,
                            background: style.color,
                            marginLeft: '2px',
                            verticalAlign: 'middle',
                            animation: 'blink 0.8s infinite',
                          }}
                        />
                      )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}</style>
      </div>

      <div
        style={{
          background: '#1e1e1e',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <label
              style={{
                color: '#e0e0e0',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              字体大小
            </label>
            <span
              style={{
                color: '#ffb74d',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {style.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min="12"
            max="48"
            step="2"
            value={style.fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#333',
              outline: 'none',
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #b388ff;
              cursor: pointer;
              transition: all 0.2s ease;
              border: 2px solid #fff;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.1);
              box-shadow: 0 0 10px rgba(179, 136, 255, 0.5);
            }
            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #b388ff;
              cursor: pointer;
              border: 2px solid #fff;
              transition: all 0.2s ease;
            }
          `}</style>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={handleExportSRT}
            disabled={lyrics.length === 0}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: lyrics.length === 0 ? '#333' : '#4db6ac',
              color: lyrics.length === 0 ? '#666' : '#fff',
              cursor: lyrics.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (lyrics.length > 0) {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            导出 SRT
          </button>
          <button
            onClick={handleExportASS}
            disabled={lyrics.length === 0}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: lyrics.length === 0 ? '#333' : '#81c784',
              color: lyrics.length === 0 ? '#666' : '#fff',
              cursor: lyrics.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (lyrics.length > 0) {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            导出 ASS
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubtitlePreview
