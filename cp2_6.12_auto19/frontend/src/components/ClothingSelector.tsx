import { useState, useCallback } from 'react'
import { Category, ClothingStyle, SelectedClothing } from '@/types'
import { wardrobe, categoryNames, getStyleById } from '@/data/wardrobe'
import { useOutfitStore } from '@/store/useOutfitStore'
import { Shirt, Sparkles } from 'lucide-react'

const categoryIcons: Record<Category, typeof Shirt> = {
  top: Shirt,
  bottom: Shirt,
  shoes: Shirt,
  accessory: Sparkles
}

interface ClothingCardProps {
  style: ClothingStyle
  isSelected: boolean
  selectedColor: string | null
  onSelect: (style: ClothingStyle, color: string) => void
  onDeselect: () => void
}

function ClothingCard({ style, isSelected, selectedColor, onSelect, onDeselect }: ClothingCardProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)

  const displayColor = hoveredColor || selectedColor || style.colors[0]

  const handleClick = () => {
    if (isSelected) {
      onDeselect()
    } else {
      onSelect(style, style.colors[0])
    }
  }

  const handleColorClick = (e: React.MouseEvent, color: string) => {
    e.stopPropagation()
    onSelect(style, color)
  }

  return (
    <div
      className={`ripple relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 bg-white ${
        isSelected ? 'selected-card border-[#39ff14]' : 'border-transparent hover:border-gray-200'
      }`}
      style={{ boxShadow: isSelected ? undefined : '0 2px 8px rgba(0,0,0,0.06)' }}
      onClick={handleClick}
    >
      <div
        className="w-full aspect-[3/4] rounded-md mb-3 flex items-center justify-center transition-colors duration-500"
        style={{ backgroundColor: displayColor + '20' }}
      >
        <div
          className="w-16 h-20 rounded-md transition-colors duration-500"
          style={{ backgroundColor: displayColor }}
        />
      </div>
      <p className="text-sm font-medium text-gray-800 mb-2 truncate">{style.name}</p>
      <div className="flex gap-1.5 flex-wrap">
        {style.colors.map((color, idx) => (
          <button
            key={idx}
            className={`w-6 h-6 rounded-full border-2 transition-all duration-300 hover:scale-110 ${
              (selectedColor === color && isSelected) ? 'border-gray-800 scale-110' : 'border-white'
            }`}
            style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
            onClick={(e) => handleColorClick(e, color)}
            onMouseEnter={() => setHoveredColor(color)}
            onMouseLeave={() => setHoveredColor(null)}
            aria-label={`选择颜色 ${color}`}
          />
        ))}
      </div>
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#39ff14] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
    </div>
  )
}

export default function ClothingSelector() {
  const [activeCategory, setActiveCategory] = useState<Category>('top')
  const { selection, setClothing } = useOutfitStore()

  const handleSelect = useCallback(
    (style: ClothingStyle, color: string) => {
      setClothing(style.category, { styleId: style.id, color })
    },
    [setClothing]
  )

  const handleDeselect = useCallback(
    (category: Category) => {
      setClothing(category, null)
    },
    [setClothing]
  )

  const categories: Category[] = ['top', 'bottom', 'shoes', 'accessory']

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">我的衣柜</h2>
        <p className="text-sm text-gray-500">选择服装搭配您的造型</p>
      </div>

      <div className="flex border-b border-gray-100">
        {categories.map((category, idx) => {
          const Icon = categoryIcons[category]
          const isActive = activeCategory === category
          const hasSelection = selection[category] !== null
          return (
            <button
              key={category}
              className={`flex-1 py-3 px-2 text-sm font-medium transition-all duration-300 relative ${
                isActive ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setActiveCategory(category)}
              style={{
                animationDelay: `${idx * 50}ms`
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon size={18} />
                <span>{categoryNames[category]}</span>
                {hasSelection && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#39ff14] rounded-full" />
                )}
              </div>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#39ff14] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {categories.map((category) => {
          const items = wardrobe[category]
          const selected = selection[category]
          const selectedStyle = selected ? getStyleById(selected.styleId) : null

          return (
            <div
              key={category}
              className={`tab-pane h-full ${activeCategory === category ? 'active' : ''}`}
            >
              <div className="p-4 h-full overflow-y-auto scrollbar-custom">
                <div className="grid grid-cols-2 gap-3">
                  {items.map((style, idx) => {
                    const isSelected = selectedStyle?.id === style.id
                    return (
                      <div
                        key={style.id}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        className="animate-fade-in"
                      >
                        <ClothingCard
                          style={style}
                          isSelected={isSelected}
                          selectedColor={isSelected ? selected?.color || null : null}
                          onSelect={handleSelect}
                          onDeselect={() => handleDeselect(category)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
