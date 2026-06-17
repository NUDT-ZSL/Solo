import { useCallback, useState } from 'react'
import { useClimateStore } from '@/store/useClimateStore'
import { useAnimationController } from './AnimationController'

const SPEEDS = [1, 2, 5]

export default function ControlPanel() {
  useAnimationController()

  const currentYear = useClimateStore((s) => s.currentYear)
  const isPlaying = useClimateStore((s) => s.isPlaying)
  const playSpeed = useClimateStore((s) => s.playSpeed)
  const startYear = useClimateStore((s) => s.startYear)
  const endYear = useClimateStore((s) => s.endYear)
  const yearFlash = useClimateStore((s) => s.yearFlash)
  const play = useClimateStore((s) => s.play)
  const pause = useClimateStore((s) => s.pause)
  const setSpeed = useClimateStore((s) => s.setSpeed)
  const setStartYear = useClimateStore((s) => s.setStartYear)
  const setEndYear = useClimateStore((s) => s.setEndYear)
  const resetCamera = useClimateStore((s) => s.resetCamera)
  const setYear = useClimateStore((s) => s.setYear)

  const [dragging, setDragging] = useState<'start' | 'end' | null>(null)

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      if (currentYear >= endYear) {
        setYear(startYear)
      }
      play()
    }
  }, [isPlaying, currentYear, startYear, endYear, play, pause, setYear])

  const handleStartYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value)
      if (val <= endYear) {
        setStartYear(val)
        if (currentYear < val) setYear(val)
      }
    },
    [endYear, currentYear, setStartYear, setYear]
  )

  const handleEndYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value)
      if (val >= startYear) {
        setEndYear(val)
        if (currentYear > val) setYear(val)
      }
    },
    [startYear, currentYear, setEndYear, setYear]
  )

  const trackPercent = (startYear - 1880) / (2023 - 1880) * 100
  const trackEndPercent = (endYear - 1880) / (2023 - 1880) * 100

  return (
    <>
      {yearFlash !== null && (
        <div style={{
          position: 'fixed',
          top: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '48px',
          fontWeight: 200,
          color: '#fff',
          textShadow: '0 0 20px rgba(0,119,182,0.5), 0 0 40px rgba(214,40,40,0.3)',
          zIndex: 100,
          pointerEvents: 'none',
          animation: 'yearFlash 0.5s ease-out forwards',
        }}>
          {yearFlash}
        </div>
      )}

      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: 280,
        background: 'rgba(26, 26, 46, 0.9)',
        borderRadius: 16,
        padding: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 300, letterSpacing: '0.5px' }}>年份范围</span>
          <span style={{ fontSize: 20, color: '#fff', fontWeight: 200, fontVariantNumeric: 'tabular-nums' }}>{currentYear}</span>
        </div>

        <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(to right, #0077B6, #D62828)',
            opacity: 0.3,
          }} />
          <div style={{
            position: 'absolute',
            left: `${trackPercent}%`,
            width: `${trackEndPercent - trackPercent}%`,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(to right, #0077B6, #D62828)',
          }} />
          <input
            type="range"
            min={1880}
            max={2023}
            value={startYear}
            onChange={handleStartYearChange}
            disabled={isPlaying}
            onMouseDown={() => setDragging('start')}
            onMouseUp={() => setDragging(null)}
            style={{
              position: 'absolute',
              width: '100%',
              height: 36,
              background: 'transparent',
              pointerEvents: dragging === 'end' ? 'none' : 'auto',
              WebkitAppearance: 'none',
              appearance: 'none',
              zIndex: dragging === 'start' ? 3 : 2,
              margin: 0,
            }}
            className="range-slider range-slider-start"
          />
          <input
            type="range"
            min={1880}
            max={2023}
            value={endYear}
            onChange={handleEndYearChange}
            disabled={isPlaying}
            onMouseDown={() => setDragging('end')}
            onMouseUp={() => setDragging(null)}
            style={{
              position: 'absolute',
              width: '100%',
              height: 36,
              background: 'transparent',
              pointerEvents: dragging === 'start' ? 'none' : 'auto',
              WebkitAppearance: 'none',
              appearance: 'none',
              zIndex: dragging === 'end' ? 3 : 2,
              margin: 0,
            }}
            className="range-slider range-slider-end"
          />
          <div style={{
            position: 'absolute',
            left: `${trackPercent}%`,
            transform: 'translateX(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 0 3px rgba(0,119,182,0.3)',
            pointerEvents: 'none',
            zIndex: 4,
          }} />
          <div style={{
            position: 'absolute',
            left: `${trackEndPercent}%`,
            transform: 'translateX(-50%)',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 0 3px rgba(214,40,40,0.3)',
            pointerEvents: 'none',
            zIndex: 4,
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginTop: -8 }}>
          <span>{startYear}</span>
          <span>{endYear}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handlePlayPause}
            disabled={isPlaying && currentYear >= endYear}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(22, 33, 62, 0.8)',
              cursor: isPlaying ? 'pointer' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, box-shadow 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#16213E'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(0,255,136,0.2)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22, 33, 62, 0.8)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="2" width="4" height="14" rx="1" fill="#FFD700" />
                <rect x="11" y="2" width="4" height="14" rx="1" fill="#FFD700" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 2L15 9L4 16V2Z" fill="#00FF88" />
              </svg>
            )}
          </button>

          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeed(speed)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: playSpeed === speed ? 'rgba(0,119,182,0.4)' : 'rgba(22, 33, 62, 0.8)',
                  color: playSpeed === speed ? '#fff' : '#94A3B8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: playSpeed === speed ? 600 : 400,
                  transition: 'background 0.2s, color 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (playSpeed !== speed) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#16213E'
                  }
                }}
                onMouseLeave={(e) => {
                  if (playSpeed !== speed) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(22, 33, 62, 0.8)'
                  }
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={resetCamera}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(22, 33, 62, 0.8)',
            color: '#94A3B8',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 400,
            transition: 'background 0.2s, color 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#16213E'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#CBD5E1'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(22, 33, 62, 0.8)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'
          }}
        >
          重置视角
        </button>
      </div>
    </>
  )
}
