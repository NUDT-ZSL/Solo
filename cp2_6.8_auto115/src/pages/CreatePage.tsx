import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createDeck, addCard, Card } from '../api'

const CreatePage = () => {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [deckId, setDeckId] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddCard = async () => {
    if (!front.trim() || !back.trim()) return

    setIsSubmitting(true)
    try {
      let currentDeckId = deckId
      if (!currentDeckId) {
        if (!title.trim()) {
          setIsSubmitting(false)
          return
        }
        const deck = await createDeck(title.trim())
        currentDeckId = deck.id
        setDeckId(currentDeckId)
      }

      const newCard = await addCard(currentDeckId, front.trim(), back.trim())
      setCards((prev) => [...prev, newCard])
      setFront('')
      setBack('')
    } catch (error) {
      console.error('添加卡片失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinish = () => {
    if (deckId) {
      navigate('/')
    }
  }

  return (
    <div className="container">
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="page-header">
        <h1 className="page-title">创建卡片组</h1>
        <p className="page-subtitle">
          添加卡片组标题，然后逐个添加问题和答案
        </p>
      </div>

      <div className="create-form">
        <div className="form-group">
          <label className="form-label">卡片组标题</label>
          <input
            type="text"
            className="form-input"
            placeholder="例如：Vue.js 基础概念"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!!deckId}
          />
        </div>

        <div className="form-group">
          <label className="form-label">正面（问题）</label>
          <textarea
            className="form-textarea"
            placeholder="输入问题..."
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">背面（答案）</label>
          <textarea
            className="form-textarea"
            placeholder="输入答案，支持多行..."
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button
            className="btn-primary"
            onClick={handleAddCard}
            disabled={
              isSubmitting ||
              !front.trim() ||
              !back.trim() ||
              (!deckId && !title.trim())
            }
          >
            {isSubmitting ? '添加中...' : '添加卡片'}
          </button>
          {deckId && (
            <button className="btn-secondary" onClick={handleFinish}>
              完成并返回
            </button>
          )}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="card-preview-list">
          <div className="card-preview-title">
            已添加的卡片（{cards.length}）
          </div>
          {cards.map((card, index) => (
            <div key={card.id} className="card-preview-item">
              <div className="card-preview-q">
                #{index + 1} {card.front}
              </div>
              <div className="card-preview-a">{card.back}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CreatePage
