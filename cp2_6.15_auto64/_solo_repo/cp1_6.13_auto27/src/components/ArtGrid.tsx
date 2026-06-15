import { Artwork } from '../types'

interface ArtGridProps {
  artworks: Artwork[]
  onArtClick: (artwork: Artwork) => void
}

function ArtGrid({ artworks, onArtClick }: ArtGridProps) {
  return (
    <div className="art-grid">
      {artworks.map((artwork) => (
        <div
          key={artwork.id}
          className="art-card"
          onClick={() => onArtClick(artwork)}
        >
          <img src={artwork.image} alt={artwork.name} loading="lazy" />
          <div className="art-name">{artwork.name}</div>
        </div>
      ))}
    </div>
  )
}

export default ArtGrid
