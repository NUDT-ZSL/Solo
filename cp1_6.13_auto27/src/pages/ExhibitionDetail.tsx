import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ArtGrid from '../components/ArtGrid'
import FeedbackForm from '../components/FeedbackForm'
import { Exhibition, Artwork, Feedback } from '../types'

function ExhibitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exhibition, setExhibition] = useState<Exhibition | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (id) {
      fetchExhibition()
      fetchFeedbacks()
    }
  }, [id])

  const fetchExhibition = async () => {
    try {
      const res = await fetch(`/api/exhibitions/${id}`)
      const data = await res.json()
      setExhibition(data)
    } catch (err) {
      console.error('Failed to fetch exhibition:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`/api/exhibitions/${id}/feedbacks`)
      const data = await res.json()
      setFeedbacks(data.slice(0, 5))
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err)
    }
  }

  const filteredArtworks = useMemo(() => {
    if (!exhibition) return []
    if (!debouncedQuery.trim()) return exhibition.artworks

    const query = debouncedQuery.toLowerCase()
    return exhibition.artworks.filter(
      (art) =>
        art.name.toLowerCase().includes(query) ||
        art.artist.toLowerCase().includes(query)
    )
  }, [exhibition, debouncedQuery])

  const artworksByZone = useMemo(() => {
    if (!exhibition || filteredArtworks.length === 0) return {}

    const grouped: { [key: string]: Artwork[] } = {}
    exhibition.zones.forEach((zone) => {
      grouped[zone] = filteredArtworks.filter((art) => art.zone === zone)
    })
    return grouped
  }, [exhibition, filteredArtworks])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  const formatFeedbackDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const handleFeedbackSubmitted = () => {
    fetchFeedbacks()
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-text">加载中...</div>
      </div>
    )
  }

  if (!exhibition) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <div className="empty-state-text">展览不存在</div>
      </div>
    )
  }

  const hasArtworks = filteredArtworks.length > 0

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>
        ← 返回列表
      </div>

      <div className="detail-header">
        <h1>{exhibition.name}</h1>
        <p className="date">
          {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
        </p>
      </div>

      <div className="detail-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索展品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!hasArtworks && debouncedQuery ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">未找到匹配的展品</div>
        </div>
      ) : (
        exhibition.zones.map((zone) => (
          artworksByZone[zone] && artworksByZone[zone].length > 0 && (
            <div key={zone} className="zone-section">
              <h3 className="zone-title">{zone}</h3>
              <ArtGrid
                artworks={artworksByZone[zone]}
                onArtClick={(art) => setSelectedArtwork(art)}
              />
            </div>
          )
        ))
      )}

      <div className="feedback-section">
        <h3>观众反馈</h3>
        <FeedbackForm
          exhibitionId={exhibition.id}
          onSubmitted={handleFeedbackSubmitted}
        />

        <div className="feedback-list">
          {feedbacks.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-state-text">暂无反馈，来发表第一条吧</div>
            </div>
          ) : (
            feedbacks.map((feedback) => (
              <div key={feedback.id} className="feedback-item">
                <div className="feedback-avatar">
                  {getInitial(feedback.visitorName)}
                </div>
                <div className="feedback-content">
                  <div className="feedback-header">
                    <span className="feedback-name">{feedback.visitorName}</span>
                    <span className="feedback-date">
                      {formatFeedbackDate(feedback.createdAt)}
                    </span>
                  </div>
                  <div className="star-rating" style={{ marginBottom: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`star readonly ${feedback.rating >= star ? 'filled' : ''}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="feedback-text">{feedback.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={`modal-overlay ${selectedArtwork ? 'visible' : ''}`}
        onClick={() => setSelectedArtwork(null)}
      >
        {selectedArtwork && (
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedArtwork(null)}
            >
              ×
            </button>
            <div className="modal-image-container">
              <img src={selectedArtwork.image} alt={selectedArtwork.name} />
            </div>
            <div className="modal-info">
              <h2>{selectedArtwork.name}</h2>
              <div className="info-item">
                <div className="info-label">作者</div>
                <div className="info-value">{selectedArtwork.artist}</div>
              </div>
              <div className="info-item">
                <div className="info-label">年代</div>
                <div className="info-value">{selectedArtwork.year}</div>
              </div>
              <div className="info-item">
                <div className="info-label">材质</div>
                <div className="info-value">{selectedArtwork.material}</div>
              </div>
              <div className="info-item">
                <div className="info-label">尺寸</div>
                <div className="info-value">{selectedArtwork.size}</div>
              </div>
              <p className="description">{selectedArtwork.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExhibitionDetail
