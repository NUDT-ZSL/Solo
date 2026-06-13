import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ArtworkCard from './ArtworkCard'
import FilterBar from './FilterBar'
import { Artwork, mockGetWorks, getStyleOptions, mockToggleFavorite, mockGetFavorites } from '../../shared/mockApi'

interface GalleryModuleProps {
  showFilter?: boolean
}

const GalleryModule = ({ showFilter = true }: GalleryModuleProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedPriceRange, setSelectedPriceRange] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()
  const styleOptions = useMemo(() => getStyleOptions(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [worksData, favData] = await Promise.all([
          mockGetWorks(),
          mockGetFavorites(),
        ])
        setArtworks(worksData)
        setFavorites(favData)
      } catch (error) {
        console.error('Failed to fetch artworks:', error)
      } finally {
        setLoading(false)
        requestAnimationFrame(() => setIsVisible(true))
      }
    }
    fetchData()
  }, [])

  const filteredArtworks = useMemo(() => {
    return artworks.filter((artwork) => {
      if (selectedStyle && artwork.style !== selectedStyle) {
        return false
      }

      if (selectedPriceRange !== 'all') {
        switch (selectedPriceRange) {
          case 'below50':
            if (artwork.price >= 50) return false
            break
          case '50-200':
            if (artwork.price < 50 || artwork.price > 200) return false
            break
          case 'above200':
            if (artwork.price <= 200) return false
            break
        }
      }

      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase()
        const matchesTitle = artwork.title.toLowerCase().includes(keyword)
        const matchesTags = artwork.tags.some((tag) =>
          tag.toLowerCase().includes(keyword)
        )
        const matchesStyle = artwork.style.toLowerCase().includes(keyword)
        if (!matchesTitle && !matchesTags && !matchesStyle) {
          return false
        }
      }

      return true
    })
  }, [artworks, selectedStyle, selectedPriceRange, searchKeyword])

  const handleToggleFavorite = async (artworkId: string) => {
    const newFavorites = await mockToggleFavorite(artworkId)
    setFavorites(newFavorites)
  }

  const handleCardClick = (artworkId: string) => {
    navigate(`/artwork/${artworkId}`)
  }

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner" />
        <style>{`
          .gallery-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(201, 168, 76, 0.2);
            border-top-color: #c9a84c;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="gallery-module">
      {showFilter && (
        <FilterBar
          styleOptions={styleOptions}
          selectedStyle={selectedStyle}
          selectedPriceRange={selectedPriceRange}
          searchKeyword={searchKeyword}
          onStyleChange={setSelectedStyle}
          onPriceRangeChange={setSelectedPriceRange}
          onSearchChange={setSearchKeyword}
        />
      )}

      {filteredArtworks.length === 0 ? (
        <div className="empty-state">
          <p>没有找到相关作品</p>
        </div>
      ) : (
        <div className={`gallery-grid ${isVisible ? 'visible' : ''}`}>
          {filteredArtworks.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              isFavorite={favorites.includes(artwork.id)}
              onToggleFavorite={handleToggleFavorite}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <style>{`
        .gallery-module {
          width: 100%;
        }

        .empty-state {
          text-align: center;
          padding: 60px 0;
          color: #888;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          opacity: 0;
          transition: opacity 0.4s ease-in-out;
        }

        .gallery-grid.visible {
          opacity: 1;
        }

        @media (max-width: 1024px) {
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default GalleryModule
