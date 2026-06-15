import { useRef } from 'react'
import GameCanvas from './GameCanvas'
import UIOverlay from './UIOverlay'
import type { GameEngine } from './GameEngine'

export default function App() {
  const engineRef = useRef<GameEngine | null>(null)

  return (
    <div className="game-container">
      <GameCanvas engineRef={engineRef} />
      <UIOverlay engineRef={engineRef} />
    </div>
  )
}
