import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Edit3, Heart, XCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { getUserRecipes, getUserFavorites, deleteRecipe, toggleFavorite } from '@/http'
import type { Recipe, CuisineType } from '@/types'
import { cn } from '@/lib/utils'

const cuisineMap: Record<CuisineType, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩餐',
}

function MiniCard({
  recipe,
  children,
}: {
  recipe: Recipe
  children: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <div
      className="inline-block w-[240px] flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
      style={{ borderRadius: '12px' }}
      onClick={() => navigate(`/recipe/${recipe.id}`)}
    >
      <img
        src={recipe.coverImage}
        alt={recipe.title}
        className="w-full h-[140px] object-cover"
      />
      <div className="p-3">
        <h4 className="text-sm font-bold text-[#1f2937] line-clamp-1 mb-1">{recipe.title}</h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-md bg-[#fef3c7] text-[#b45309] text-xs">
            {cuisineMap[recipe.cuisine]}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Profile() {
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [myFavorites, setMyFavorites] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipes, favorites] = await Promise.all([
          getUserRecipes(),
          getUserFavorites(),
        ])
        setMyRecipes(recipes as Recipe[])
        setMyFavorites(favorites as Recipe[])
      } catch (err) {
        console.error('加载数据失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id)
      setMyRecipes((prev) => prev.filter((r) => r.id !== id))
      setMyFavorites((prev) => prev.filter((r) => r.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  const handleUnfavorite = async (id: string) => {
    try {
      await toggleFavorite(id)
      setMyFavorites((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('取消收藏失败:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-8">
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#f59e0b] flex items-center justify-center text-white text-2xl font-bold">
              我
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1f2937]">家庭厨师</h2>
              <p className="text-sm text-textSecondary">
                已发布 {myRecipes.length} 道菜谱 · 收藏 {myFavorites.length} 道菜谱
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1f2937]">我发布的菜谱</h3>
            <button
              type="button"
              onClick={() => navigate('/publish')}
              className="text-sm text-[#f59e0b] hover:text-[#d97706] font-medium transition-colors"
            >
              + 发布新菜谱
            </button>
          </div>
          {myRecipes.length === 0 ? (
            <div className="text-center py-8 text-textSecondary bg-white rounded-2xl">
              <p>还没有发布菜谱</p>
              <button
                type="button"
                onClick={() => navigate('/publish')}
                className="mt-2 text-[#f59e0b] hover:text-[#d97706] font-medium transition-colors"
              >
                去发布第一道菜谱
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {myRecipes.map((recipe) => (
                <MiniCard key={recipe.id} recipe={recipe}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/publish?edit=${recipe.id}`)
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#e2e8f0'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#f1f5f9'
                      }}
                      aria-label="编辑"
                    >
                      <Edit3 size={14} className="text-gray-600" />
                    </button>
                    {confirmDelete === recipe.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(recipe.id)
                          }}
                          className="text-xs text-red-500 font-medium"
                        >
                          确认
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(null)
                          }}
                          className="text-xs text-gray-400"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete(recipe.id)
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#f1f5f9',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#e2e8f0'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '#f1f5f9'
                        }}
                        aria-label="删除"
                      >
                        <Trash2 size={14} className="text-gray-600" />
                      </button>
                    )}
                  </div>
                </MiniCard>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#1f2937] mb-4">我收藏的菜谱</h3>
          {myFavorites.length === 0 ? (
            <div className="text-center py-8 text-textSecondary bg-white rounded-2xl">
              <Heart size={32} className="mx-auto mb-2 opacity-30" />
              <p>还没有收藏菜谱</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-[#f59e0b] hover:text-[#d97706] font-medium transition-colors"
              >
                去发现美味菜谱
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {myFavorites.map((recipe) => (
                <MiniCard key={recipe.id} recipe={recipe}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnfavorite(recipe.id)
                    }}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <XCircle size={14} />
                    取消收藏
                  </button>
                </MiniCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
