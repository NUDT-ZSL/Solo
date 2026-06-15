import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Card, sortCardsByCreatedAt, filterCardsByLevel, getDueCards } from '../utils/cards'

interface CardListProps {
  cards: Card[]
  selectedCardId: string | null
  onSelectCard: (id: string) => void
  onDeleteCard: (id: string) => void
  onStartReview: () => void
}

const CARD_ITEM_HEIGHT = 88
const VISIBLE_THRESHOLD = 50

export default function CardList({ cards, selectedCardId, onSelectCard, onDeleteCard, onStartReview }: CardListProps) {
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [sortAscending, setSortAscending] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)

  const dueCount = useMemo(() => getDueCards(cards).length, [cards])

  const filteredCards = useMemo(() => {
    let result = filterCardsByLevel(cards, filterLevel)
    result = sortCardsByCreatedAt(result, sortAscending)
    return result
  }, [cards, filterLevel, sortAscending])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const virtualConfig = useMemo(() => {
    const totalHeight = filteredCards.length * CARD_ITEM_HEIGHT
    const startIndex = Math.max(0, Math.floor(scrollTop / CARD_ITEM_HEIGHT) - VISIBLE_THRESHOLD)
    const visibleCount = Math.ceil(viewportHeight / CARD_ITEM_HEIGHT) + VISIBLE_THRESHOLD * 2
    const endIndex = Math.min(filteredCards.length, startIndex + visibleCount)
    return { totalHeight, startIndex, endIndex, offsetY: startIndex * CARD_ITEM_HEIGHT }
  }, [filteredCards.length, scrollTop, viewportHeight])

  const renderStars = (level: number) => {
    return '★'.repeat(level) + '☆'.repeat(5 - level)
  }

  return (
    <div style={{
      width: '320px',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #E0E0E0',
      background: 'white',
      maxHeight: 'calc(100vh - 65px)'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #E0E0E0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <span style={{ color: '#636E72', fontSize: 13 }}>总卡片数：</span>
            <span style={{ fontWeight: 600 }}>{cards.length}</span>
          </div>
          <div
            onClick={dueCount > 0 ? onStartReview : undefined}
            style={{
              cursor: dueCount > 0 ? 'pointer' : 'default',
              color: dueCount > 0 ? '#FF4757' : '#636E72',
              fontWeight: 'bold'
            }}
          >
            待复习：<span style={{ color: '#FF4757', fontWeight: 'bold' }}>{dueCount}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterLevel ?? ''}
            onChange={(e) => setFilterLevel(e.target.value ? Number(e.target.value) : null)}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #E0E0E0',
              borderRadius: 6,
              fontSize: 13,
              background: 'white'
            }}
          >
            <option value="">全部等级</option>
            <option value="1">1星</option>
            <option value="2">2星</option>
            <option value="3">3星</option>
            <option value="4">4星</option>
            <option value="5">5星</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => setSortAscending(!sortAscending)}
            style={{ padding: '6px 10px', fontSize: 13 }}
            title={sortAscending ? '按创建时间降序' : '按创建时间升序'}
          >
            {sortAscending ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      >
        <div style={{ height: virtualConfig.totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${virtualConfig.offsetY}px)` }}>
            {filteredCards.slice(virtualConfig.startIndex, virtualConfig.endIndex).map(card => (
              <div
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                style={{
                  height: CARD_ITEM_HEIGHT,
                  padding: '12px 16px',
                  borderBottom: '1px solid #F1F3F5',
                  cursor: 'pointer',
                  background: selectedCardId === card.id ? '#F0F0FF' : 'white',
                  transition: 'background 0.15s ease',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#2D3436',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    marginRight: 8
                  }}>
                    {card.source}
                  </div>
                  <div style={{ color: '#FFA502', fontSize: 13, flexShrink: 0 }}>
                    {renderStars(card.level)}
                  </div>
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#636E72',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 4
                }}>
                  {card.target}
                </div>
                {card.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {card.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          background: '#E8F4FD',
                          color: '#1E90FF',
                          borderRadius: 4
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {filteredCards.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#636E72',
            textAlign: 'center',
            fontSize: 14
          }}>
            {cards.length === 0 ? '暂无卡片，快去创建吧！' : '没有匹配的卡片'}
          </div>
        )}
      </div>
    </div>
  )
}
