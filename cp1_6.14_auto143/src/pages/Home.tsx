import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import RecipeCard from '@/components/RecipeCard'
import type { Recipe } from '@/types'
import { getRecipes } from '@/http'
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

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [page, setPage] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const observerRef = useRef<HTMLDivElement>(null)

  const loadRecipes = useCallback(async (pageNum: number) => {
    if (loading) return
    setLoading(true)
    try {
      const data = await getRecipes(pageNum, PAGE_SIZE)
      if (pageNum === 1) {
        setRecipes(data)
      } else {
        setRecipes((prev) => [...prev, ...data])
      }
      if (data.length < PAGE_SIZE) {
        setHasMore(false)
      }
    } catch (err) {
      console.error('加载菜谱失败:', err)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [loading])

  useEffect(() => {
    loadRecipes(1)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoading) {
          setPage((prev) => {
            const next = prev + 1
            loadRecipes(next)
            return next
          })
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, initialLoading, loadRecipes])

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
            : recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
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
