import { useState, useEffect, useRef } from 'react'
import { Artwork } from '../../shared/mockApi'

interface ArtworkCardProps {
  artwork: Artwork
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onClick: (id: string) => void
}

const ArtworkCard = ({
  artwork,
  isFavorite,
  onToggleFavorite,
  onClick,
}: ArtworkCardProps) => {
  const [loaded, setLoaded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setLoaded(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '100px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)
    onToggleFavorite(artwork.id)
  }

  return (
    <div
      className="artwork-card"
      onClick={() => onClick(artwork.id)}
      ref={imgRef}
    >
      <div className="card-image-wrapper">
        {loaded ? (
          <img
            src={artwork.thumbnail}
            alt={artwork.title}
            className="card-image"
            loading="lazy"
          />
        ) : (
          <div className="card-image-placeholder" />
        )}
        <button
          className={`favorite-btn ${isFavorite ? 'favorited' : ''} ${
            isAnimating ? 'animating' : ''
          }`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
        >
          <svg
            viewBox="0 0 24 24"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="card-content">
        <h3 className="card-title">{artwork.title}</h3>
        <div className="card-tags">
          {artwork.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <p className="card-price">¥{artwork.price}</p>
      </div>

      <style>{`
        .artwork-card {
          background: #2d2d44;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
        }

        .artwork-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .card-image-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease-in-out;
        }

        .artwork-card:hover .card-image {
          transform: scale(1.05);
        }

        .card-image-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(110deg, #2d2d44 8%, #3d3d5c 18%, #2d2d44 33%);
          background-size: 200% 100%;
          animation: shimmer 1.5s linear infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .favorite-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.4);
          color: #e0e0e0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-in-out;
          backdrop-filter: blur(4px);
        }

        .favorite-btn:hover {
          background: rgba(0, 0, 0, 0.6);
          transform: scale(1.05);
        }

        .favorite-btn.favorited {
          color: #e74c3c;
        }

        .favorite-btn.animating {
          animation: heartBounce 0.2s ease-in-out;
        }

        @keyframes heartBounce {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .favorite-btn svg {
          width: 20px;
          height: 20px;
        }

        .card-content {
          padding: 16px;
        }

        .card-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .card-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .tag {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(201, 168, 76, 0.15);
          color: #c9a84c;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .card-price {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #c9a84c;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

export default ArtworkCard
