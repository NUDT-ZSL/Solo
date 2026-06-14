import React, { useState, useRef, useCallback } from 'react'
import { Card } from '../data/cards'
import { CardComponent } from './CardComponent'

interface HandCardsProps {
  cards: Card[]
  isCurrentPlayer: boolean
  onCardPlay: (cardId: string, x: number, y: number) => void
  side: 'top' | 'bottom'
  playerId: number
}

interface DraggingCard {
  card: Card
  currentX: number
  currentY: number
}

export const HandCards: React.FC<HandCardsProps> = ({
  cards,
  isCurrentPlayer,
  onCardPlay,
  side,
  playerId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<DraggingCard | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragCardIndex = useRef<number>(-1)

  const handleMouseDown = (e: React.MouseEvent, card: Card, index: number) => {
    if (!isCurrentPlayer) return
    e.preventDefault()

    dragCardIndex.current = index
    dragStartPos.current = { x: e.clientX, y: e.clientY }

    setDragging({
      card,
      currentX: e.clientX,
      currentY: e.clientY,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return

    setDragging((prev) =>
      prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
    )
  }, [dragging])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragging) return

    const battlefield = document.querySelector('.battlefield-canvas')
    if (battlefield) {
      const bfRect = battlefield.getBoundingClientRect()
      if (
        e.clientX >= bfRect.left &&
        e.clientX <= bfRect.right &&
        e.clientY >= bfRect.top &&
        e.clientY <= bfRect.bottom
      ) {
        const x = e.clientX - bfRect.left
        const y = e.clientY - bfRect.top
        onCardPlay(dragging.card.id, x, y)
      }
    }

    setDragging(null)
    dragCardIndex.current = -1
  }, [dragging, onCardPlay])

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className={`hand-cards ${side} ${isCurrentPlayer ? 'active' : ''}`}
    >
      <div className="hand-cards-row">
        {cards.map((card, index) => (
          <div
            key={`${card.id}-${index}`}
            className={`hand-card-wrapper ${
              hoveredIndex === index && side === 'bottom' && isCurrentPlayer
                ? 'hovered'
                : ''
            } ${dragging && dragCardIndex.current === index ? 'dragging-source' : ''}`}
            style={{
              zIndex: hoveredIndex === index ? 10 : index,
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseDown={(e) => handleMouseDown(e, card, index)}
          >
            <CardComponent
              card={card}
              size="normal"
              showBack={side === 'top'}
              index={index}
            />
          </div>
        ))}
      </div>

      {dragging && (
        <div
          className="dragging-card"
          style={{
            left: dragging.currentX - 60,
            top: dragging.currentY - 80,
          }}
        >
          <CardComponent card={dragging.card} size="normal" />
        </div>
      )}
    </div>
  )
}
