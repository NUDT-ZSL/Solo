import { useState, useEffect, useCallback } from 'react'
import { Outfit, SelectedClothing } from '@/types'
import { useOutfitStore, getUserId } from '@/store/useOutfitStore'
import {
  saveOutfit,
  getOutfits,
  generateShareLink,
  copyToClipboard,
  generateThumbnail,
  likeOutfit,
  getLikedOutfits
} from '@/api/outfitApi'
import { Share2, Heart, Save, Trash2, Check, Copy, X } from 'lucide-react'

interface OutfitCardProps {
  outfit: Outfit
  onLoad: (outfit: Outfit) => void
  onShare: (outfit: Outfit) => void
  onLike: (outfit: Outfit) => void
  isLiked: boolean
  showDelete?: boolean
  onDelete?: (id: string) => void
}

function OutfitCard({ outfit, onLoad, onShare, onLike, isLiked, showDelete, onDelete }: OutfitCardProps) {
  const [copied, setCopied] = useState(false)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = generateShareLink(outfit.id)
    const success = await copyToClipboard(link)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    onShare(outfit)
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike(outfit)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(outfit.id)
    }
  }

  return (
    <div className="outfit-card bg-white rounded-xl overflow-hidden cursor-pointer group" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="relative" onClick={() => onLoad(outfit)}>
        {outfit.thumbnail ? (
          <img
            src={outfit.thumbnail}
            alt={outfit.name}
            className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-gray-100 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          </div>
        )}
        {showDelete && (
          <button
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            onClick={handleDeleteClick}
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-gray-800 text-sm mb-1 truncate">{outfit.name}</h4>
        <p className="text-xs text-gray-400 mb-3">{formatDate(outfit.createdAt)}</p>
        <div className="flex items-center justify-between">
          <button
            className={`ripple flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isLiked
                ? 'bg-red-50 text-red-500'
                : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500'
            }`}
            onClick={handleLikeClick}
          >
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
            <span>{outfit.likes}</span>
          </button>
          <button
            className={`ripple flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
            onClick={handleShareClick}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? '已复制' : '分享'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  top: SelectedClothing | null
  bottom: SelectedClothing | null
  shoes: SelectedClothing | null
  accessory: SelectedClothing | null
}

function SaveModal({ isOpen, onClose, onSave, top, bottom, shoes, accessory }: SaveModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(`搭配方案 ${new Date().toLocaleDateString('zh-CN')}`)
    }
  }, [isOpen])

  const canSave = top && bottom && shoes

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-slide-in-right">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">保存搭配方案</h3>
          <button
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {!canSave && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
            请至少选择上衣、下装和鞋子才能保存搭配方案
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            方案名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="为您的搭配取个名字..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className={`ripple flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              canSave
                ? 'bg-[#39ff14] text-white hover:bg-[#2de00f]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={() => canSave && onSave(name)}
            disabled={!canSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

interface OutfitPanelProps {
  showSaveButton?: boolean
  mode?: 'my-outfits' | 'favorites'
}

export default function OutfitPanel({ showSaveButton = true, mode = 'my-outfits' }: OutfitPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { selection, outfits, setOutfits, addOutfit, loadOutfit, favorites, setFavorites, addFavorite, removeFavorite } = useOutfitStore()
  const userId = getUserId()

  const outfitsToShow = mode === 'favorites' ? favorites : outfits

  useEffect(() => {
    const loadData = async () => {
      if (mode === 'favorites') {
        const result = await getLikedOutfits(userId)
        if (result.success && result.data) {
          setFavorites(result.data)
        }
      } else {
        const result = await getOutfits()
        if (result.success && result.data) {
          setOutfits(result.data)
        }
      }
    }
    loadData()
  }, [mode, userId, setOutfits, setFavorites])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleSave = useCallback(
    async (name: string) => {
      if (!selection.top || !selection.bottom || !selection.shoes) return

      setSaving(true)
      try {
        const thumbnail = generateThumbnail(
          selection.top,
          selection.bottom,
          selection.shoes,
          selection.accessory
        )

        const result = await saveOutfit({
          name,
          top: selection.top,
          bottom: selection.bottom,
          shoes: selection.shoes,
          accessory: selection.accessory,
          thumbnail
        })

        if (result.success && result.data) {
          addOutfit(result.data)
          setShowSaveModal(false)
          showToast('搭配方案保存成功！', 'success')
        } else {
          showToast(result.error || '保存失败，请重试', 'error')
        }
      } catch (error) {
        showToast('保存失败，请重试', 'error')
      } finally {
        setSaving(false)
      }
    },
    [selection, addOutfit, showToast]
  )

  const handleLoad = useCallback(
    (outfit: Outfit) => {
      loadOutfit(outfit)
      showToast(`已加载「${outfit.name}」`, 'success')
    },
    [loadOutfit, showToast]
  )

  const handleShare = useCallback(
    (outfit: Outfit) => {
      showToast('分享链接已复制到剪贴板', 'success')
    },
    [showToast]
  )

  const handleLike = useCallback(
    async (outfit: Outfit) => {
      const result = await likeOutfit(outfit.id, userId)
      if (result.success && result.data) {
        if (result.data.isLiked) {
          addFavorite({ ...outfit, likes: result.data.likes })
          showToast('已收藏到灵感夹', 'success')
        } else {
          removeFavorite(outfit.id)
          showToast('已取消收藏', 'success')
        }
        if (mode === 'my-outfits') {
          setOutfits(
            outfits.map((o) =>
              o.id === outfit.id ? { ...o, likes: result.data.likes } : o
            )
          )
        }
      }
    },
    [userId, addFavorite, removeFavorite, mode, outfits, setOutfits, showToast]
  )

  const isLiked = useCallback(
    (outfitId: string) => {
      return favorites.some((f) => f.id === outfitId)
    },
    [favorites]
  )

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              {mode === 'favorites' ? '灵感收藏夹' : '我的搭配'}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === 'favorites'
                ? `已收藏 ${favorites.length} 个搭配`
                : `${outfits.length}/20 个方案`}
            </p>
          </div>
          {showSaveButton && mode === 'my-outfits' && (
            <button
              className={`ripple flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                selection.top && selection.bottom && selection.shoes
                  ? 'bg-[#39ff14] text-white hover:bg-[#2de00f]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              onClick={() =>
                selection.top && selection.bottom && selection.shoes && setShowSaveModal(true)
              }
              disabled={!selection.top || !selection.bottom || !selection.shoes}
            >
              <Save size={18} />
              <span className="text-sm">保存</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-custom p-4">
        {outfitsToShow.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {mode === 'favorites' ? (
                <Heart size={32} className="text-gray-300" />
              ) : (
                <Share2 size={32} className="text-gray-300" />
              )}
            </div>
            <p className="text-sm">
              {mode === 'favorites'
                ? '还没有收藏任何搭配'
                : '还没有保存任何搭配方案'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {outfitsToShow.map((outfit, idx) => (
              <div
                key={outfit.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="animate-fade-in"
              >
                <OutfitCard
                  outfit={outfit}
                  onLoad={handleLoad}
                  onShare={handleShare}
                  onLike={handleLike}
                  isLiked={isLiked(outfit.id)}
                  showDelete={mode === 'my-outfits'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        top={selection.top}
        bottom={selection.bottom}
        shoes={selection.shoes}
        accessory={selection.accessory}
      />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in z-50 ${
            toast.type === 'success'
              ? 'bg-gray-800 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
