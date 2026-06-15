import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import RecipeCard from '@/components/RecipeCard'
import type { Recipe } from '@/types'
import { getRecipes, rateRecipe, toggleFavorite } from '@/http'
import { Loader2 } from 'lucide-react'

const PAGE_SIZE = 8

function SkeletonCard() {
  return (
    <div className="break-inside-avoid mb-4 bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
      </div>
    </div>
  )
}

interface PaginatedResponse {
  data: Recipe[]
  total: number
  page: number
  limit: number
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const currentPageRef = useRef<number>(1)
  const isLoadingRef = useRef<boolean>(false)
  const loadedPageSet = useRef<Set<number>>(new Set())

  const loadRecipes = useCallback(async (pageNum: number) => {
    if (isLoadingRef.current || loadedPageSet.current.has(pageNum)) return
    isLoadingRef.current = true
    setLoading(true)
    loadedPageSet.current.add(pageNum)
    try {
      const res = await getRecipes(pageNum, PAGE_SIZE) as unknown as PaginatedResponse
      const newRecipes = res.data || []
      if (pageNum === 1) {
        setRecipes(newRecipes)
      } else {
        setRecipes((prev) => [...prev, ...newRecipes])
      }
      const totalLoaded = (pageNum - 1) * PAGE_SIZE + newRecipes.length
      if (totalLoaded >= res.total || newRecipes.length < PAGE_SIZE) {
        setHasMore(false)
      }
    } catch (err) {
      console.error('加载菜谱失败:', err)
      loadedPageSet.current.delete(pageNum)
    } finally {
      isLoadingRef.current = false
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecipes(1)
  }, [loadRecipes])

  useEffect(() => {
    if (!observerRef.current) return
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current && !initialLoading) {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            const nextPage = currentPageRef.current + 1
            currentPageRef.current = nextPage
            loadRecipes(nextPage)
          }, 150)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(observerRef.current)
    return () => {
      observer.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [hasMore, initialLoading, loadRecipes])

  const handleRate = async (id: string, rating: number) => {
    try {
      await rateRecipe(id, rating)
      setRecipes((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          const total = r.rating * r.ratingCount + rating
          const newCount = r.ratingCount + 1
          return { ...r, rating: Number((total / newCount).toFixed(1)), ratingCount: newCount }
        })
      )
    } catch (err) {
      console.error('评分失败:', err)
    }
  }

  const handleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id)
    } catch (err) {
      console.error('收藏失败:', err)
    }
  }

  const handleCardClick = (id: string) => {
    navigate(`/recipe/${id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-textMain mb-2">发现美食</h1>
          <p className="text-textSecondary text-lg">来自家庭厨师的拿手菜谱</p>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {initialLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : recipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={index}
                  onRate={handleRate}
                  onFavorite={handleFavorite}
                  onCardClick={handleCardClick}
                />
              ))}
        </div>

        <div ref={observerRef} className="h-20 flex items-center justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-textSecondary">
              <Loader2 size={20} className="animate-spin" />
              <span>加载中...</span>
            </div>
          )}
          {!hasMore && recipes.length > 0 && !loading && (
            <p className="text-textSecondary text-sm">没有更多菜谱了</p>
          )}
          {!initialLoading && recipes.length === 0 && !loading && (
            <p className="text-textSecondary">暂无菜谱，快去发布第一个吧！</p>
          )}
        </div>
      </div>
    </div>
  )
}
