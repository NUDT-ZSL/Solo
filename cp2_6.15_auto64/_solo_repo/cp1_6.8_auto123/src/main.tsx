import React, { useRef, useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { GameEngine } from './GameEngine'
import { UILayer } from './UILayer'
import './index.css'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [dust, setDust] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const handleRestart = useCallback(() => {
    setGameOver(false)
    setScore(0)
    setLives(3)
    setDust(0)
    if (engineRef.current) {
      engineRef.current.restart()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const engine = new GameEngine(canvas, {
      onScoreChange: (s) => setScore(s),
      onLivesChange: (l) => setLives(l),
      onDustChange: (d) => setDust(d),
      onGameOver: (fs) => {
        setFinalScore(fs)
        setGameOver(true)
      },
    })

    engineRef.current = engine
    engine.start()

    const handleResize = () => {
      const nw = window.innerWidth
      const nh = window.innerHeight
      engine.resize(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      engine.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
      <UILayer
        score={score}
        lives={lives}
        dust={dust}
        gameOver={gameOver}
        finalScore={finalScore}
        onRestart={handleRestart}
      />
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
