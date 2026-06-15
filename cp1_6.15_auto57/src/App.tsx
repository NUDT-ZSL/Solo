import { useState, useRef, useEffect, useCallback } from 'react'
import WaveformCanvas from './WaveformCanvas'
import BeatSequencePanel from './BeatSequencePanel'
import { mergeBeatSequences } from './utils/beatMixer'
import type { BeatPoint, BeatSequence } from './utils/types'

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3']
const SEQUENCE_NAMES = ['红色序列', '青色序列', '黄色序列', '绿色序列']

export default function App() {
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [beatPoints, setBeatPoints] = useState<BeatPoint[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const [beatCount, setBeatCount] = useState(0)
  const [countAnimating, setCountAnimating] = useState(false)

  const [sequences, setSequences] = useState<BeatSequence[]>([])
  const [mergedPoints, setMergedPoints] = useState<BeatPoint[]>([])
  const [showMerged, setShowMerged] = useState(false)
  const [mergeAnimating, setMergeAnimating] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const animationFrameRef = useRef<number>(0)

  const loadAudio = async () => {
    if (!audioUrl.trim()) {
      setError('请输入音频URL')
      return
    }

    setIsLoading(true)
    setError('')
    setBeatPoints([])
    setSequences([])
    setMergedPoints([])
    setShowMerged(false)

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error('无法加载音频文件')
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setCurrentTime(0)
      pauseTimeRef.current = 0
    } catch (err: any) {
      setError(err.message || '加载音频失败')
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }

    const source = audioContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContextRef.current.destination)
    source.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      pauseTimeRef.current = 0
    }

    source.start(0, pauseTimeRef.current)
    startTimeRef.current = audioContextRef.current.currentTime - pauseTimeRef.current
    sourceNodeRef.current = source

    setIsPlaying(true)

    const updateTime = () => {
      if (audioContextRef.current && sourceNodeRef.current) {
        const time = audioContextRef.current.currentTime - startTimeRef.current
        if (time < duration) {
          setCurrentTime(time)
          animationFrameRef.current = requestAnimationFrame(updateTime)
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateTime)
  }, [audioBuffer, duration])

  const pauseAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    pauseTimeRef.current = currentTime
    setIsPlaying(false)
  }, [currentTime])

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }

  const handleSeek = (time: number) => {
    const wasPlaying = isPlaying
    if (wasPlaying) {
      pauseAudio()
    }
    setCurrentTime(time)
    pauseTimeRef.current = time
    if (wasPlaying) {
      setTimeout(() => playAudio(), 0)
    }
  }

  const handleBeatAdd = (time: number) => {
    const color = COLORS[colorIndex]
    const newPoint: BeatPoint = { time, color }

    setBeatPoints(prev => {
      const newPoints = [...prev, newPoint].sort((a, b) => a.time - b.time)
      return newPoints
    })

    setCountAnimating(true)
    setBeatCount(prev => prev + 1)
    setTimeout(() => setCountAnimating(false), 200)

    setColorIndex((colorIndex + 1) % COLORS.length)
  }

  const handleBeatRemove = (index: number) => {
    setBeatPoints(prev => {
      const newPoints = [...prev]
      newPoints.splice(index, 1)
      return newPoints
    })

    setCountAnimating(true)
    setBeatCount(prev => prev - 1)
    setTimeout(() => setCountAnimating(false), 200)
  }

  const saveCurrentSequence = () => {
    if (beatPoints.length === 0) return

    const newSequence: BeatSequence = {
      id: `seq-${Date.now()}`,
      points: [...beatPoints],
      color: COLORS[(colorIndex - 1 + COLORS.length) % COLORS.length],
      name: SEQUENCE_NAMES[sequences.length % SEQUENCE_NAMES.length] || `序列 ${sequences.length + 1}`
    }

    setSequences(prev => [...prev, newSequence])
    setBeatPoints([])
    setBeatCount(0)
  }

  const handleReorder = (newSequences: BeatSequence[]) => {
    setSequences(newSequences)
  }

  const handleMerge = () => {
    if (sequences.length < 2) return

    const pointArrays = sequences.map(seq => seq.points)
    const merged = mergeBeatSequences(pointArrays)

    setMergeAnimating(true)
    setMergedPoints(merged)
    setShowMerged(true)

    setTimeout(() => setMergeAnimating(false), 500)
  }

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop()
        sourceNodeRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎵 音乐节拍标注与混音工具</h1>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.waveformSection}>
          <div style={styles.inputSection}>
            <input
              type="text"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="粘贴音频文件URL (支持 mp3, wav 格式)"
              style={styles.urlInput}
              onKeyDown={(e) => e.key === 'Enter' && loadAudio()}
            />
            <button
              onClick={loadAudio}
              disabled={isLoading}
              style={{
                ...styles.loadButton,
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? '加载中...' : '加载音频'}
            </button>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.waveformContainer}>
            {audioBuffer ? (
              <>
                <div style={styles.waveformHeader}>
                  <span style={styles.waveformLabel}>原始波形</span>
                  <div style={styles.beatCounter}>
                    <span
                      style={{
                        ...styles.beatCount,
                        transform: countAnimating ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      {beatCount}
                    </span>
                    <span style={styles.beatCountLabel}>个节拍点</span>
                  </div>
                </div>

                <WaveformCanvas
                  audioBuffer={audioBuffer}
                  currentTime={currentTime}
                  duration={duration}
                  beatPoints={beatPoints}
                  onBeatAdd={handleBeatAdd}
                  onBeatRemove={handleBeatRemove}
                  onSeek={handleSeek}
                  isPlaying={isPlaying}
                  height={200}
                />

                <div style={styles.controlsSection}>
                  <div style={styles.timeDisplay}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

                  <div style={styles.buttonGroup}>
                    <button
                      onClick={togglePlayPause}
                      style={{
                        ...styles.playButton,
                        transform: 'scale(1)',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.9)'
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      {isPlaying ? '⏸ 暂停' : '▶ 播放'}
                    </button>

                    <button
                      onClick={saveCurrentSequence}
                      disabled={beatPoints.length === 0}
                      style={{
                        ...styles.saveButton,
                        opacity: beatPoints.length === 0 ? 0.5 : 1,
                        cursor: beatPoints.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      保存为序列
                    </button>
                  </div>

                  <div style={styles.colorIndicator}>
                    <span style={styles.colorLabel}>当前颜色：</span>
                    <div
                      style={{
                        ...styles.colorPreview,
                        backgroundColor: COLORS[colorIndex]
                      }}
                    />
                  </div>
                </div>

                {showMerged && (
                  <div
                    style={{
                      ...styles.mergedSection,
                      opacity: mergeAnimating ? 0 : 1,
                      transform: mergeAnimating ? 'translateY(20px)' : 'translateY(0)',
                      transition: 'all 0.5s ease'
                    }}
                  >
                    <div style={styles.waveformHeader}>
                      <span style={styles.waveformLabel}>混合节奏波形</span>
                      <span style={styles.mergedCount}>
                        {mergedPoints.length} 个节拍
                      </span>
                    </div>
                    <WaveformCanvas
                      audioBuffer={audioBuffer}
                      currentTime={currentTime}
                      duration={duration}
                      beatPoints={mergedPoints}
                      onBeatAdd={() => {}}
                      onBeatRemove={() => {}}
                      onSeek={handleSeek}
                      isPlaying={isPlaying}
                      waveformColor="#95E1D3"
                      showProgressBar={false}
                      height={120}
                    />
                  </div>
                )}
              </>
            ) : (
              <div style={styles.placeholder}>
                <div style={styles.placeholderIcon}>🎧</div>
                <p style={styles.placeholderText}>输入音频URL开始使用</p>
                <p style={styles.placeholderHint}>支持 mp3 和 wav 格式</p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.panelSection}>
          <BeatSequencePanel
            sequences={sequences}
            onReorder={handleReorder}
            onMerge={handleMerge}
            currentColorIndex={colorIndex}
          />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1A1A2E',
    color: '#E0E0E0',
    padding: '20px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    height: 'calc(100vh - 100px)'
  },
  waveformSection: {
    flex: '0 0 70%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  panelSection: {
    flex: '0 0 calc(30% - 20px)',
    minWidth: '280px'
  },
  inputSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px'
  },
  urlInput: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: '#16213E',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    borderRadius: '8px',
    color: '#E0E0E0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  loadButton: {
    padding: '12px 24px',
    backgroundColor: '#6C63FF',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  error: {
    padding: '12px',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '8px',
    color: '#FF6B6B',
    fontSize: '14px'
  },
  waveformContainer: {
    flex: 1,
    backgroundColor: '#16213E',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid rgba(108, 99, 255, 0.3)',
    boxShadow: '0 0 30px rgba(108, 99, 255, 0.1)',
    overflowY: 'auto'
  },
  waveformHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  waveformLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#E0E0E0'
  },
  beatCounter: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px'
  },
  beatCount: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#FF6584'
  },
  beatCountLabel: {
    fontSize: '12px',
    color: 'rgba(224, 224, 224, 0.6)'
  },
  controlsSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  timeDisplay: {
    fontSize: '14px',
    color: 'rgba(224, 224, 224, 0.7)',
    fontFamily: 'monospace'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px'
  },
  playButton: {
    padding: '12px 28px',
    backgroundColor: '#FF6584',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  saveButton: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#6C63FF',
    border: '1px solid #6C63FF',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  colorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  colorLabel: {
    fontSize: '12px',
    color: 'rgba(224, 224, 224, 0.6)'
  },
  colorPreview: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    boxShadow: '0 0 10px currentColor'
  },
  mergedSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px dashed rgba(255, 255, 255, 0.1)'
  },
  mergedCount: {
    fontSize: '12px',
    color: '#95E1D3'
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    textAlign: 'center'
  },
  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  placeholderText: {
    fontSize: '18px',
    color: 'rgba(224, 224, 224, 0.7)',
    margin: '0 0 8px 0'
  },
  placeholderHint: {
    fontSize: '14px',
    color: 'rgba(224, 224, 224, 0.4)',
    margin: 0
  }
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @media (max-width: 768px) {
    .main-content {
      flex-direction: column !important;
      height: auto !important;
    }
    .waveform-section,
    .panel-section {
      flex: 1 1 100% !important;
      width: 100% !important;
    }
    .panel-section {
      min-height: 300px;
    }
  }
`
document.head.appendChild(styleSheet)
