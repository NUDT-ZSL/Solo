import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import { api, Artwork } from '../api'

export default function HomePage() {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [list, userState] = await Promise.all([api.getArtworks(), api.getUserState()])
      setArtworks(list)
      setLikedIds(new Set(userState.likedArtworks))
      setFavIds(new Set(userState.favoritedArtworks))
    } catch (e) {
      console.error('加载作品失败', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await api.toggleLike(id)
      setLikedIds(prev => {
        const next = new Set(prev)
        if (res.liked) next.add(id); else next.delete(id)
        return next
      })
      setArtworks(prev => prev.map(a => a.id === id ? { ...a, likes: res.likes } : a))
    } catch (e) {
      console.error(e)
    }
  }

  const handleFav = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await api.toggleFavorite(id)
      setFavIds(prev => {
        const next = new Set(prev)
        if (res.favorited) next.add(id); else next.delete(id)
        return next
      })
      setArtworks(prev => prev.map(a => a.id === id ? { ...a, favorites: res.favorites } : a))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return <div className="page-container"><div className="loading-state">加载中...</div></div>
  }

  return (
    <div className="page-container">
      {artworks.length === 0 ? (
        <div className="empty-state">暂无在售作品</div>
      ) : (
        <div className="card-grid">
          {artworks.map(art => (
            <div
              key={art.id}
              className="artwork-card"
              onClick={() => navigate(`/artwork/${art.id}`)}
            >
              <img src={art.coverImage} alt={art.title} className="artwork-card-image" />
              <div className="artwork-card-body">
                <div>
                  <div className="artwork-card-title">{art.title}</div>
                  <div className="artwork-card-artist">艺术家：{art.artist}</div>
                </div>
                <div className="artwork-card-actions">
                  <button
                    className={'action-icon-btn' + (likedIds.has(art.id) ? ' liked' : '')}
                    onClick={(e) => handleLike(e, art.id)}
                  >
                    <Heart size={16} fill={likedIds.has(art.id) ? 'currentColor' : 'none'} />
                    <span>{art.likes}</span>
                  </button>
                  <button
                    className={'action-icon-btn' + (favIds.has(art.id) ? ' favorited' : '')}
                    onClick={(e) => handleFav(e, art.id)}
                  >
                    <Star size={16} fill={favIds.has(art.id) ? 'currentColor' : 'none'} />
                    <span>{art.favorites}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
