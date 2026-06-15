import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from './store'
import type { GameEngine } from './GameEngine'

interface UIOverlayProps {
  engineRef: React.MutableRefObject<GameEngine | null>
}

export default function UIOverlay({ engineRef }: UIOverlayProps) {
  const score = useGameStore(s => s.score)
  const highScore = useGameStore(s => s.highScore)
  const energy = useGameStore(s => s.energy)
  const maxEnergy = useGameStore(s => s.maxEnergy)
  const isBoosting = useGameStore(s => s.isBoosting)
  const gameState = useGameStore(s => s.gameState)
  const boostAvailable = useGameStore(s => s.boostAvailable)
  const setGameState = useGameStore(s => s.setGameState)

  const [displayScore, setDisplayScore] = useState(0)
  const [endScore, setEndScore] = useState(0)
  const [endHighScore, setEndHighScore] = useState(0)
  const scoreRef = useRef(0)
  const animFrameRef = useRef(0)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (gameState !== 'playing') return

    const animate = () => {
      setDisplayScore(prev => {
        const diff = scoreRef.current - prev
        if (Math.abs(diff) < 1) return scoreRef.current
        return prev + diff * 0.15
      })
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  useEffect(() => {
    if (gameState === 'gameover') {
      setEndScore(score)
      setEndHighScore(highScore)
    }
  }, [gameState, score, highScore])

  const handleStart = useCallback(() => {
    setGameState('playing')
  }, [setGameState])

  const handleRestart = useCallback(() => {
    setGameState('playing')
  }, [setGameState])

  const handleBoost = useCallback(() => {
    if (engineRef.current && boostAvailable && !isBoosting) {
      engineRef.current.triggerBoost()
    }
  }, [engineRef, boostAvailable, isBoosting])

  useEffect(() => {
    if (gameState !== 'playing') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          engineRef.current.moveLeft()
          break
        case 'ArrowRight':
        case 'KeyD':
          engineRef.current.moveRight()
          break
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault()
          engineRef.current.jump()
          break
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault()
          engineRef.current.slide()
          break
        case 'Space':
          e.preventDefault()
          engineRef.current.triggerBoost()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, engineRef])

  useEffect(() => {
    if (gameState !== 'playing') return

    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchStartTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!engineRef.current) return
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      const dt = Date.now() - touchStartTime

      if (dt > 500) return

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const threshold = 30

      if (absDx > absDy && absDx > threshold) {
        if (dx < 0) engineRef.current.moveLeft()
        else engineRef.current.moveRight()
      } else if (absDy > threshold) {
        if (dy < 0) engineRef.current.jump()
        else engineRef.current.slide()
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [gameState, engineRef])

  const energyPercent = (energy / maxEnergy) * 100

  if (gameState === 'menu') {
    return (
      <div className="ui-overlay menu-overlay">
        <div className="menu-content">
          <h1 className="game-title">
            <span className="title-star">星轨</span>
            <span className="title-track">跃迁</span>
          </h1>
          <p className="subtitle">STAR TRACK TRANSITION</p>
          {highScore > 0 && (
            <p className="high-score-label">最高分: {highScore}</p>
          )}
          <button className="start-btn" onClick={handleStart}>
            启动引擎
          </button>
          <div className="controls-hint">
            <div className="hint-row">
              <kbd>A</kbd>/<kbd>←</kbd> 左移
              <kbd>D</kbd>/<kbd>→</kbd> 右移
            </div>
            <div className="hint-row">
              <kbd>W</kbd>/<kbd>↑</kbd> 跳跃
              <kbd>S</kbd>/<kbd>↓</kbd> 滑铲
            </div>
            <div className="hint-row">
              <kbd>Space</kbd> 加速冲刺
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'gameover') {
    return (
      <div className="ui-overlay gameover-overlay">
        <div className="gameover-panel">
          <h2 className="gameover-title">引擎离线</h2>
          <div className="score-section">
            <div className="score-row">
              <span className="score-label">本次得分</span>
              <span className="score-value">{Math.floor(endScore)}</span>
            </div>
            <div className="score-row">
              <span className="score-label">最高纪录</span>
              <span className="score-value high">{endHighScore}</span>
            </div>
          </div>
          <button className="restart-btn" onClick={handleRestart}>
            重新跃迁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ui-overlay hud-overlay">
      <div className="score-card">
        <span className="hud-score">{Math.floor(displayScore)}</span>
      </div>

      <div className="energy-bar-container">
        <div className="energy-bar-track">
          <div
            className={`energy-bar-fill ${boostAvailable ? 'full' : ''} ${isBoosting ? 'boosting' : ''}`}
            style={{ width: `${isBoosting ? 100 : energyPercent}%` }}
          />
        </div>
        <span className="energy-label">
          {isBoosting ? '冲刺中' : `${energy}/${maxEnergy}`}
        </span>
      </div>

      <button
        className={`boost-btn ${boostAvailable ? 'available' : ''} ${isBoosting ? 'active' : ''}`}
        onClick={handleBoost}
        disabled={!boostAvailable || isBoosting}
      >
        <span className="boost-icon">⚡</span>
      </button>
    </div>
  )
}
