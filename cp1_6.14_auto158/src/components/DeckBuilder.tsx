import React, { useState, useMemo } from 'react'
import { Card, cards, ElementType, elementNames } from '../data/cards'
import { CardComponent } from './CardComponent'

interface DeckBuilderProps {
  playerIndex: 0 | 1
  initialDeck?: Card[]
  onConfirm: (deck: Card[]) => void
  onBack?: () => void
  showBackButton?: boolean
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  playerIndex,
  initialDeck = [],
  onConfirm,
  onBack,
  showBackButton = false,
}) => {
  const [selectedCards, setSelectedCards] = useState<Card[]>(initialDeck)

  const selectedCount = selectedCards.length
  const maxCards = 10

  const elementCounts = useMemo(() => {
    const counts: Record<ElementType, number> = { fire: 0, ice: 0, thunder: 0, dark: 0 }
    selectedCards.forEach((card) => {
      counts[card.element]++
    })
    return counts
  }, [selectedCards])

  const canConfirm = useMemo(() => {
    if (selectedCount !== maxCards) return false
    return (
      elementCounts.fire >= 2 &&
      elementCounts.ice >= 2 &&
      elementCounts.thunder >= 2 &&
      elementCounts.dark >= 2
    )
  }, [selectedCount, elementCounts])

  const handleCardClick = (card: Card) => {
    const isSelected = selectedCards.some((c) => c.id === card.id)

    if (isSelected) {
      setSelectedCards(selectedCards.filter((c) => c.id !== card.id))
    } else {
      if (selectedCount < maxCards) {
        setSelectedCards([...selectedCards, card])
      }
    }
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(selectedCards)
  }

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <h2 className="deck-builder-title">
          玩家{playerIndex + 1} - 构建牌组
        </h2>
        <div className="deck-builder-progress">
          <span className="deck-count">
            {selectedCount}/{maxCards}
          </span>
          <div className="element-counts">
            {(Object.keys(elementCounts) as ElementType[]).map((el) => (
              <span key={el} className={`element-count ${el}`}>
                {elementNames[el]}: {elementCounts[el]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="deck-builder-tip">
        选择10张卡牌组成你的牌组，每种属性至少2张
      </div>

      <div className="card-pool">
        <h3 className="pool-title">卡池</h3>
        <div className="card-grid">
          {cards.map((card, index) => (
            <CardComponent
              key={card.id}
              card={card}
              selected={selectedCards.some((c) => c.id === card.id)}
              onClick={() => handleCardClick(card)}
              index={index}
            />
          ))}
        </div>
      </div>

      <div className="deck-builder-footer">
        {showBackButton && onBack && (
          <button className="btn btn-secondary" onClick={onBack}>
            上一步
          </button>
        )}
        <button
          className={`btn btn-primary ${canConfirm ? '' : 'disabled'}`}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {playerIndex === 0 ? '确认牌组，下一步' : '开始对战'}
        </button>
      </div>
    </div>
  )
}
