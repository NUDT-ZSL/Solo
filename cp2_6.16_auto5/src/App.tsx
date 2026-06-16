import React, { useState, useCallback, useEffect, useRef } from 'react'
import Simulation, { PlacedInstrument } from './Simulation'
import AnalyticsPanel from './AnalyticsPanel'
import { INSTRUMENTS, FrequencyBin } from './utils'

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 640
const INSTRUMENT_RADIUS = 24

const App: React.FC = () => {
  const [placedInstruments, setPlacedInstruments] = useState<PlacedInstrument[]>([])
  const [spectrum, setSpectrum] = useState<FrequencyBin[]>([])
  const [volume, setVolume] = useState<number>(75)
  const [reverb, setReverb] = useState<number>(35)
  const [presetPlaying, setPresetPlaying] = useState<boolean>(false)
  const [hoveredInstrumentId, setHoveredInstrumentId] = useState<number | null>(null)
  const scoreAnimRef = useRef<Map<string, { target: number; current: number; startTime: number }>>(new Map())

  const placeInstrument = useCallback((instrumentIndex: number) => {
    if (placedInstruments.some(p => p.instrumentIndex === instrumentIndex)) return
    if (placedInstruments.length >= 4) return

    const existingCount = placedInstruments.length
    const positions = [
      { x: 240, y: 200 },
      { x: 720, y: 200 },
      { x: 240, y: 440 },
      { x: 720, y: 440 }
    ]

    const pos = positions[existingCount]
    const newInstrument: PlacedInstrument = {
      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      instrumentIndex,
      x: pos.x,
      y: pos.y,
      originalX: pos.x,
      originalY: pos.y,
      isPlaying: false,
      playStartTime: 0,
      score: 0,
      showScore: false
    }

    setPlacedInstruments(prev => [...prev, newInstrument])
  }, [placedInstruments])

  const removeInstrument = useCallback((instrumentIndex: number) => {
    setPlacedInstruments(prev => prev.filter(p => p.instrumentIndex !== instrumentIndex))
  }, [])

  const onSpectrumUpdate = useCallback((newSpectrum: FrequencyBin[]) => {
    setSpectrum(newSpectrum)
  }, [])

  const onScoreUpdate = useCallback((id: string, targetScore: number) => {
    scoreAnimRef.current.set(id, {
      target: targetScore,
      current: 0,
      startTime: performance.now()
    })

    setPlacedInstruments(prev => prev.map(inst =>
      inst.id === id ? { ...inst, showScore: true, score: 0 } : inst
    ))

    const animateScore = () => {
      let allDone = true
      setPlacedInstruments(prev => prev.map(inst => {
        const anim = scoreAnimRef.current.get(inst.id)
        if (anim && anim.current < anim.target) {
          const elapsed = performance.now() - anim.startTime
          const duration = 1500
          const progress = Math.min(1, elapsed / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          const newCurrent = Math.round(anim.target * eased)
          anim.current = newCurrent
          if (newCurrent < anim.target) allDone = false
          return { ...inst, score: newCurrent }
        }
        return inst
      }))

      if (!allDone) {
        requestAnimationFrame(animateScore)
      }
    }

    requestAnimationFrame(animateScore)
  }, [])

  const triggerPresetMode = useCallback(() => {
    if (presetPlaying) return

    setPlacedInstruments([])
    scoreAnimRef.current.clear()

    setTimeout(() => {
      const cornerPositions = [
        { idx: 0, x: 180, y: 160 },
        { idx: 1, x: 780, y: 160 },
        { idx: 2, x: 180, y: 480 },
        { idx: 3, x: 780, y: 480 }
      ]

      const newInstruments: PlacedInstrument[] = cornerPositions.map(pos => ({
        id: `preset-${pos.idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        instrumentIndex: pos.idx,
        x: pos.x,
        y: pos.y,
        originalX: pos.x,
        originalY: pos.y,
        isPlaying: false,
        playStartTime: 0,
        score: 0,
        showScore: false
      }))

      setPlacedInstruments(newInstruments)

      setTimeout(() => {
        setPresetPlaying(true)
      }, 300)
    }, 50)

    setTimeout(() => {
      setPresetPlaying(false)
    }, 12000)
  }, [presetPlaying])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes soundBar {
        0% { height: 20%; }
        100% { height: 90%; }
      }
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 0 rgba(233, 69, 96, 0); }
        50% { box-shadow: 0 0 24px rgba(233, 69, 96, 0.5); }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div style={appStyle}>
      <div style={mainWrapperStyle}>
        <div style={leftAreaStyle}>
          <div style={topBarStyle}>
            <div style={titleContainerStyle}>
              <div style={logoStyle}>
                <span style={{ fontSize: 24 }}>🎵</span>
              </div>
              <div>
                <h1 style={mainTitleStyle}>古代乐器声学模拟器</h1>
                <p style={subtitleStyle}>Ancient Instrument Acoustics Simulator</p>
              </div>
            </div>

            <button
              onClick={triggerPresetMode}
              disabled={presetPlaying}
              style={{
                ...presetButtonStyle,
                ...(presetPlaying ? presetButtonActiveStyle : {})
              }}
              onMouseEnter={(e) => {
                if (!presetPlaying) {
                  e.currentTarget.style.filter = 'brightness(1.2)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)'
              }}
            >
              {presetPlaying ? (
                <>
                  <span style={btnIconStyle}>♪</span>
                  <span>合奏播放中...</span>
                </>
              ) : (
                <>
                  <span style={btnIconStyle}>🎼</span>
                  <span>预设合奏模式</span>
                </>
              )}
            </button>
          </div>

          <div style={instrumentPickerStyle}>
            <div style={pickerLabelStyle}>
              <span style={pickerTitleStyle}>乐器库</span>
              <span style={pickerSubtitleStyle}>点击放置 · 右键移除</span>
            </div>
            <div style={pickerButtonsStyle}>
              {INSTRUMENTS.map((inst, idx) => {
                const isPlaced = placedInstruments.some(p => p.instrumentIndex === idx)
                const isHovered = hoveredInstrumentId === idx
                return (
                  <div
                    key={inst.id}
                    style={{
                      ...pickerItemContainerStyle,
                      opacity: isPlaced ? 0.5 : 1,
                      transform: isHovered && !isPlaced ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                    onMouseEnter={() => setHoveredInstrumentId(idx)}
                    onMouseLeave={() => setHoveredInstrumentId(null)}
                  >
                    <button
                      onClick={() => placeInstrument(idx)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        removeInstrument(idx)
                      }}
                      disabled={isPlaced}
                      style={{
                        ...pickerItemStyle,
                        borderColor: isHovered && !isPlaced ? inst.color : 'rgba(255,255,255,0.1)',
                        boxShadow: isHovered && !isPlaced ? `0 4px 20px ${inst.color}40` : 'none'
                      }}
                    >
                      <div style={{
                        ...pickerIconStyle,
                        background: `radial-gradient(circle at 30% 30%, ${inst.color}, ${inst.color}99)`
                      }}>
                        <span style={pickerIconTextStyle}>{inst.symbol}</span>
                      </div>
                      <div style={pickerInfoStyle}>
                        <span style={pickerNameStyle}>{inst.name}</span>
                        <span style={pickerFreqStyle}>{inst.frequency.toFixed(0)}Hz</span>
                      </div>
                      {isPlaced && (
                        <div style={placedBadgeStyle}>✓ 已放置</div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={simulationContainerStyle}>
            <Simulation
              placedInstruments={placedInstruments}
              setPlacedInstruments={setPlacedInstruments}
              volume={volume}
              reverb={reverb}
              onSpectrumUpdate={onSpectrumUpdate}
              onScoreUpdate={onScoreUpdate}
              presetPlaying={presetPlaying}
            />
            <div style={canvasHintStyle}>
              <span>沙盒场景 · 960 × 640</span>
              <span style={hintDividerStyle}>|</span>
              <span>{placedInstruments.length}/4 乐器</span>
            </div>
          </div>
        </div>

        <AnalyticsPanel
          spectrum={spectrum}
          placedInstruments={placedInstruments}
          volume={volume}
          reverb={reverb}
          onVolumeChange={setVolume}
          onReverbChange={setReverb}
        />
      </div>
    </div>
  )
}

const appStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  padding: 0,
  minWidth: 1024
}

const mainWrapperStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  maxWidth: 1360,
  minHeight: '100vh',
  gap: 0
}

const leftAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 24px',
  gap: 16,
  minWidth: 0
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0'
}

const titleContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12
}

const logoStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: 'linear-gradient(135deg, #e94560 0%,