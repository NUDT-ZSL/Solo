import { useState, useEffect, useCallback } from 'react'
import { PageView, User, Artwork, Artist } from './types'
import { fetchArtworks, fetchArtists, fetchPurchases } from './api'
import GalleryPage from './pages/GalleryPage'
import ArtistPage from './pages/ArtistPage'
import CollectorPage from './pages/CollectorPage'
import ArtworkDetailPage from './pages/ArtworkDetailPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  const [page, setPage] = useState<PageView>('gallery')
  const [user, setUser] = useState<User | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [purchasedIds, setPurchasedIds] = useState<string[]>([])
  const [pageKey, setPageKey] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('artmarketplace_user')
    if (saved) {
      setUser(JSON.parse(saved))
    }
    const savedFavs = localStorage.getItem('artmarketplace_favorites')
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs))
    }
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('artmarketplace_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('artmarketplace_user')
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem('artmarketplace_favorites', JSON.stringify(favorites))
  }, [favorites])

  const loadData = useCallback(async () => {
    const [aw, at] = await Promise.all([fetchArtworks(), fetchArtists()])
    setArtworks(aw)
    setArtists(at)
    if (user?.type === 'collector') {
      const purchases = await fetchPurchases()
      const myPurchases = purchases
        .filter((p: any) => p.buyerId === user.id)
        .map((p: any) => p.artworkId)
      setPurchasedIds(myPurchases)
    }
  }, [user?.id, user?.type])

  useEffect(() => {
    loadData()
  }, [loadData])

  const navigate = (target: PageView, params?: { artistId?: string; artworkId?: string }) => {
    if (params?.artistId) setSelectedArtistId(params.artistId)
    if (params?.artworkId) setSelectedArtworkId(params.artworkId)
    setPage(target)
    setPageKey(k => k + 1)
  }

  const handleLogin = (u: User) => {
    setUser(u)
  }

  const handleLogout = () => {
    setUser(null)
    setFavorites([])
    setPurchasedIds([])
    localStorage.removeItem('artmarketplace_user')
    localStorage.removeItem('artmarketplace_favorites')
    navigate('gallery')
  }

  const toggleFavorite = (artworkId: string) => {
    setFavorites(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  const handlePurchase = (artworkId: string) => {
    setPurchasedIds(prev => [...prev, artworkId])
    setArtworks(prev => prev.map(a => a.id === artworkId ? { ...a, sold: true } : a))
  }

  const handleArtistRegistered = (artist: Artist) => {
    const newUser: User = { id: artist.id, name: artist.name, type: 'artist', avatar: artist.avatar }
    setUser(newUser)
    setArtists(prev => [...prev, artist])
    navigate('artist', { artistId: artist.id })
  }

  const renderPage = () => {
    switch (page) {
      case 'gallery':
        return (
          <GalleryPage
            artworks={artworks.filter(a => !a.sold)}
            artists={artists}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onNavigate={navigate}
            user={user}
          />
        )
      case 'artist':
        return (
          <ArtistPage
            artistId={selectedArtistId}
            artworks={artworks}
            artists={artists}
            user={user}
            onNavigate={navigate}
            onArtworkUpdated={loadData}
          />
        )
      case 'collector':
        return (
          <CollectorPage
            artworks={artworks}
            artists={artists}
            favorites={favorites}
            purchasedIds={purchasedIds}
            user={user}
            onNavigate={navigate}
            onToggleFavorite={toggleFavorite}
          />
        )
      case 'artwork-detail':
        return (
          <ArtworkDetailPage
            artworkId={selectedArtworkId}
            artworks={artworks}
            artists={artists}
            favorites={favorites}
            purchasedIds={purchasedIds}
            user={user}
            onNavigate={navigate}
            onToggleFavorite={toggleFavorite}
            onPurchase={handlePurchase}
          />
        )
      case 'register':
        return <RegisterPage onRegistered={handleArtistRegistered} />
      default:
        return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 64,
        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', zIndex: 1000, borderBottom: '1px solid #1f2937',
      }}>
        <div
          style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' }}
          onClick={() => navigate('gallery')}
        >
          ArtMarketplace
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{ color: page === 'gallery' ? '#f59e0b' : '#9ca3af', cursor: 'pointer', fontSize: 14, fontWeight: page === 'gallery' ? 600 : 400 }}
            onClick={() => navigate('gallery')}
          >
            画廊
          </span>
          {user?.type === 'artist' && (
            <span
              style={{ color: page === 'artist' ? '#f59e0b' : '#9ca3af', cursor: 'pointer', fontSize: 14, fontWeight: page === 'artist' ? 600 : 400 }}
              onClick={() => navigate('artist', { artistId: user.id })}
            >
              我的作品
            </span>
          )}
          {user?.type === 'collector' && (
            <span
              style={{ color: page === 'collector' ? '#f59e0b' : '#9ca3af', cursor: 'pointer', fontSize: 14, fontWeight: page === 'collector' ? 600 : 400 }}
              onClick={() => navigate('collector')}
            >
              我的收藏
            </span>
          )}
          {!user && (
            <>
              <button
                onClick={() => navigate('register')}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600,
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                艺术家注册
              </button>
              <button
                onClick={() => {
                  const collectorUser: User = { id: 'collector_' + Date.now(), name: '收藏家', type: 'collector', avatar: '' }
                  handleLogin(collectorUser)
                  navigate('gallery')
                }}
                style={{
                  background: '#374151', color: '#f3f4f6',
                  border: '1px solid #4b5563', borderRadius: 8, padding: '8px 20px', fontWeight: 600,
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                收藏家登录
              </button>
            </>
          )}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#f3f4f6', fontSize: 14 }}>{user.name}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent', color: '#9ca3af', border: '1px solid #4b5563',
                  borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                }}
              >
                退出
              </button>
            </div>
          )}
        </div>
      </nav>

      <main key={pageKey} className="page-enter" style={{ marginTop: 64, flex: 1 }}>
        {renderPage()}
      </main>
    </div>
  )
}
