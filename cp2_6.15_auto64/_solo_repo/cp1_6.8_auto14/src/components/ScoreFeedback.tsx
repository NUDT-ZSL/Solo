import React from 'react'
import { useGameStore } from '../store/gameStore'

export const ScoreFeedback: React.FC = () => {
  const { feedbackText, feedbackTimer, feedbackQuality } = useGameStore()

  if (feedbackTimer <= 0) return null

  let color = '#E84545'
  if (feedbackQuality === 'perfect') color = '#FFD93D'
  else if (feedbackQuality === 'good') color = '#7ED321'

  const yOffset = (1 - feedbackTimer) * -25

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 select-none pointer-events-none"
      style={{
        top: '15%',
        opacity: feedbackTimer,
        transform: `translateX(-50%) translateY(${yOffset}px)`,
      }}
    >
      <span
        className="text-3xl font-bold"
        style={{
          color,
          textShadow: `0 0 20px ${color}80, 0 2px 4px rgba(0,0,0,0.5)`,
          fontFamily: '"Georgia", serif',
        }}
      >
        {feedbackText}
      </span>
    </div>
  )
}
