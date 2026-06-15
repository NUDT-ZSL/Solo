import { useMemo } from 'react'
import { Artwork, Artist, User, PageView } from '../types'
import { toggleFavorite } from '../api'
import ArtCard from '../components/ArtCard'

interface CollectorPageProps {
  artworks: Artwork[]
  artists: Artist[]
  favorites: string[]
  purchasedIds: string[]
  user: User | null
  onNavigate: (page: PageView, params?: any) => void
  onToggleFavorite: (id: string) => void
}

export default function CollectorPage({ artworks, artists, favorites, purchasedIds, user, onNavigate, onToggleFavorite }: CollectorPageProps) {
  const artistMap = useMemo(() => {
    const map: Record<string, Artist> = {}
    artists.forEach(a => { map[a.id] = a })
    return map
  }, [artists])

  const favoriteArtworks = useMemo(() =>
    artworks.filter(a => favorites.includes(a.id)),
    [artworks, favorites]
  )

  const purchasedArtworks = useMemo(() =>
    artworks.filter(a => purchasedIds.includes(a.id)),
    [artworks, purchasedIds]
  )

  const handleToggleFavorite = async (id: string) => {
    const isFav = favorites.includes(id)
    onToggleFavorite(id)
    try {
      await toggleFavorite(id, !isFav)
    } catch {}
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
      <h2 style={{ fontSize: 24, color: '#fff', marginBottom: 24 }}>我的收藏</h2>

      {favoriteArtworks.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 48,
        }}>
          {favoriteArtworks.map(aw => (
            <ArtCard
              key={aw.id}
              artwork={aw}
              artist={artistMap[aw.artistId]}
              isFavorited={true}
              onToggleFavorite={handleToggleFavorite}
              onClick={id => onNavigate('artwork-detail', { artworkId: id })}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280', marginBottom: 48 }}>
          暂无收藏，去画廊看看吧！
          <br />
          <span style={{ color: '#f59e0b', cursor: 'pointer' }} onClick={() => onNavigate('gallery')}>浏览画廊</span>
        </div>
      )}

      <h2 style={{ fontSize: 24, color: '#fff', marginBottom: 24 }}>已购作品</h2>
      {purchasedArtworks.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {purchasedArtworks.map(aw => (
            <ArtCard
              key={aw.id}
              artwork={aw}
              artist={artistMap[aw.artistId]}
              isFavorited={favorites.includes(aw.id)}
              onToggleFavorite={handleToggleFavorite}
              onClick={id => onNavigate('artwork-detail', { artworkId: id })}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          暂无购买记录
        </div>
      )}
    </div>
  )
}
