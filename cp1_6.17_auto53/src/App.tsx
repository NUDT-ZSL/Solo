import { useEffect, useCallback } from 'react'
import { useGameStore } from './GameLogic'
import MazeView from './components/MazeView'
import SoundControl from './components/SoundControl'
import type { WaveType } from './types'

const WAVE_ICONS: Record<WaveType, string> = {
  sine: '∿',
  square: '⊓',
  triangle: '△',
}

export default function App() {
  const level = useGameStore(s => s.level)
  const collectedFragments = useGameStore(s => s.collectedFragments)
  const fragments = useGameStore(s => s.fragments)
  const timeRemaining = useGameStore(s => s.timeRemaining)
  const currentFrequency = useGameStore(s => s.currentFrequency)
  const currentWaveType = useGameStore(s => s.currentWaveType)
  const isPaused = useGameStore(s => s.isPaused)
  const isLevelComplete = useGameStore(s => s.isLevelComplete)
  const isGameOver = useGameStore(s => s.isGameOver)
  const isGameComplete = useGameStore(s => s.isGameComplete)
  const score = useGameStore(s => s.score)
  const wrongFrequencyCount = useGameStore(s => s.wrongFrequencyCount)
  const movePlayer = useGameStore(s => s.movePlayer)
  const togglePause = useGameStore(s => s.togglePause)
  const startGame = useGameStore(s => s.startGame)
  const startLevel = useGameStore(s => s.startLevel)
  const stopWave = useGameStore(s => s.stopWave)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      togglePause()
      return
    }

    if (isGameOver && e.key === 'r') {
      startGame()
      return
    }

    if (isLevelComplete && e.key === 'Enter') {
      if (level >= 3) {
        useGameStore.setState({ isGameComplete: true })
      } else {
        stopWave()
        startLevel(level + 1)
      }
      return
    }

    if (isPaused || isGameOver || isLevelComplete) return

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault()
        movePlayer(0, -1)
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault()
        movePlayer(0, 1)
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault()
        movePlayer(-1, 0)
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault()
        movePlayer(1, 0)
        break
    }
  }, [togglePause, isPaused, isGameOver, isLevelComplete, level, movePlayer, startGame, startLevel, stopWave])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    startGame()
  }, [])

  const totalFragments = fragments.length
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = Math.floor(timeRemaining % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  if (isGameComplete) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0A0E27',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
      }}>
        <h1 style={{ color: '#FFD54F', fontSize: 48, marginBottom: 20 }}>通关成功！</h1>
        <p style={{ fontSize: 24, marginBottom: 10 }}>总分: {score}</p>
        <p style={{ fontSize: 16, color: '#888', marginBottom: 30 }}>恭喜你完成了所有关卡</p>
        <button
          onClick={() => startGame()}
          style={{
            background: '#00E5FF',
            color: '#0A0E27',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.transform = 'scale(1.1)'
            ;(e.target as HTMLElement).style.boxShadow = '0 0 16px rgba(0, 229, 255, 0.5)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.transform = 'scale(1)'
            ;(e.target as HTMLElement).style.boxShadow = 'none'
          }}
        >
          重新开始
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0A0E27',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(26, 28, 59, 0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'sans-serif' }}>
            关卡 {level}/3
          </span>
          <span style={{ color: '#FFD54F', fontSize: 12, fontFamily: 'sans-serif' }}>
            碎片 {collectedFragments}/{totalFragments}
          </span>
          <span style={{ color: timeRemaining < 30 ? '#FF5722' : '#FFFFFF', fontSize: 12, fontFamily: 'sans-serif' }}>
            {timeStr}
          </span>
          {wrongFrequencyCount > WRONG_FREQ_THRESHOLD && (
            <span style={{ color: '#FF5722', fontSize: 11, fontFamily: 'sans-serif' }}>
              失误 -{wrongFrequencyCount - WRONG_FREQ_THRESHOLD}次
            </span>
          )}
          <span style={{ color: '#00E5FF', fontSize: 12, fontFamily: 'sans-serif' }}>
            分数: {score}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'sans-serif' }}>
            {currentFrequency}Hz
          </span>
          <span style={{ fontSize: 16 }}>{WAVE_ICONS[currentWaveType]}</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <MazeView />
      </div>

      <div style={{
        padding: '8px 16px 12px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <SoundControl />
      </div>
    </div>
  )
}

const WRONG_FREQ_THRESHOLD = 3
