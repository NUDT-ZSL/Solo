import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Refrigerator } from 'lucide-react'
import Navbar from '@/components/Navbar'
import IngredientInput from '@/components/IngredientInput'
import RecipeCard from '@/components/RecipeCard'
import { matchRecipes, rateRecipe, toggleFavorite } from '@/http'
import type { MatchedRecipe, MatchLevel } from '@/types'
import { cn } from '@/lib/utils'

const matchLevelLabels: Record<MatchLevel, { label: string; color: string; icon: string }> = {
  perfect: { label: '完美匹配 — 所有主要食材都有', color: '#22c55e', icon: '✓' },
  partial: { label: '部分匹配 — 有部分主要食材', color: '#eab308', icon: '◐' },
  little: { label: '少量匹配 — 只有辅助食材', color: '#ef4444', icon: '△' },
}

const matchOrder: Record<MatchLevel, number> = { perfect: 0, partial: 1, little: 2 }

export default function Fridge() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [matchedResults, setMatchedResults] = useState<MatchedRecipe[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleAddIngredient = useCallback((ingredient: string) => {
    setSelectedIngredients((prev) => [...prev, ingredient])
  }, [])

  const handleRemoveIngredient = useCallback((ingredient: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i !== ingredient))
  }, [])

  const handleSearch = async () => {
    if (selectedIngredients.length === 0) return
    setSearching(true)
    try {
      const results = await matchRecipes(selectedIngredients)
      setMatchedResults(results as MatchedRecipe[])
      setSearched(true)
    } catch (err) {
      console.error('匹配失败:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleRate = async (id: string, rating: number) => {
    try {
      await rateRecipe(id, rating)
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

  const groupedResults = matchedResults.reduce<Record<MatchLevel, MatchedRecipe[]>>(
    (acc, recipe) => {
      if (!acc[recipe.matchLevel]) acc[recipe.matchLevel] = []
      acc[recipe.matchLevel].push(recipe)
      return acc
    },
    { perfect: [], partial: [], little: [] }
  )

  const sortedGroups = (Object.entries(groupedResults) as [MatchLevel, MatchedRecipe[]][])
    .filter(([, recipes]) => recipes.length > 0)
    .sort(([a], [b]) => matchOrder[a] - matchOrder[b])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f59e0b]/10 mb-4">
            <Refrigerator size={32} className="text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl font-bold text-textMain mb-2">冰箱里有什么？</h1>
          <p className="text-textSecondary">输入你现有的食材，智能推荐你能做的菜</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <IngredientInput
            selectedIngredients={selectedIngredients}
            onAdd={handleAddIngredient}
            onRemove={handleRemoveIngredient}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || selectedIngredients.length === 0}
            className={cn(
              'mt-4 w-full py-3 rounded-xl text-white font-semibold text-base transition-all btn-hover',
              searching || selectedIngredients.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#f59e0b] hover:bg-[#d97706]'
            )}
          >
            {searching ? '搜索中...' : (
              <span className="inline-flex items-center gap-2">
                <Search size={18} />
                查看推荐菜谱
              </span>
            )}
          </button>
        </div>

        {!searched && matchedResults.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <Refrigerator size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">添加食材后，点击查看推荐菜谱</p>
            <p className="text-sm mt-1">支持中英文食材名称</p>
          </div>
        )}

        {searched && matchedResults.length === 0 && (
          <div className="text-center py-16 text-textSecondary">
            <p className="text-lg">没有找到匹配的菜谱</p>
            <p className="text-sm mt-1">试试添加更多食材</p>
          </div>
        )}

        {sortedGroups.map(([level, recipes]) => {
          const config = matchLevelLabels[level]
          return (
            <div key={level} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon}
                </span>
                <h2
                  className="text-lg font-bold"
                  style={{ color: config.color }}
                >
                  {config.label}
                </h2>
                <span className="text-sm text-textSecondary">
                  ({recipes.length} 道菜谱)
                </span>
              </div>
              <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                {recipes.map((recipe, index) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    index={index}
                    showMatch
                    matchLevel={recipe.matchLevel}
                    matchedIngredients={recipe.matchedIngredients}
                    onRate={handleRate}
                    onFavorite={handleFavorite}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
