import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CardDeck, fetchDeck } from '../api'
import ReviewSession from '../components/ReviewSession'

const ReviewPage = () => {
  const { deckId } = useParams<{ deckId: string }>()
  const [deck, setDeck] = useState<CardDeck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!deckId) return
    const loadDeck = async () => {
      try {
        const data = await fetchDeck(deckId)
        setDeck(data)
      } catch (err) {
        setError('卡片组不存在')
      } finally {
        setLoading(false)
      }
    }
    loadDeck()
  }, [deckId])

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-title">加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="container">
        <Link to="/" className="back-link">← 返回首页</Link>
        <div className="empty-state">
          <div className="empty-state-title">{error || '卡片组不存在'}</div>
        </div>
      </div>
    )
  }

  if (deck.cards.length === 0) {
    return (
      <div className="container">
        <Link to="/" className="back-link">← 返回首页</Link>
        <div className="empty-state">
          <div className="empty-state-title">该卡片组暂无卡片</div>
          <p>请先添加卡片后再开始复习</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <Link to="/" className="back-link">← 返回首页</Link>
      <ReviewSession cards={deck.cards} deckTitle={deck.title} />
    </div>
  )
}

export default ReviewPage
