import React, { useState, useEffect, useCallback } from 'react'

interface UIPanelProps {
  currentTime: string
  averageNoise: number
  maxNoise: { x: number; z: number; value: number }
  isPlaying: boolean
  onTogglePlay: () => void
  timelineValue: number
  onTimelineChange: (value: number) => void
  totalSnapshots: number
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(30,41,59,0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#f1f5f9',
}

const PlayIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
)

export default function UIPanel({
  currentTime,
  averageNoise,
  maxNoise,
  isPlaying,
  onTogglePlay,
  timelineValue,
  onTimelineChange,
  totalSnapshots,
}: UIPanelProps) {
  const [spinning, setSpinning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handlePlay = useCallback(() => {
    setSpinning(true)
    onTogglePlay()
    setTimeout(() => setSpinning(false), 600)
  }, [onTogglePlay])

  const hoursAgo = Math.round((1 - timelineValue / 100) * 12 * 10) / 10

  const infoCardStyle: React.CSSProperties = {
    ...glassStyle,
    padding: isMobile ? '8px 12px' : '12px 20px',
  }

  const statsInfo = (
    <>
      <div style={infoCardStyle}>
        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px', letterSpacing: '0.5px' }}>当前时间</div>
        <div style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>{currentTime}</div>
        <div style={{ marginTop: '8px', fontSize: '11px', opacity: 0.7, marginBottom: '4px', letterSpacing: '0.5px' }}>平均噪声</div>
        <div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 700, color: '#60a5fa' }}>{Math.round(averageNoise)}<span style={{ fontSize: '12px', fontWeight: 400, opacity: 0.6, marginLeft: '4px' }}>dB</span></div>
      </div>
      <div style={infoCardStyle}>
        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px', letterSpacing: '0.5px' }}>最高噪声街区</div>
        <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 600 }}>街区({maxNoise.x},{maxNoise.z})</div>
        <div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>{maxNoise.value}<span style={{ fontSize: '12px', fontWeight: 400, opacity: 0.6, marginLeft: '4px' }}>dB</span></div>
      </div>
    </>
  )

  const timelineControl = (
    <div style={{
      ...glassStyle,
      padding: isMobile ? '8px 12px' : '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <button
        onClick={handlePlay}
        style={{
          ...glassStyle,
          width: '40px',
          height: '40px',
          minWidth: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid rgba(56,189,248,0.3)',
          color: '#38bdf8',
          transition: 'all 0.2s',
          transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.7)' }}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.6 }}>
          <span>12小时前</span>
          <span>{hoursAgo.toFixed(1)}小时前</span>
          <span>现在</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={timelineValue}
          onChange={e => onTimelineChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, #38bdf8 ${timelineValue}%, rgba(255,255,255,0.1) ${timelineValue}%)`,
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>
      <div style={{ fontSize: '11px', opacity: 0.5, whiteSpace: 'nowrap' }}>
        {totalSnapshots} 快照
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <style>{rangeThumbStyle}</style>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '180px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 8px',
          boxSizing: 'border-box',
          zIndex: 10,
          overflowY: 'auto',
        }}>
          {statsInfo}
        </div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: '180px',
          padding: '8px',
          zIndex: 10,
        }}>
          {timelineControl}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{rangeThumbStyle}</style>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10,
      }}>
        {statsInfo}
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        zIndex: 10,
      }}>
        {timelineControl}
      </div>
    </>
  )
}

const rangeThumbStyle = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #38bdf8;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 8px rgba(56,189,248,0.5);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #38bdf8;
    cursor: pointer;
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 8px rgba(56,189,248,0.5);
  }
`
