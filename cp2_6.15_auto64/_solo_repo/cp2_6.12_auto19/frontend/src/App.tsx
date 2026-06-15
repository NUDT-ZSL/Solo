import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useParams, useNavigate, Link } from 'react-router-dom'
import ModelViewer from '@/components/ModelViewer'
import ClothingSelector from '@/components/ClothingSelector'
import OutfitPanel from '@/components/OutfitPanel'
import { useOutfitStore } from '@/store/useOutfitStore'
import { getOutfitById, likeOutfit, getLikedOutfits } from '@/api/outfitApi'
import { getUserId } from '@/store/useOutfitStore'
import { Heart, Home, ArrowLeft } from 'lucide-react'
import { Outfit } from '@/types'

function SharePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [outfit, setOutfit] = useState<Outfit | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { loadOutfit, addFavorite, removeFavorite, setFavorites } = useOutfitStore()
  const userId = getUserId()

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      setLoading(true)
      const result = await getOutfitById(id)
      if (result.success && result.data) {
        setOutfit(result.data)
        loadOutfit(result.data)
        const likedResult = await getLikedOutfits(userId)
        if (likedResult.success && likedResult.data) {
          setFavorites(likedResult.data)
          setIsLiked(likedResult.data.some((o) => o.id === id))
        }
      }
      setLoading(false)
    }
    loadData()
  }, [id, loadOutfit, userId, setFavorites])

  const handleLike = async () => {
    if (!outfit) return
    const result = await likeOutfit(outfit.id, userId)
    if (result.success && result.data) {
      setIsLiked(result.data.isLiked)
      setOutfit({ ...outfit, likes: result.data.likes })
      if (result.data.isLiked) {
        addFavorite({ ...outfit, likes: result.data.likes })
        setToast('已收藏到灵感夹')
      } else {
        removeFavorite(outfit.id)
        setToast('已取消收藏')
      }
      setTimeout(() => setToast(null), 3000)
    }
  }

  const { selection } = useOutfitStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#39ff14] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!outfit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold text-gray-700">搭配方案不存在</h2>
        <Link
          to="/"
          className="ripple flex items-center gap-2 px-6 py-3 bg-[#39ff14] text-white rounded-xl font-medium hover:bg-[#2de00f] transition-colors"
        >
          <Home size={20} />
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回搭配</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{outfit.name}</h1>
          <button
            className={`ripple flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              isLiked
                ? 'bg-red-50 text-red-500'
                : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'
            }`}
            onClick={handleLike}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="text-sm">{outfit.likes}</span>
          </button>
        </div>
      </header>
      <div className="flex-1 p-4">
        <div className="max-w-3xl mx-auto h-[70vh]">
          <ModelViewer outfit={selection} />
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-3 bg-gray-800 text-white rounded-xl text-sm font-medium animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState<'outfits' | 'favorites'>('outfits')
  const { selection, currentView } = useOutfitStore()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            <span className="text-[#39ff14]">Virtual</span> Stylist
          </h1>
          <div className="flex items-center gap-2">
            <button
              className={`ripple flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'outfits'
                  ? 'bg-[#39ff14] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('outfits')}
            >
              <Home size={16} />
              我的搭配
            </button>
            <button
              className={`ripple flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'favorites'
                  ? 'bg-[#39ff14] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('favorites')}
            >
              <Heart size={16} />
              灵感收藏
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 h-full">
            <div className="hidden lg:block h-[calc(100vh-120px)]">
              <ClothingSelector />
            </div>

            <div className="h-[400px] lg:h-[calc(100vh-120px)] order-1 lg:order-2">
              <ModelViewer outfit={selection} />
            </div>

            <div className="h-[500px] lg:h-[calc(100vh-120px)] order-2 lg:order-3">
              <OutfitPanel
                mode={activeTab === 'favorites' ? 'favorites' : 'my-outfits'}
                showSaveButton={activeTab === 'outfits'}
              />
            </div>

            <div className="lg:hidden h-[500px] order-3">
              <ClothingSelector />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function FavoritesPage() {
  const navigate = useNavigate()
  const { favorites, setFavorites } = useOutfitStore()
  const userId = getUserId()

  useEffect(() => {
    const loadFavorites = async () => {
      const result = await getLikedOutfits(userId)
      if (result.success && result.data) {
        setFavorites(result.data)
      }
    }
    loadFavorites()
  }, [userId, setFavorites])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">灵感收藏夹</h1>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {favorites.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-gray-400">
              <Heart size={48} className="text-gray-300 mb-4" />
              <p className="text-lg">还没有收藏任何搭配</p>
              <p className="text-sm mt-2">浏览搭配并点击心形图标收藏灵感</p>
            </div>
          ) : (
            <div className="masonry-grid">
              {favorites.map((outfit) => (
                <div key={outfit.id} className="masonry-item">
                  <div
                    className="outfit-card bg-white rounded-xl overflow-hidden cursor-pointer"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                    onClick={() => navigate(`/share/${outfit.id}`)}
                  >
                    <img
                      src={outfit.thumbnail}
                      alt={outfit.name}
                      className="w-full object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-medium text-gray-800 text-sm mb-1 truncate">
                        {outfit.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Heart size={12} fill="currentColor" />
                        <span>{outfit.likes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
