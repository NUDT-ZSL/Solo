import { useState, useEffect, useCallback } from 'react'
import CardList from './components/CardList'
import CardEditor from './components/CardEditor'
import ReviewSession from './components/ReviewSession'
import StatsDashboard from './components/StatsDashboard'
import {
  Card,
  createCard,
  updateCard,
  getDueCards,
  applyReviewFeedback,
  ReviewStats
} from './utils/cards'

type View = 'cards' | 'review' | 'stats'

const STORAGE_KEY = 'bilingual-flashcards-data'

function loadCards(): Card[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch (e) {
    console.error('Failed to load cards', e)
  }
  return []
}

function saveCards(cards: Card[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch (e) {
    console.error('Failed to save cards', e)
  }
}

export default function App() {
  const [cards, setCards] = useState<Card[]>(() => loadCards())
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [view, setView] = useState<View>('cards')

  useEffect(() => {
    saveCards(cards)
  }, [cards])

  const selectedCard = cards.find(c => c.id === selectedCardId) || null

  const handleCreateCard = useCallback((source: string, target: string, tags: string[], example: string) => {
    const newCard = createCard(source, target, tags, example)
    setCards(prev => [newCard, ...prev])
    setSelectedCardId(newCard.id)
  }, [])

  const handleUpdateCard = useCallback((id: string, updates: Partial<Pick<Card, 'source' | 'target' | 'tags' | 'example'>>) => {
    setCards(prev => prev.map(card => card.id === id ? updateCard(card, updates) : card))
  }, [])

  const handleDeleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(card => card.id !== id))
    if (selectedCardId === id) setSelectedCardId(null)
  }, [selectedCardId])

  const handleReviewComplete = useCallback((results: { cardId: string; feedback: 'remembered' | 'fuzzy' | 'forgotten' }[]) => {
    setCards(prev => prev.map(card => {
      const result = results.find(r => r.cardId === card.id)
      if (result) {
        return applyReviewFeedback(card, result.feedback)
      }
      return card
    }))
  }, [])

  const dueCards = getDueCards(cards)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📚 双语学习卡片</h1>
        <nav className="nav-tabs">
          <button
            className={`nav-btn ${view === 'cards' ? 'active' : ''}`}
            onClick={() => setView('cards')}
          >
            卡片管理
          </button>
          <button
            className={`nav-btn ${view === 'review' ? 'active' : ''}`}
            onClick={() => setView('review')}
          >
            复习模式
            {dueCards.length > 0 && (
              <span style={{ marginLeft: 6, color: view === 'review' ? 'white' : '#FF4757', fontWeight: 'bold' }}>
                {dueCards.length}
              </span>
            )}
          </button>
          <button
            className={`nav-btn ${view === 'stats' ? 'active' : ''}`}
            onClick={() => setView('stats')}
          >
            统计看板
          </button>
        </nav>
      </header>

      {view === 'cards' && (
        <div className="main-content">
          <CardList
            cards={cards}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            onDeleteCard={handleDeleteCard}
            onStartReview={() => setView('review')}
          />
          <CardEditor
            card={selectedCard}
            onCreate={handleCreateCard}
            onUpdate={handleUpdateCard}
          />
        </div>
      )}

      {view === 'review' && (
        <ReviewSession
          cards={dueCards}
          onComplete={handleReviewComplete}
          onBack={() => setView('cards')}
        />
      )}

      {view === 'stats' && (
        <StatsDashboard cards={cards} />
      )}
    </div>
  )
}
