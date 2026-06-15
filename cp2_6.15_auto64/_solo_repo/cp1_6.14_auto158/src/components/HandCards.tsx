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
  const [bouncing, setBouncing] = useState(false)
  const [bouncePos, setBouncePos] = useState<{ x: number; y: number } | null>(null)
  const dragCardIndex = useRef<number>(-1)
  const cardStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const bounceRafRef = useRef<number | null>(null)

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
    if (!isCurrentPlayer || bouncing) return
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
    if (bouncing) return

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
  }, [bouncing])

  const startBounceAnimation = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
    setBouncing(true)
    setBouncePos({ x: fromX, y: fromY })

    const duration = 300
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)

      const x = fromX + (toX - fromX) * eased
      const y = fromY + (toY - fromY) * eased

      setBouncePos({ x, y })

      if (t < 1) {
        bounceRafRef.current = requestAnimationFrame(animate)
      } else {
        setBouncing(false)
        setBouncePos(null)
        dragCardIndex.current = -1
      }
    }

    bounceRafRef.current = requestAnimationFrame(animate)
  }, [])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    setDragging((prev) => {
      if (!prev) return null

      const bfRect = getBattlefieldRect()
      if (bfRect && isPointInBattlefield(e.clientX, e.clientY)) {
        const x = e.clientX - bfRect.left
        const y = e.clientY - bfRect.top
        onCardPlay(prev.card.id, x, y)
        dragCardIndex.current = -1
        return null
      }

      startBounceAnimation(e.clientX, e.clientY, prev.startX, prev.startY)
      return null
    })
  }, [onCardPlay, startBounceAnimation])

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

  React.useEffect(() => {
    return () => {
      if (bounceRafRef.current !== null) {
        cancelAnimationFrame(bounceRafRef.current)
      }
    }
  }, [])

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

  const getDraggingCardPosition = () => {
    if (bouncing && bouncePos) {
      return { left: bouncePos.x - 60, top: bouncePos.y - 80 }
    }
    if (dragging) {
      return { left: dragging.currentX - 60, top: dragging.currentY - 80 }
    }
    return {}
  }

  const activeCard = dragging || (bouncing ? { card: cards[dragCardIndex.current] } : null)

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
            } ${
              (dragging || bouncing) && dragCardIndex.current === index
                ? 'dragging-source'
                : ''
            }`}
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

      {(dragging || bouncing) && activeCard && (
        <div
          className={`dragging-card ${
            dragging?.isValidTarget ? 'valid' : 'invalid'
          } ${bouncing ? 'bouncing' : ''}`}
          style={{
            ...getDraggingCardPosition(),
            transition: bouncing ? 'none' : undefined,
          }}
        >
          <CardComponent card={activeCard.card} size="normal" />
        </div>
      )}
    </div>
  )
}
