import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardDeck, fetchDecks } from '../api'
import CardGrid from '../components/CardGrid'

const HomePage = () => {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<CardDeck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDecks = async () => {
      try {
        const data = await fetchDecks()
        setDecks(data)
      } catch (error) {
        console.error('加载卡片组失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDecks()
  }, [])

  const handleDeckClick = (deckId: string) => {
    navigate(`/review/${deckId}`)
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">我的卡片组</h1>
        <p className="page-subtitle">
          选择一个卡片组开始复习，或创建新的卡片组
        </p>
      </div>
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-title">加载中...</div>
        </div>
      ) : (
        <CardGrid decks={decks} onDeckClick={handleDeckClick} />
      )}
    </div>
  )
}

export default HomePage
