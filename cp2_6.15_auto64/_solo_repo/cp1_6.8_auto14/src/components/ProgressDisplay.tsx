import React from 'react'
import { useGameStore } from '../store/gameStore'
import { STONE_COLORS } from '../types'

export const ProgressDisplay: React.FC = () => {
  const { score } = useGameStore()

  return (
    <div className="absolute top-4 right-4 select-none pointer-events-none">
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          {Array.from({ length: score.totalStones }).map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border-2 transition-all duration-300"
              style={{
                backgroundColor: i < score.activatedStones ? STONE_COLORS[i] : 'transparent',
                borderColor: i < score.activatedStones ? STONE_COLORS[i] : '#6B5B4F',
                boxShadow: i < score.activatedStones ? `0 0 8px ${STONE_COLORS[i]}60` : 'none',
              }}
            />
          ))}
        </div>
        <span
          className="text-xs tracking-wide"
          style={{ color: '#8B7355', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {score.activatedStones} / {score.totalStones}
        </span>
      </div>
    </div>
  )
}
