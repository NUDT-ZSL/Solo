import { CardDeck } from '../api'

interface CardGridProps {
  decks: CardDeck[]
  onDeckClick: (deckId: string) => void
}

const formatNextReview = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return '现在可复习'
  if (diffDays === 1) return '明天复习'
  if (diffDays < 7) return `${diffDays}天后复习`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周后复习`
  return `${Math.floor(diffDays / 30)}月后复习`
}

const CardGrid = ({ decks, onDeckClick }: CardGridProps) => {
  if (decks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">暂无卡片组</div>
        <p>点击右上角的"创建卡片组"开始添加你的第一组闪卡</p>
      </div>
    )
  }

  return (
    <div className="card-grid">
      {decks.map((deck) => {
        const earliestReview = deck.cards.length > 0
          ? deck.cards.reduce((earliest, card) =>
              new Date(card.nextReview) < new Date(earliest.nextReview)
                ? card
                : earliest
            ).nextReview
          : new Date().toISOString()

        return (
          <div
            key={deck.id}
            className="deck-card"
            onClick={() => onDeckClick(deck.id)}
          >
            <div className="deck-card-title">{deck.title}</div>
            <div className="deck-card-meta">
              <span className="deck-card-count">
                {deck.cards.length} 张卡片
              </span>
              <span className="deck-card-next">
                {deck.cards.length > 0
                  ? formatNextReview(earliestReview)
                  : '无卡片'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CardGrid
