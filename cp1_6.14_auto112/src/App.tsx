import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PuzzleBoard } from './components/PuzzleBoard'
import { ControlPanel } from './components/ControlPanel'
import { gameEngine } from './game/GameEngine'
import { ParticleEffect } from './effects/ParticleEffect'
import { Piece } from './types'

const App: React.FC = () => {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [currentPuzzleId, setCurrentPuzzleId] = useState(1)
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null)
  const particleEffectRef = useRef<ParticleEffect | null>(null)
  const isInitializedRef = useRef(false)

  const initGame = useCallback((puzzleId: number) => {
    const state = gameEngine.initGame(puzzleId)
    setPieces(state.pieces)

    if (effectsCanvasRef.current) {
      const rect = effectsCanvasRef.current.getBoundingClientRect()
      gameEngine.setCanvasSize(rect.width, rect.height)

      if (!particleEffectRef.current) {
        particleEffectRef.current = new ParticleEffect(effectsCanvasRef.current)
      }
      particleEffectRef.current.resize(rect.width, rect.height)
    }
  }, [])

  useEffect(() => {
    if (!isInitializedRef.current && effectsCanvasRef.current) {
      isInitializedRef.current = true
      initGame(currentPuzzleId)
    }
  }, [currentPuzzleId, initGame])

  useEffect(() => {
    return () => {
      gameEngine.destroy()
      particleEffectRef.current?.destroy()
    }
  }, [])

  const handlePiecesChange = useCallback(() => {
    setPieces(gameEngine.getPieces())
  }, [])

  const handlePuzzleChange = (puzzleId: number) => {
    setCurrentPuzzleId(puzzleId)
    initGame(puzzleId)
  }

  const handleHint = () => {
    gameEngine.getHint()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#11111b',
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      <h1
        style={{
          color: '#cdd6f4',
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #89b4fa, #cba6f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        PixelFusion
      </h1>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          maxWidth: '1200px',
          margin: '0 auto',
          flexDirection: 'row',
          '@media (max-width: 768px)': {
            flexDirection: 'column-reverse'
          }
        } as React.CSSProperties}
      >
        <ControlPanel
          puzzleId={currentPuzzleId}
          onPuzzleChange={handlePuzzleChange}
          onHint={handleHint}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <PuzzleBoard
            pieces={pieces}
            onPiecesChange={handlePiecesChange}
            effectsCanvasRef={effectsCanvasRef}
          />
        </div>
      </div>
    </div>
  )
}

export default App
