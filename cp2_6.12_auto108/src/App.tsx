import { useState, useCallback, useEffect } from 'react'
import GameCanvas from './components/GameCanvas'
import ControlPanel from './components/ControlPanel'
import HUD from './components/HUD'
import { GameEngineCallbacks } from './game/GameEngine'
import { recordScore, getHighScore } from './api/gameApi'

function App() {
  const [initialVx, setInitialVx] = useState(2)
  const [initialVy, setInitialVy] = useState(1)
  const [isLaunched, setIsLaunched] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const [fuel, setFuel] = useState(100)
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [fps, setFps] = useState(60)
  const [highScore, setHighScore] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [layoutSeed, setLayoutSeed] = useState('')

  useEffect(() => {
    getHighScore().then((data) => {
      setHighScore(data.highScore)
    })
  }, [])

  const handleGameOver = useCallback(async (gameScore: number, seed: string) => {
    setFinalScore(gameScore)
    setIsGameOver(true)
    setLayoutSeed(seed)

    const result = await recordScore(gameScore, seed)
    if (result.success && result.highScore > highScore) {
      setHighScore(result.highScore)
    }
  }, [highScore])

  const callbacks: GameEngineCallbacks = {
    onScoreChange: setScore,
    onFuelChange: setFuel,
    onSpeedChange: setSpeed,
    onFPSUpdate: setFps,
    onGameOver: handleGameOver,
  }

  const handleLaunch = useCallback(() => {
    setIsLaunched(true)
  }, [])

  const handleLaunchComplete = useCallback(() => {
  }, [])

  const handleReset = useCallback(() => {
    setIsReset(true)
  }, [])

  const handleResetComplete = useCallback(() => {
    setIsReset(false)
    setIsLaunched(false)
    setIsGameOver(false)
    setScore(0)
    setFuel(100)
    setSpeed(0)
  }, [])

  const handleRestart = useCallback(() => {
    handleReset()
  }, [handleReset])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GameCanvas
        initialVx={initialVx}
        initialVy={initialVy}
        isLaunched={isLaunched}
        isReset={isReset}
        onLaunch={handleLaunchComplete}
        onResetComplete={handleResetComplete}
        callbacks={callbacks}
      />
      <ControlPanel
        initialVx={initialVx}
        initialVy={initialVy}
        fuel={fuel}
        fps={fps}
        isLaunched={isLaunched}
        isGameOver={isGameOver}
        onVxChange={setInitialVx}
        onVyChange={setInitialVy}
        onLaunch={handleLaunch}
        onReset={handleReset}
      />
      <HUD
        score={score}
        speed={speed}
        fuel={fuel}
        highScore={highScore}
        isGameOver={isGameOver}
        finalScore={finalScore}
        onRestart={handleRestart}
      />
    </div>
  )
}

export default App
