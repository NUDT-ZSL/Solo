import React from 'react'
import { useGameStore } from '../store/gameStore'

export const ComboDisplay: React.FC = () => {
  const { score, comboAnim } = useGameStore()
  const scale = 1 + comboAnim * 0.3

  return (
    <div className="absolute top-4 left-4 select-none pointer-events-none">
      <div className="flex flex-col items-start">
        <span
          className="text-4xl font-bold text-amber-400 drop-shadow-lg transition-transform duration-100"
          style={{
            transform: `scale(${scale})`,
            textShadow: '0 0 15px rgba(204,119,34,0.6), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {score.combo}
        </span>
        <span
          className="text-xs tracking-widest uppercase mt-1"
          style={{ color: '#8B7355', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          Combo
        </span>
      </div>
    </div>
  )
}
