import { useEffect, useRef, useState } from 'react'
import { Artist, Artwork } from '../types'
import { fetchArtistRankings, fetchArtworkRankings } from '../api'

interface RankingSidebarProps {
  artists: Artist[]
  onArtistClick: (id: string) => void
  onArtworkClick: (id: string) => void
}

export default function RankingSidebar({ artists, onArtistClick, onArtworkClick }: RankingSidebarProps) {
  const [artistRankings, setArtistRankings] = useState<Artist[]>([])
  const [artworkRankings, setArtworkRankings] = useState<Artwork[]>([])
  const [visible, setVisible] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    Promise.all([fetchArtistRankings(), fetchArtworkRankings()]).then(([ar, wr]) => {
      setArtistRankings(ar)
      setArtworkRankings(wr.slice(0, 5))
    })
  }, [visible])

  return (
    <div
      ref={sidebarRef}
      style={{
        width: 260, position: 'sticky', top: 80,
        background: '#111827', borderRadius: 12, padding: 16,
        alignSelf: 'flex-start', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto',
      }}
    >
      <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16, fontWeight: 700 }}>
        🔥 热门艺术家
      </h3>
      {artistRankings.slice(0, 5).map((artist, i) => (
        <div
          key={artist.id}
          onClick={() => onArtistClick(artist.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            cursor: 'pointer', opacity: 0,
            animation: `fadeIn 0.3s ease ${i * 0.1}s forwards`,
          }}
        >
          <span style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700, width: 20 }}>{i + 1}</span>
          <img
            src={artist.avatar}
            alt={artist.name}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: 14, color: '#fff' }}>{artist.name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              热度 {(artist as any).heat || 0}
            </div>
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 16, color: '#fff', margin: '20px 0 16px', fontWeight: 700 }}>
        🔥 热门作品
      </h3>
      {artworkRankings.map((artwork, i) => (
        <div
          key={artwork.id}
          onClick={() => onArtworkClick(artwork.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            cursor: 'pointer', opacity: 0,
            animation: `fadeIn 0.3s ease ${i * 0.1}s forwards`,
          }}
        >
          <span style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700, width: 20 }}>{i + 1}</span>
          <img
            src={artwork.image}
            alt={artwork.title}
            style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: 13, color: '#fff' }}>{artwork.title}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              ❤️ {artwork.favorites}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
