import { useState, useMemo } from 'react'
import { Artwork, Artist, User, PageView } from '../types'
import { toggleFavorite } from '../api'
import ArtCard from '../components/ArtCard'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import RankingSidebar from '../components/RankingSidebar'

interface GalleryPageProps {
  artworks: Artwork[]
  artists: Artist[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onNavigate: (page: PageView, params?: any) => void
  user: User | null
}

export default function GalleryPage({ artworks, artists, favorites, onToggleFavorite, onNavigate, user }: GalleryPageProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')

  const categories = ['全部', '油画', '水彩', '数字艺术', '雕塑']

  const filtered = useMemo(() => {
    let result = artworks
    if (category !== '全部') {
      result = result.filter(a => a.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [artworks, category, search])

  const artistMap = useMemo(() => {
    const map: Record<string, Artist> = {}
    artists.forEach(a => { map[a.id] = a })
    return map
  }, [artists])

  const handleToggleFavorite = async (id: string) => {
    const isFav = favorites.includes(id)
    onToggleFavorite(id)
    try {
      await toggleFavorite(id, !isFav)
    } catch {}
  }

  return (
    <div style={{ display: 'flex', gap: 24, padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <SearchBar value={search} onChange={setSearch} />
          <CategoryFilter categories={categories} selected={category} onChange={setCategory} />
        </div>

        <div>
          <style>{`
            .gallery-grid {
              column-width: 280px;
              column-gap: 16px;
            }
            @media (min-width: 1201px) {
              .gallery-grid { column-count: 4; column-gap: 16px; }
            }
            @media (min-width: 768px) and (max-width: 1200px) {
              .gallery-grid { column-count: 3; column-gap: 16px; }
            }
            @media (min-width: 481px) and (max-width: 767px) {
              .gallery-grid { column-count: 2; column-gap: 16px; }
            }
            @media (max-width: 480px) {
              .gallery-grid { column-count: 1; column-gap: 0; }
            }
            .gallery-item {
              break-inside: avoid;
              margin-bottom: 16px;
            }
            @media (max-width: 480px) {
              .gallery-item { margin-bottom: 12px; }
            }
          `}</style>
          <div className="gallery-grid">
            {filtered.map(artwork => (
              <div key={artwork.id} className="gallery-item">
                <ArtCard
                  artwork={artwork}
                  artist={artistMap[artwork.artistId]}
                  isFavorited={favorites.includes(artwork.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={id => onNavigate('artwork-detail', { artworkId: id })}
                />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 16 }}>
              暂无符合条件的艺术品
            </div>
          )}
        </div>
      </div>

      <RankingSidebar
        artists={artists}
        onArtistClick={id => onNavigate('artist', { artistId: id })}
        onArtworkClick={id => onNavigate('artwork-detail', { artworkId: id })}
      />
    </div>
  )
}
