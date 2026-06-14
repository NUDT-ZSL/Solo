import { useState } from 'react'
import { Artwork, Artist } from '../types'
import LazyImage from './LazyImage'

interface ArtCardProps {
  artwork: Artwork
  artist?: Artist
  isFavorited: boolean
  onToggleFavorite: (id: string) => void
  onClick: (id: string) => void
  showActions?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function ArtCard({ artwork, artist, isFavorited, onToggleFavorite, onClick, showActions, onEdit, onDelete }: ArtCardProps) {
  const [heartScale, setHeartScale] = useState(1)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHeartScale(1.1)
    setTimeout(() => setHeartScale(1), 200)
    onToggleFavorite(artwork.id)
  }

  return (
    <div
      onClick={() => onClick(artwork.id)}
      style={{
        width: 280,
        borderRadius: 12,
        background: '#1f2937',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{ position: 'relative' }}>
        <LazyImage
          src={artwork.image}
          alt={artwork.title}
          style={{ width: '100%', paddingTop: '66.67%' }}
        />
        <div
          onClick={handleFavoriteClick}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'transform 0.2s ease',
            transform: `scale(${heartScale})`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorited ? '#ef4444' : 'none'} stroke={isFavorited ? '#ef4444' : '#9ca3af'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 16, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {artwork.title}
        </div>
        {artist && (
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
            {artist.name}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>
            ¥{artwork.price.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#374151', padding: '2px 8px', borderRadius: 12 }}>
            {artwork.category}
          </span>
        </div>
        {showActions && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={e => { e.stopPropagation(); onEdit?.(artwork.id) }}
              style={{
                flex: 1, padding: '6px 0', background: '#374151', color: '#d1d5db',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              编辑
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete?.(artwork.id) }}
              style={{
                flex: 1, padding: '6px 0', background: '#7f1d1d', color: '#fca5a5',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
