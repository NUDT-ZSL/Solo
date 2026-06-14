import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchIngredients } from '@/http'
import type { Ingredient } from '@/types'

export interface IngredientInputProps {
  selectedIngredients: string[]
  onAdd: (ingredient: string) => void
  onRemove: (ingredient: string) => void
}

export default function IngredientInput({
  selectedIngredients,
  onAdd,
  onRemove,
}: IngredientInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Ingredient[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }
    setIsLoading(true)
    try {
      const data = await searchIngredients(searchQuery)
      setSuggestions(data.filter((ing) => !selectedIngredients.includes(ing.name)))
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedIngredients])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (query.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query)
      }, 300)
    } else {
      setSuggestions([])
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || selectedIngredients.includes(trimmed)) return
    onAdd(trimmed)
    setQuery('')
    setSuggestions([])
  }, [onAdd, selectedIngredients])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      handleAdd(query)
    }
  }

  const handleFocus = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setShowDropdown(true)
  }

  const handleBlur = () => {
    closeTimerRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedIngredients.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedIngredients.map((ing) => (
            <span
              key={ing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#fef3c7] text-[#b45309] text-sm font-medium"
            >
              {ing}
              <button
                type="button"
                onClick={() => onRemove(ing)}
                className="p-0.5 rounded-full hover:bg-[#b45309]/20 transition-colors"
                aria-label={`删除 ${ing}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="输入食材名称..."
          className={cn(
            'w-full px-4 py-3 pr-10 rounded-lg border border-[#e2e8f0] bg-white text-sm text-gray-800',
            'placeholder:text-gray-400 outline-none transition-colors',
            'focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20'
          )}
        />
        <Plus
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {showDropdown && (query.trim() || isLoading) && (
        <div
          className="absolute z-50 left-0 mt-2 w-[280px] max-h-[200px] overflow-y-auto rounded-lg bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-400">搜索中...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">没有匹配的食材</div>
          ) : (
            <ul className="py-1">
              {suggestions.map((ing) => (
                <li key={ing.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAdd(ing.name)}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors',
                      'hover:bg-[#fef3c7] hover:text-[#b45309] flex items-center justify-between'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {ing.isMain && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#b45309]">
                          主料
                        </span>
                      )}
                      {ing.name}
                    </span>
                    <Plus size={14} className="text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
