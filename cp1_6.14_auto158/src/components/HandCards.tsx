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
  startX: number
  startY: number
  isValidTarget: boolean
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
  const dragCardIndex = useRef<number>(-1)
  const cardStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const getBattlefieldRect = (): DOMRect | null => {
    const battlefield = document.querySelector('.battlefield-canvas')
    if (battlefield) {
      return battlefield.getBoundingClientRect()
    }
    return null
  }

  const isPointInBattlefield = (x: number, y: number): boolean => {
    const rect = getBattlefieldRect()
    if (!rect) return false
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  const handleMouseDown = (e: React.MouseEvent, card: Card, index: number) => {
    if (!isCurrentPlayer) return
    e.preventDefault()

    const cardElement = e.currentTarget as HTMLElement
    const cardRect = cardElement.getBoundingClientRect()

    dragCardIndex.current = index
    cardStartPos.current = {
      x: cardRect.left + cardRect.width / 2,
      y: cardRect.top + cardRect.height / 2,
    }

    setDragging({
      card,
      currentX: e.clientX,
      currentY: e.clientY,
      startX: cardRect.left + cardRect.width / 2,
      startY: cardRect.top + cardRect.height / 2,
      isValidTarget: false,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragging((prev) => {
      if (!prev) return null

      const isValid = isPointInBattlefield(e.clientX, e.clientY)

      return {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        isValidTarget: isValid,
      }
    })
  }, [])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    setDragging((prev) => {
      if (!prev) return null

      const bfRect = getBattlefieldRect()
      if (bfRect && isPointInBattlefield(e.clientX, e.clientY)) {
        const x = e.clientX - bfRect.left
        const y = e.clientY - bfRect.top
        onCardPlay(prev.card.id, x, y)
      }

      dragCardIndex.current = -1
      return null
    })
  }, [onCardPlay])

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

  const getDragTrailStyle = (): React.CSSProperties => {
    if (!dragging) return {}

    const startX = cardStartPos.current.x
    const startY = cardStartPos.current.y
    const endX = dragging.currentX
    const endY = dragging.currentY

    const dx = endX - startX
    const dy = endY - startY
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    return {
      position: 'fixed',
      left: startX,
      top: startY,
      width: length,
      height: 2,
      background: dragging.isValidTarget
        ? 'repeating-linear-gradient(90deg, rgba(74, 108, 247, 0.6) 0, rgba(74, 108, 247, 0.6) 8px, transparent 8px, transparent 16px)'
        : 'repeating-linear-gradient(90deg, rgba(231, 76, 60, 0.4) 0, rgba(231, 76, 60, 0.4) 8px, transparent 8px, transparent 16px)',
      transformOrigin: '0 50%',
      transform: `rotate(${angle}deg)`,
      pointerEvents: 'none',
      zIndex: 999,
      transition: 'background 0.15s ease-out',
    }
  }

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

      {dragging && <div style={getDragTrailStyle()} />}

      {dragging && (
        <div
          className={`dragging-card ${dragging.isValidTarget ? 'valid' : 'invalid'}`}
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
