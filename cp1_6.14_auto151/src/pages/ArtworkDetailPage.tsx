import { useState, useMemo } from 'react'
import { Artwork, Artist, User, PageView } from '../types'
import { toggleFavorite, createPurchase } from '../api'
import LazyImage from '../components/LazyImage'
import PurchaseModal from '../components/PurchaseModal'

interface ArtworkDetailPageProps {
  artworkId: string | null
  artworks: Artwork[]
  artists: Artist[]
  favorites: string[]
  purchasedIds: string[]
  user: User | null
  onNavigate: (page: PageView, params?: any) => void
  onToggleFavorite: (id: string) => void
  onPurchase: (id: string) => void
}

export default function ArtworkDetailPage({ artworkId, artworks, artists, favorites, purchasedIds, user, onNavigate, onToggleFavorite, onPurchase }: ArtworkDetailPageProps) {
  const [showPurchase, setShowPurchase] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  const artwork = useMemo(() => artworks.find(a => a.id === artworkId), [artworks, artworkId])
  const artist = useMemo(() => artists.find(a => a.id === artwork?.artistId), [artists, artwork])

  if (!artwork) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>作品未找到</div>

  const isFavorited = favorites.includes(artwork.id)
  const isPurchased = purchasedIds.includes(artwork.id) || artwork.sold

  const handleFavorite = async () => {
    onToggleFavorite(artwork.id)
    try {
      await toggleFavorite(artwork.id, !isFavorited)
    } catch {}
  }

  const handlePurchase = async () => {
    if (!user) return
    setPurchasing(true)
    try {
      await createPurchase(artwork.id, user.id)
      onPurchase(artwork.id)
      setShowPurchase(false)
    } catch (err) {
      alert('购买失败，请重试')
    }
    setPurchasing(false)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px' }}>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' as const }}>
        <div style={{ flex: '1 1 400px', maxWidth: 600 }}>
          <LazyImage
            src={artwork.image}
            alt={artwork.title}
            style={{
              width: '100%', maxHeight: 500, borderRadius: 16,
              overflow: 'hidden',
            }}
          />
        </div>

        <div style={{
          width: 320, padding: 24,
          background: '#1a1a2e', borderRadius: 12,
          alignSelf: 'flex-start',
        }}>
          <h1 style={{ fontSize: 24, color: '#fff', marginBottom: 8 }}>{artwork.title}</h1>
          <div
            style={{ fontSize: 15, color: '#f59e0b', cursor: 'pointer', marginBottom: 16 }}
            onClick={() => onNavigate('artist', { artistId: artwork.artistId })}
          >
            {artist?.name || '未知艺术家'} →
          </div>
          <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.7, marginBottom: 16 }}>
            {artwork.description}
          </p>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
            创作年份：{artwork.year}
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
            分类：{artwork.category}
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
            收藏数：{artwork.favorites}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ fontSize: 28, color: '#f59e0b', fontWeight: 700 }}>
              ¥{artwork.price.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleFavorite}
              style={{
                width: 48, height: 48, borderRadius: 8, border: '1px solid #374151',
                background: isFavorited ? '#7f1d1d' : '#1f2937',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#ef4444' : 'none'} stroke={isFavorited ? '#ef4444' : '#9ca3af'} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {!isPurchased ? (
              <button
                onClick={() => {
                  if (!user) { alert('请先登录'); return }
                  setShowPurchase(true)
                }}
                style={{
                  flex: 1, height: 48, borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #eab308)',
                  color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                  transition: 'filter 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(245,158,11,0.3)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(245,158,11,0.4)'
                }}
              >
                立即购买
              </button>
            ) : (
              <button
                disabled
                style={{
                  flex: 1, height: 48, borderRadius: 8, border: 'none',
                  background: '#374151', color: '#6b7280', fontSize: 16, fontWeight: 700,
                  cursor: 'not-allowed',
                }}
              >
                已售出
              </button>
            )}
          </div>
        </div>
      </div>

      <PurchaseModal
        open={showPurchase}
        title={artwork.title}
        price={artwork.price}
        onCancel={() => setShowPurchase(false)}
        onConfirm={handlePurchase}
      />
    </div>
  )
}
