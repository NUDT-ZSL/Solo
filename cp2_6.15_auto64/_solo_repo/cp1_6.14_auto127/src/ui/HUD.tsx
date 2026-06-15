import React, { useState, useEffect, useRef } from 'react'
import { bridge } from '../Bridge'
import type { GameState } from '../types'

const HUD: React.FC = () => {
  const [speed, setSpeed] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [lives, setLives] = useState<number>(3)
  const [boostActive, setBoostActive] = useState<boolean>(false)
  const [scoreAnimating, setScoreAnimating] = useState<boolean>(false)

  useEffect(() => {
    const handleSpeed = (data: number) => setSpeed(data)
    const handleScore = (data: number) => {
      setScore(data)
      setScoreAnimating(true)
      setTimeout(() => setScoreAnimating(false), 200)
    }
    const handleLives = (data: number) => setLives(data)
    const handleBoost = (data: boolean) => setBoostActive(data)

    bridge.on('engine:speed', handleSpeed)
    bridge.on('engine:score', handleScore)
    bridge.on('engine:lives', handleLives)
    bridge.on('engine:boost', handleBoost)

    return () => {
      bridge.off('engine:speed', handleSpeed)
      bridge.off('engine:score', handleScore)
      bridge.off('engine:lives', handleLives)
      bridge.off('engine:boost', handleBoost)
    }
  }, [])

  const formatSpeed = (s: number): string => {
    return Math.floor(s).toString().padStart(4, '0') + ' km/h'
  }

  const renderHearts = () => {
    const hearts = []
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <svg
          key={i}
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill={i < lives ? '#ff4757' : '#57606f'}
          style={{ margin: '0 4px' }}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      )
    }
    return hearts
  }

  return (
    <div style={containerStyle}>
      <div style={speedStyle}>
        {formatSpeed(speed)}
      </div>

      <div
        style={{
          ...scoreStyle,
          transform: scoreAnimating ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.2s ease-out',
        }}
      >
        {Math.floor(score)}
      </div>

      <div style={livesStyle}>
        {renderHearts()}
      </div>

      {boostActive && (
        <div style={boostStyle}>
          BOOST!
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  color: '#ffffff',
  fontWeight: 'bold',
  fontFamily: 'monospace, sans-serif',
  pointerEvents: 'none',
}

const speedStyle: React.CSSProperties = {
  fontSize: '24px',
  textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff',
}

const scoreStyle: React.CSSProperties = {
  fontSize: '32px',
  textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff',
}

const livesStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
}

const boostStyle: React.CSSProperties = {
  position: 'absolute',
  top: '70px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '28px',
  color: '#ffa502',
  textShadow: '0 0 10px #ffa502, 0 0 20px #ffa502',
  animation: 'boostBlink 0.3s ease-in-out infinite alternate',
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes boostBlink {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }
`
document.head.appendChild(styleSheet)

export default HUD
