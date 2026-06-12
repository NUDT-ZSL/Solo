import React, { useState, useCallback, useRef, useEffect } from 'react'
import Toolbar from './components/Toolbar'
import Canvas from './components/Canvas'
import { generateMusic } from './utils/musicGenerator'
import { MOOD_PALETTES, DEFAULT_BLOB_SIZE } from './constants'
import type { InkBlob, HSLColor, MoodPalette, MusicControls, TonePreset } from './types'

const App: React.FC = () => {
  const [blobs, setBlobs] = useState<InkBlob[]>([])
  const [selectedPalette, setSelectedPalette] = useState<MoodPalette | null>(null)
  const [currentColor, setCurrentColor] = useState<HSLColor | null>(null)
  const [brushSize, setBrushSize] = useState<number>(DEFAULT_BLOB_SIZE)
  const [isEyedropperActive, setIsEyedropperActive] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [tonePreset, setTonePreset] = useState<TonePreset>('piano')
  const [triggeredBlobIndices, setTriggeredBlobIndices] = useState<Set<number>>(new Set())
  const [statusMessage, setStatusMessage] = useState<string>('')

  const musicControlsRef = useRef<MusicControls | null>(null)
  const flashTimersRef = useRef<Map<number, number>>(new Map())

  const handlePaletteSelect = useCallback((palette: MoodPalette) => {
    setSelectedPalette(palette)
    if (!currentColor && palette.colors.length > 0) {
      setCurrentColor(palette.colors[0])
    }
  }, [currentColor])

  const handleColorPick = useCallback((color: HSLColor) => {
    setCurrentColor(color)
    setIsEyedropperActive(false)
  }, [])

  const handleCanvasColorPick = useCallback((color: HSLColor) => {
    setCurrentColor(color)
    setIsEyedropperActive(false)
  }, [])

  const handleBlobAdd = useCallback((blob: InkBlob) => {
    setBlobs(prev => [...prev, blob])
  }, [])

  const handleClearCanvas = useCallback(() => {
    musicControlsRef.current?.stop()
    setIsPlaying(false)
    setBlobs([])
    setTriggeredBlobIndices(new Set())
    flashTimersRef.current.forEach(t => clearTimeout(t))
    flashTimersRef.current.clear()
    musicControlsRef.current = null
    setStatusMessage('画布已清空')
    setTimeout(() => setStatusMessage(''), 2000)
  }, [])

  const flashBlob = useCallback((blobIndex: number) => {
    setTriggeredBlobIndices(prev => {
      const next = new Set(prev)
      next.add(blobIndex)
      return next
    })

    const existingTimer = flashTimersRef.current.get(blobIndex)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = window.setTimeout(() => {
      setTriggeredBlobIndices(prev => {
        const next = new Set(prev)
        next.delete(blobIndex)
        return next
      })
      flashTimersRef.current.delete(blobIndex)
    }, 300)

    flashTimersRef.current.set(blobIndex, timer)
  }, [])

  const handleGenerateMusic = useCallback(async () => {
    if (blobs.length === 0) {
      setStatusMessage('请先在画布上创作一些墨团~')
      setTimeout(() => setStatusMessage(''), 2500)
      return
    }

    if (musicControlsRef.current?.isPlaying()) {
      musicControlsRef.current.stop()
      setIsPlaying(false)
      return
    }

    setIsGenerating(true)
    setStatusMessage('正在分析画作，生成旋律...')

    try {
      setTimeout(async () => {
        const canvasWidth = 1600
        const canvasHeight = 1200

        const controls = generateMusic(
          blobs, canvasWidth, canvasHeight, tempo, tonePreset)

        controls.onNoteTrigger(flashBlob)

        musicControlsRef.current = controls
        await controls.start()
        setIsPlaying(true)
        setIsGenerating(false)
        setStatusMessage('🎵 旋律已生成，正在播放...')
        setTimeout(() => setStatusMessage(''), 3000)
      }, 300)
    } catch (err) {
      console.error('生成音乐失败', err)
      setIsGenerating(false)
      setStatusMessage('生成失败，请重试')
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }, [blobs, tempo, tonePreset, flashBlob])

  useEffect(() => {
    if (musicControlsRef.current) {
      musicControlsRef.current.setTempo(tempo)
    }
  }, [tempo])

  useEffect(() => {
    if (musicControlsRef.current) {
      musicControlsRef.current.setTone(tonePreset)
    }
  }, [tonePreset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') {
        setIsEyedropperActive(p => !p)
      }
      if (e.key === ' ') {
        e.preventDefault()
        handleGenerateMusic()
      }
      if (e.key === 'Escape') {
        setIsEyedropperActive(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleGenerateMusic])

  useEffect(() => {
    return () => {
      musicControlsRef.current?.stop()
      flashTimersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <div style={styles.app}>
      <Toolbar
        selectedPaletteId={selectedPalette?.id ?? null}
        currentColor={currentColor}
        brushSize={brushSize}
        isEyedropperActive={isEyedropperActive}
        onPaletteSelect={handlePaletteSelect}
        onColorPick={handleColorPick}
        onBrushSizeChange={setBrushSize}
        onEyedropperToggle={setIsEyedropperActive}
      />

      <div style={styles.main}>
        <Canvas
          blobs={blobs}
          selectedPalette={selectedPalette}
          currentColor={currentColor}
          brushSize={brushSize}
          triggeredBlobIndices={triggeredBlobIndices}
          onBlobAdd={handleBlobAdd}
          onCanvasColorPick={handleCanvasColorPick}
          isEyedropperActive={isEyedropperActive}
        />

        <div style={styles.controlPanel}>
          <div style={styles.controlSection}>
            <div style={styles.controlRow}>
              <div style={styles.controlCol}>
                <div style={styles.controlLabelRow}>
                  <span style={styles.controlLabel}>🎵 播放速度</span>
                  <span style={styles.controlValue}>{(tempo / 120).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={240}
                  value={tempo}
                  onChange={e => setTempo(Number(e.target.value))}
                  style={styles.slider}
                />
                <div style={styles.sliderTicks}>
                  <span>0.5x</span>
                  <span>1x</span>
                  <span>2x</span>
                </div>
              </div>

              <div style={styles.controlCol}>
                <div style={styles.controlLabelRow}>
                  <span style={styles.controlLabel}>🎹 音色</span>
                </div>
                <div style={styles.toneButtons}>
                  {(['piano', 'strings', 'synth'] as TonePreset[]).map(preset => (
                    <button
                      key={preset}
                      style={{
                        ...styles.toneButton,
                        ...(tonePreset === preset ? styles.toneButtonActive : {})
                      }}
                      onClick={() => setTonePreset(preset)}
                    >
                      {preset === 'piano' ? '🎹 钢琴' : preset === 'strings' ? '🎻 弦乐' : '🎛️ 合成器'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button
              style={{
                ...styles.primaryButton,
                ...(isGenerating ? styles.primaryButtonDisabled : {}),
                ...(isPlaying ? styles.primaryButtonPlaying : {})
              }}
              onClick={handleGenerateMusic}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span style={styles.spinner}>⏳</span>
                  生成中...
                </>
              ) : isPlaying ? (
                <>
                  <span>⏹</span>
                  停止播放
                </>
              ) : (
                <>
                  <span>🎵</span>
                  生成音乐
                </>
              )}
            </button>

            <button
              style={styles.secondaryButton}
              onClick={handleClearCanvas}
              disabled={blobs.length === 0}
            >
              <span>🗑️</span>
              清空画布
            </button>
          </div>
        </div>

        {statusMessage && (
          <div style={styles.toast}>
            {statusMessage}
          </div>
        )}

        {isEyedropperActive && (
          <div style={styles.eyedropperHint}>
            💧 吸管模式 · 点击画布或色板取色 · 按 Esc 退出
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: '#1a1a2e',
    overflow: 'hidden'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    position: 'relative'
  },
  controlPanel: {
    padding: '16px 32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(22, 33, 62, 0.6)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  },
  controlSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  controlRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    maxWidth: 900,
    width: '100%',
    margin: '0 auto'
  },
  controlCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  controlLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(228, 228, 240, 0.85)'
  },
  controlValue: {
    fontSize: 13,
    color: '#93C5FD',
    fontFamily: 'monospace',
    fontWeight: 700
  },
  slider: {
    width: '100%',
    height: 6,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer'
  },
  sliderTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'rgba(228, 228, 240, 0.35)'
  },
  toneButtons: {
    display: 'flex',
    gap: 8
  },
  toneButton: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(228, 228, 240, 0.8)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 200ms ease'
  },
  toneButtonActive: {
    borderColor: 'rgba(96, 165, 250, 0.5)',
    background: 'rgba(96, 165, 250, 0.12)',
    color: '#93C5FD'
  },
  actionRow: {
    display: 'flex',
    gap: 12,
    maxWidth: 900,
    width: '100%',
    margin: '0 auto'
  },
  primaryButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 24px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #60A5FA 0%, #818CF8 50%, #A78BFA 100%)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(96, 165, 250, 0.35)',
    transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    letterSpacing: 0.5
  },
  primaryButtonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 32px rgba(96, 165, 250, 0.45)'
  },
  primaryButtonDisabled: {
    opacity: 0.7,
    cursor: 'wait'
  },
  primaryButtonPlaying: {
    background: 'linear-gradient(135deg, #F87171 0%, #FB923C 50%, #F59E0B 100%)',
    boxShadow: '0 8px 24px rgba(248, 113, 113, 0.35)'
  },
  secondaryButton: {
    padding: '14px 20px',
    borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(228, 228, 240, 0.85)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 200ms ease'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  },
  toast: {
    position: 'absolute',
    top: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 22px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(228, 228, 240, 0.95)',
    fontSize: 13,
    fontWeight: 500,
    zIndex: 50,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    animation: 'fadeInDown 300ms ease-out'
  },
  eyedropperHint: {
    position: 'absolute',
    bottom: 160,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    borderRadius: 999,
    background: 'rgba(96, 165, 250, 0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: 500,
    zIndex: 40,
    pointerEvents: 'none'
  }
}

const keyframesStyle = document.createElement('style')
keyframesStyle.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeInDown {
    from { opacity: 0; transform: translate(-50%, -10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #60A5FA, #A78BFA);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(96, 165, 250, 0.5);
    border: 2px solid rgba(255,255,255,0.3);
    transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #60A5FA, #A78BFA);
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.3);
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.25);
  }
  button:active:not(:disabled):hover {
    transform: translateY(-1px);
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
if (typeof document !== 'undefined') {
  document.head.appendChild(keyframesStyle)
}

export default App
