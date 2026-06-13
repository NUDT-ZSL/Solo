import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Artwork, mockGetWorks, mockGetFavorites, mockToggleFavorite } from '../shared/mockApi'

const ProfilePage = () => {
  const { user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return
      try {
        const [allWorks, favoriteIds] = await Promise.all([
          mockGetWorks(),
          mockGetFavorites(),
        ])
        const favoriteArtworks = allWorks.filter((work) =>
          favoriteIds.includes(work.id)
        )
        setFavorites(favoriteArtworks)
      } catch (error) {
        console.error('Failed to fetch favorites:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFavorites()
  }, [user])

  const handleRemoveFavorite = async (artworkId: string) => {
    const newFavorites = await mockToggleFavorite(artworkId)
    setFavorites((prev) => prev.filter((artwork) => artwork.id !== artworkId))
    return newFavorites
  }

  const handleArtworkClick = (artworkId: string) => {
    navigate(`/artwork/${artworkId}`)
  }

  if (authLoading || loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <style>{`
          .profile-loading {
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

  if (!user) return null

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <img src={user.avatar} alt={user.nickname} className="profile-avatar" />
          <div className="profile-info">
            <h1 className="profile-name">{user.nickname}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="section-title">我的收藏</h2>
          {favorites.length === 0 ? (
            <div className="empty-favorites">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p>暂无收藏作品</p>
              <button className="browse-btn" onClick={() => navigate('/')}>
                去浏览作品
              </button>
            </div>
          ) : (
            <div className="favorites-grid">
              {favorites.map((artwork) => (
                <div
                  key={artwork.id}
                  className="favorite-card"
                  onClick={() => handleArtworkClick(artwork.id)}
                >
                  <div className="favorite-image-wrapper">
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.title}
                      className="favorite-image"
                    />
                    <button
                      className="remove-favorite-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFavorite(artwork.id)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                  <div className="favorite-info">
                    <h3 className="favorite-title">{artwork.title}</h3>
                    <p className="favorite-price">¥{artwork.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .profile-page {
          min-height: calc(100vh - 80px);
          padding: 40px 0;
          background: #1a1a2e;
        }

        .profile-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          background: #2d2d44;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #c9a84c;
        }

        .profile-info {
          flex: 1;
        }

        .profile-name {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #e0e0e0;
          margin: 0 0 4px 0;
        }

        .profile-email {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: #888;
          margin: 0;
        }

        .profile-section {
          background: #2d2d44;
          border-radius: 12px;
          padding: 32px;
        }

        .section-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 24px 0;
        }

        .empty-favorites {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: #666;
        }

        .empty-favorites svg {
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        .empty-favorites p {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          margin: 0 0 20px 0;
        }

        .browse-btn {
          padding: 10px 24px;
          background: #c9a84c;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .browse-btn:hover {
          background: #b8963d;
        }

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .favorite-card {
          background: #1a1a2e;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .favorite-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .favorite-image-wrapper {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
        }

        .favorite-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .favorite-card:hover .favorite-image {
          transform: scale(1.05);
        }

        .remove-favorite-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.5);
          color: #e74c3c;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .remove-favorite-btn:hover {
          background: rgba(231, 76, 60, 0.9);
          color: #fff;
          transform: scale(1.1);
        }

        .remove-favorite-btn svg {
          width: 16px;
          height: 16px;
        }

        .favorite-info {
          padding: 12px;
        }

        .favorite-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 6px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .favorite-price {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #c9a84c;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .profile-container {
            padding: 0 24px;
          }

          .favorites-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .profile-container {
            padding: 0 16px;
          }

          .profile-header {
            padding: 20px;
            flex-direction: column;
            text-align: center;
          }

          .profile-section {
            padding: 20px;
          }

          .favorites-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }
      `}</style>
    </div>
  )
}

export default ProfilePage
