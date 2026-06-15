import React, { useState, useRef, useCallback } from 'react'
import GameCanvas, { GameCanvasHandle, GameUIState } from './components/GameCanvas'
import HUD from './components/HUD'
import SkillPanel from './components/SkillPanel'

const initialState: GameUIState = {
  health: 3,
  energy: 0,
  score: 0,
  gameOver: false,
  skills: [
    { name: '天穹护盾', key: 'Q', ready: false, cooldown: 0, maxCooldown: 0 },
    { name: '星爆脉冲', key: 'E', ready: false, cooldown: 0, maxCooldown: 0 },
  ],
}

const App: React.FC = () => {
  const canvasRef = useRef<GameCanvasHandle>(null)
  const [gameState, setGameState] = useState<GameUIState>(initialState)

  const handleActivateSkill = useCallback((index: number) => {
    canvasRef.current?.activateSkill(index)
  }, [])

  const handleRestart = useCallback(() => {
    canvasRef.current?.restart()
  }, [])

  return (
    <div className="game-container">
      <GameCanvas ref={canvasRef} onStateChange={setGameState} />
      <div className="hud-overlay">
        <HUD
          health={gameState.health}
          energy={gameState.energy}
          score={gameState.score}
          gameOver={gameState.gameOver}
          onRestart={handleRestart}
        />
        <SkillPanel
          skills={gameState.skills}
          onActivateSkill={handleActivateSkill}
        />
        <div className="touch-controls" id="touchControls">
          <div className="joystick-zone" id="joystickZone">
            <div className="joystick-base" id="joystickBase">
              <div className="joystick-thumb" id="joystickThumb" />
            </div>
          </div>
          <div className="touch-action-zone">
            <button className="touch-btn touch-fire" id="touchFire">射击</button>
            <button className="touch-btn touch-skill" id="touchSkill0">Q</button>
            <button className="touch-btn touch-skill" id="touchSkill1">E</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
