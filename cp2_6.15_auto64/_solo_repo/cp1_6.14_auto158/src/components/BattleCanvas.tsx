import React, { useRef, useEffect } from 'react'
import { ParticleEffect } from '../ParticleEffect'
import { Card, ElementType, ParticleParams } from '../data/cards'

interface BattleCanvasProps {
  particleEngine: ParticleEffect
  onDrop?: (cardId: string, x: number, y: number) => void
}

export const BattleCanvas: React.FC<BattleCanvasProps> = ({
  particleEngine,
  onDrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      particleEngine.init(canvasRef.current)
    }
    return () => {
      particleEngine.destroy()
    }
  }, [particleEngine])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('cardId')
    if (cardId && onDrop) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      onDrop(cardId, x, y)
    }
  }

  return (
    <div className="battlefield-wrapper">
      <canvas
        ref={canvasRef}
        className="battlefield-canvas"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  )
}
