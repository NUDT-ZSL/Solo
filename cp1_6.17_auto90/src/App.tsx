import GameCanvas from './GameCanvas'
import HudPanel from './HudPanel'
import { useGameStore } from './gameStore'
import './styles.css'

export default function App() {
  const { totalMiningCount, shipLevel } = useGameStore()

  return (
    <div className="app">
      <div className="status-bar">
        <div className="status-item">
          <span>总采集次数:</span>
          <span>{totalMiningCount}</span>
        </div>
        <div className="status-item">
          <span>飞船等级:</span>
          <span>Lv {shipLevel}</span>
        </div>
      </div>
      <div className="main-container">
        <div className="game-area">
          <GameCanvas />
        </div>
        <HudPanel />
      </div>
    </div>
  )
}
