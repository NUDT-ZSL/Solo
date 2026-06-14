import React, { useState, useEffect } from 'react'
import { eventBus } from '../eventBus'
import { gameEngine } from '../game/GameEngine'
import { PuzzleData } from '../types'

interface ControlPanelProps {
  puzzleId: number
  onPuzzleChange: (id: number) => void
  onHint: () => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ puzzleId, onPuzzleChange, onHint }) => {
  const [time, setTime] = useState(0)
  const [score, setScore] = useState(0)
  const [puzzles, setPuzzles] = useState<PuzzleData[]>([])
  const [isHintPressed, setIsHintPressed] = useState(false)

  useEffect(() => {
    setPuzzles(gameEngine.getPuzzles())
  }, [])

  useEffect(() => {
    const handleTimeChanged = (newTime: unknown) => {
      setTime(newTime as number)
    }

    const handleScoreChanged = (newScore: unknown) => {
      setScore(newScore as number)
    }

    eventBus.on('timeChanged', handleTimeChanged)
    eventBus.on('scoreChanged', handleScoreChanged)

    return () => {
      eventBus.off('timeChanged', handleTimeChanged)
      eventBus.off('scoreChanged', handleScoreChanged)
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const handleHintClick = () => {
    setIsHintPressed(true)
    setTimeout(() => setIsHintPressed(false), 150)
    onHint()
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPuzzleChange(Number(e.target.value))
  }

  return (
    <div className="control-panel">
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#cdd6f4',
            marginBottom: '4px'
          }}
        >
          {formatTime(time)}
        </div>
        <div style={{ fontSize: '12px', color: '#6c7086' }}>时间</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '20px',
            color: '#a6e3a1',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: '12px', color: '#6c7086' }}>分数</div>
      </div>

      <button
        onClick={handleHintClick}
        style={{
          width: '100px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: '#89b4fa',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          transform: isHintPressed ? 'scale(0.95)' : 'scale(1)',
          alignSelf: 'center',
          ':hover': {
            backgroundColor: '#b4d0ff'
          }
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#b4d0ff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#89b4fa'
        }}
      >
        提示 (-5分)
      </button>

      <div style={{ marginTop: 'auto' }}>
        <label
          style={{
            fontSize: '12px',
            color: '#6c7086',
            display: 'block',
            marginBottom: '4px'
          }}
        >
          选择画作
        </label>
        <select
          value={puzzleId}
          onChange={handleSelectChange}
          style={{
            width: '100%',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#313244',
            color: '#cdd6f4',
            border: '1px solid #45475a',
            padding: '0 8px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        >
          {puzzles.map((puzzle) => (
            <option key={puzzle.id} value={puzzle.id}>
              {puzzle.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
