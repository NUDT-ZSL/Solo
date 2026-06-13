import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Artwork, mockGetWorkById, mockToggleFavorite, mockGetFavorites, mockAddToCart } from '../../shared/mockApi'
import { eventBus } from '../../shared/eventBus'

const DetailModule = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(true)
  const [showZoomed, setShowZoomed] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [data, favorites] = await Promise.all([
          mockGetWorkById(id),
          mockGetFavorites(),
        ])
        setArtwork(data)
        setIsFavorite(favorites.includes(id))
      } catch (error) {
        console.error('Failed to fetch artwork:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArtwork()
  }, [id])

  const handleCloseZoom = useCallback(() => {
    setShowZoomed(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showZoomed) {
        handleCloseZoom()
      }
    },
    [showZoomed, handleCloseZoom]
  )

  useEffect(() => {
    if (showZoomed) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [showZoomed, handleKeyDown])

  const handleAddToCart = async () => {
    if (!artwork || isAddingToCart) return
    setIsAddingToCart(true)
    try {
      await mockAddToCart(artwork.id)
      eventBus.emit('addToCart', artwork)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setTimeout(() => setIsAddingToCart(false), 300)
    }
  }

  const handleToggleFavorite = async () => {
    if (!artwork || isTogglingFavorite) return
    setIsTogglingFavorite(true)
    try {
      const newFavorites = await mockToggleFavorite(artwork.id)
      setIsFavorite(newFavorites.includes(artwork.id))
      eventBus.emit('favoritesUpdated', newFavorites)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setTimeout(() => setIsTogglingFavorite(false), 200)
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleImageClick = () => {
    setShowZoomed(true)
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner" />
        <style>{`
          .detail-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
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

  if (!artwork) {
    return (
      <div className="detail-not-found">
        <p>作品不存在</p>
        <button onClick={handleBack}>返回画廊</button>
      </div>
    )
  }

  return (
    <div className="detail-module">
      <button className="back-btn" onClick={handleBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        返回
      </button>

      <div className="detail-content">
        <div className="detail-image-section">
          <div
            className="detail-image-wrapper"
            onClick={handleImageClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleImageClick()
              }
            }}
          >
            {imageLoading && <div className="image-placeholder" />}
            <img
              src={artwork.image}
              alt={artwork.title}
              className={`detail-image ${imageLoading ? 'hidden' : ''}`}
              onLoad={() => setImageLoading(false)}
            />
            <div className="zoom-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" />
              </svg>
              点击放大
            </div>
          </div>
        </div>

        <div className="detail-info-section">
          <span className="artwork-style">{artwork.style}</span>
          <h1 className="artwork-title">{artwork.title}</h1>
          <p className="artwork-description">{artwork.description}</p>

          <div className="artwork-tags">
            {artwork.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="artwork-price">
            <span className="price-label">价格</span>
            <span className="price-value">¥{artwork.price}</span>
          </div>

          <div className="action-buttons">
            <button
              className={`add-to-cart-btn ${isAddingToCart ? 'animating' : ''}`}
              onClick={handleAddToCart}
              disabled={isAddingToCart}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              加入购物车
            </button>

            <button
              className={`favorite-btn ${isFavorite ? 'favorited' : ''} ${
                isTogglingFavorite ? 'animating' : ''
              }`}
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
            >
              <svg
                className="heart-icon"
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isFavorite ? '已收藏' : '加入收藏夹'}
            </button>
          </div>

          <div className="artist-info">
            <span className="artist-label">艺术家</span>
            <span className="artist-name">{artwork.artist}</span>
          </div>
        </div>
      </div>

      {showZoomed && (
        <div
          className="zoomed-image-overlay"
          onClick={handleCloseZoom}
        >
          <button
            className="close-zoom-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleCloseZoom()
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <img
            src={artwork.image}
            alt={artwork.title}
            className="zoomed-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        .detail-module {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
          box-sizing: border-box;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          margin-bottom: 24px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .back-btn:hover {
          border-color: #c9a84c;
          color: #c9a84c;
        }

        .back-btn svg {
          width: 18px;
          height: 18px;
        }

        .detail-content {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .detail-image-wrapper {
          position: relative;
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          cursor: zoom-in;
          border-radius: 12px;
          overflow: hidden;
          background: #2d2d44;
          outline: none;
          transition: box-shadow 0.3s ease;
        }

        .detail-image-wrapper:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .detail-image-wrapper:focus-visible {
          box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.4);
        }

        .detail-image {
          width: 100%;
          height: auto;
          display: block;
          transition: opacity 0.3s ease;
        }

        .detail-image.hidden {
          opacity: 0;
          position: absolute;
        }

        .image-placeholder {
          width: 100%;
          aspect-ratio: 4 / 3;
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

        .zoom-hint {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 8px;
          color: #fff;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          backdrop-filter: blur(4px);
        }

        .zoom-hint svg {
          width: 16px;
          height: 16px;
        }

        .detail-info-section {
          position: sticky;
          top: 20px;
        }

        .artwork-style {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(201, 168, 76, 0.15);
          color: #c9a84c;
          border-radius: 999px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .artwork-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 32px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 16px 0;
          line-height: 1.3;
        }

        .artwork-description {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px;
          line-height: 1.8;
          color: #a0a0a0;
          margin: 0 0 24px 0;
        }

        .artwork-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }

        .tag {
          padding: 6px 12px;
          background: rgba(74, 144, 217, 0.15);
          color: #4a90d9;
          border-radius: 999px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
        }

        .artwork-price {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 32px;
        }

        .price-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          color: #888;
        }

        .price-value {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 36px;
          font-weight: 700;
          color: #c9a84c;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .add-to-cart-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: #2d3748;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .add-to-cart-btn:hover {
          background: #3d4a5c;
          transform: translateY(-2px);
        }

        .add-to-cart-btn:active {
          transform: translateY(0);
        }

        .add-to-cart-btn.animating {
          animation: buttonBounce 0.2s ease-in-out;
        }

        @keyframes buttonBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        .add-to-cart-btn svg {
          width: 20px;
          height: 20px;
        }

        .favorite-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: #c9a84c;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .favorite-btn:hover {
          background: #b8963d;
        }

        .favorite-btn.favorited {
          background: #e74c3c;
        }

        .favorite-btn.favorited:hover {
          background: #c0392b;
        }

        .favorite-btn.animating {
          animation: heartButtonBounce 0.2s ease-in-out;
        }

        @keyframes heartButtonBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .favorite-btn svg {
          width: 20px;
          height: 20px;
        }

        .favorite-btn .heart-icon {
          fill: transparent;
          stroke: currentColor;
          stroke-width: 2;
          transition: fill 0.3s ease, stroke 0.3s ease;
        }

        .favorite-btn.favorited .heart-icon {
          fill: #fff;
          stroke: #fff;
        }

        .artist-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .artist-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          color: #888;
        }

        .artist-name {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .zoomed-image-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          cursor: zoom-out;
          animation: fadeInZoom 0.25s ease;
          padding: 40px;
        }

        @keyframes fadeInZoom {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .close-zoom-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-in-out;
        }

        .close-zoom-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .close-zoom-btn svg {
          width: 24px;
          height: 24px;
        }

        .zoomed-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 1024px) {
          .detail-module {
            padding: 0 24px;
          }

          .detail-content {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .detail-info-section {
            position: static;
          }

          .artwork-title {
            font-size: 28px;
          }

          .price-value {
            font-size: 32px;
          }
        }

        @media (max-width: 768px) {
          .detail-module {
            padding: 0 16px;
          }

          .artwork-title {
            font-size: 24px;
          }

          .action-buttons {
            flex-direction: row;
          }

          .add-to-cart-btn,
          .favorite-btn {
            flex: 1;
          }

          .zoomed-image-overlay {
            padding: 16px;
          }

          .close-zoom-btn {
            top: 16px;
            right: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default DetailModule
