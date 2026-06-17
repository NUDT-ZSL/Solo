import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Star, Eye } from 'lucide-react'
import dayjs from 'dayjs'
import { api, Artwork, ViewRecord, categoryLabels } from '../api'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [views, setViews] = useState<ViewRecord[]>([])
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const recordedRef = useRef(false)

  const artworkId = id!

  const loadDetail = useCallback(async () => {
    try {
      const [art, viewList, userState] = await Promise.all([
        api.getArtworkById(artworkId),
        api.getViews(artworkId),
        api.getUserState()
      ])
      setArtwork(art)
      setViews(viewList)
      setLiked(userState.likedArtworks.includes(artworkId))
      setFavorited(userState.favoritedArtworks.includes(artworkId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [artworkId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true
    api.recordView(artworkId, '详情页').catch(console.error)
  }, [artworkId])

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const [art, viewList] = await Promise.all([
          api.getArtworkById(artworkId),
          api.getViews(artworkId)
        ])
        setArtwork(prev => prev ? { ...prev, views: art.views } : art)
        setViews(viewList)
      } catch (e) {}
    }, 10000)
    return () => clearInterval(timer)
  }, [artworkId])

  const handleLike = async () => {
    try {
      const res = await api.toggleLike(artworkId)
      setLiked(res.liked)
      setArtwork(prev => prev ? { ...prev, likes: res.likes } : prev)
    } catch (e) {
      console.error(e)
    }
  }

  const handleFav = async () => {
    try {
      const res = await api.toggleFavorite(artworkId)
      setFavorited(res.favorited)
      setArtwork(prev => prev ? { ...prev, favorites: res.favorites } : prev)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return <div className="page-container"><div className="loading-state">加载中...</div></div>
  }

  if (!artwork) {
    return <div className="page-container"><div className="empty-state">作品不存在</div></div>
  }

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        返回作品列表
      </Link>
      <div className="detail-wrapper">
        <img src={artwork.coverImage} alt={artwork.title} className="detail-image" />
        <div className="detail-info">
          <div className="detail-title">{artwork.title}</div>
          <div className="detail-artist">艺术家：{artwork.artist}</div>
          <span className="detail-category-tag">{categoryLabels[artwork.category]}</span>
          <p className="detail-description">{artwork.description}</p>
          <div className="detail-price">¥ {artwork.price.toLocaleString()}</div>
          <div style={{ marginTop: 10, fontSize: 13, color: '#757575', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={14} />
            浏览量：{artwork.views}
          </div>
          <div className="detail-actions">
            <button
              className={'circle-btn' + (liked ? ' liked' : '')}
              onClick={handleLike}
              title={liked ? '取消点赞' : '点赞'}
            >
              <Heart size={20} fill={liked ? '#ffffff' : 'none'} />
            </button>
            <button
              className={'circle-btn' + (favorited ? ' favorited' : '')}
              onClick={handleFav}
              title={favorited ? '取消收藏' : '收藏'}
            >
              <Star size={20} fill={favorited ? '#ffffff' : 'none'} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#616161', marginLeft: 8 }}>
              <Heart size={16} color="#e91e63" fill="#e91e63" /> {artwork.likes}
              <span style={{ width: 12 }} />
              <Star size={16} color="#ffc107" fill="#ffc107" /> {artwork.favorites}
            </div>
          </div>
        </div>

        <div className="view-records">
          <div className="view-records-title">最近浏览记录</div>
          {views.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px', background: '#fff', borderRadius: 8 }}>
              暂无浏览记录
            </div>
          ) : (
            views.map(v => (
              <div key={v.id} className="view-record-item">
                <span>{dayjs(v.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
                <span className="view-record-source">{v.source}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
