import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Heart, ArrowLeft, Clock, ChefHat } from 'lucide-react'
import Navbar from '@/components/Navbar'
import StarRating from '@/components/StarRating'
import { getRecipe, getComments, createComment, reactComment, rateRecipe, toggleFavorite } from '@/http'
import type { Recipe, Comment as RecipeComment, CuisineType } from '@/types'
import { cn } from '@/lib/utils'

const cuisineMap: Record<CuisineType, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩餐',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [comments, setComments] = useState<RecipeComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [recipeData, commentsData] = await Promise.all([
          getRecipe(id),
          getComments(id),
        ])
        setRecipe(recipeData as Recipe)
        setComments(commentsData as RecipeComment[])
      } catch (err) {
        console.error('加载菜谱失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleRate = async (rating: number) => {
    if (!id) return
    try {
      const res = await rateRecipe(id, rating) as { rating: number; ratingCount: number }
      setRecipe((prev) => prev ? { ...prev, rating: res.rating, ratingCount: res.ratingCount } : prev)
    } catch (err) {
      console.error('评分失败:', err)
    }
  }

  const handleFavorite = async () => {
    if (!id) return
    try {
      await toggleFavorite(id)
      setIsFavorite(!isFavorite)
    } catch (err) {
      console.error('收藏失败:', err)
    }
  }

  const handleComment = async () => {
    if (!id || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const newComment = await createComment(id, commentText.trim()) as RecipeComment
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
    } catch (err) {
      console.error('评论失败:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleReact = async (commentId: string, type: 'like' | 'dislike') => {
    try {
      const updated = await reactComment(commentId, type) as RecipeComment
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c))
      )
    } catch (err) {
      console.error('操作失败:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-[720px] mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-[300px] bg-gray-200 rounded-3xl" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center">
          <p className="text-textSecondary text-lg">菜谱不存在</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-[#f59e0b] text-white rounded-xl btn-hover"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const mainIngredients = recipe.ingredients.filter((i) => i.isMain)
  const subIngredients = recipe.ingredients.filter((i) => !i.isMain)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-[720px] mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-textSecondary hover:text-textMain transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        <div
          className="rounded-3xl bg-[#f8fafc] overflow-hidden"
          style={{ padding: '32px', borderRadius: '24px' }}
        >
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            className="w-full h-[300px] object-cover rounded-2xl mb-6"
          />

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2937] mb-3">{recipe.title}</h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-[#fef3c7] text-[#b45309] text-sm font-medium">
                  {cuisineMap[recipe.cuisine]}
                </span>
                <StarRating
                  rating={recipe.rating}
                  maxStars={3}
                  size={22}
                  onRate={handleRate}
                />
                <span className="text-sm text-textSecondary">
                  {recipe.ratingCount} 人评分
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFavorite}
              className={cn(
                'p-3 rounded-xl transition-all btn-hover',
                isFavorite
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-100 text-gray-400 hover:text-red-400'
              )}
            >
              <Heart
                size={24}
                className={cn(
                  'transition-all',
                  isFavorite ? 'fill-red-500 stroke-red-500' : 'fill-transparent'
                )}
              />
            </button>
          </div>

          {(mainIngredients.length > 0 || subIngredients.length > 0) && (
            <div className="mb-6 p-4 bg-white rounded-xl">
              <h3 className="text-sm font-semibold text-textSecondary mb-3 flex items-center gap-2">
                <ChefHat size={16} />
                食材清单
              </h3>
              {mainIngredients.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-textSecondary mb-1.5">主要食材</p>
                  <div className="flex flex-wrap gap-2">
                    {mainIngredients.map((ing) => (
                      <span
                        key={ing.name}
                        className="px-3 py-1 rounded-lg bg-[#fef3c7] text-[#b45309] text-sm font-medium"
                      >
                        {ing.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {subIngredients.length > 0 && (
                <div>
                  <p className="text-xs text-textSecondary mb-1.5">辅助食材</p>
                  <div className="flex flex-wrap gap-2">
                    {subIngredients.map((ing) => (
                      <span
                        key={ing.name}
                        className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm"
                      >
                        {ing.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-bold text-[#1f2937] mb-3">制作步骤</h3>
            <div className="text-[#1f2937] leading-relaxed whitespace-pre-line">
              {recipe.steps}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-[#1f2937] mb-4">评论</h3>

            <div className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="分享你的看法..."
                className="w-full min-h-[80px] px-4 py-3 rounded-lg border border-[#e2e8f0] bg-white text-sm outline-none transition-colors resize-y focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
                style={{ minWidth: '80px', border: '1px solid #e2e8f0' }}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleComment}
                  disabled={submittingComment || !commentText.trim()}
                  className={cn(
                    'px-5 py-2 rounded-lg text-sm font-medium transition-all btn-hover',
                    submittingComment || !commentText.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#f59e0b] text-white hover:bg-[#d97706]'
                  )}
                >
                  {submittingComment ? '发送中...' : '发表评论'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {comments.length === 0 && (
                <p className="text-center text-textSecondary py-8">暂无评论，快来抢沙发！</p>
              )}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 bg-white rounded-xl"
                >
                  <p className="text-[#1f2937] text-sm mb-3">{comment.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-textSecondary flex items-center gap-1">
                      <Clock size={12} />
                      {timeAgo(comment.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleReact(comment.id, 'like')}
                        className="flex items-center gap-1 transition-all"
                        style={{ transition: 'all 0.2s' }}
                      >
                        <ThumbsUp
                          size={16}
                          style={{ color: comment.userLike === 'like' ? '#3b82f6' : '#94a3b8' }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: comment.userLike === 'like' ? '#3b82f6' : '#94a3b8' }}
                        >
                          {comment.likes}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReact(comment.id, 'dislike')}
                        className="flex items-center gap-1 transition-all"
                        style={{ transition: 'all 0.2s' }}
                      >
                        <ThumbsDown
                          size={16}
                          style={{ color: comment.userLike === 'dislike' ? '#ef4444' : '#94a3b8' }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: comment.userLike === 'dislike' ? '#ef4444' : '#94a3b8' }}
                        >
                          {comment.dislikes}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
