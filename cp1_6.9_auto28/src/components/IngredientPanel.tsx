import { useState } from 'react'
import { Ingredient, CATEGORIES } from '../types'
import { getIngredientsByCategory } from '../data/ingredients'

interface IngredientPanelProps {
  readonly?: boolean
}

export default function IngredientPanel({ readonly = false }: IngredientPanelProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, ingredient: Ingredient) => {
    if (readonly) return
    e.dataTransfer.setData('application/json', JSON.stringify(ingredient))
    e.dataTransfer.effectAllowed = 'copy'
    setDraggingId(ingredient.id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
  }

  return (
    <div className="ingredient-panel">
      <h2>🧺 食材库</h2>

      {CATEGORIES.map(category => {
        const ingredients = getIngredientsByCategory(category.key)
        return (
          <div key={category.key} className="category-section">
            <div className="category-title">
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </div>
            <div className="ingredient-grid">
              {ingredients.map(ingredient => (
                <div
                  key={ingredient.id}
                  className={`ingredient-card ${draggingId === ingredient.id ? 'dragging' : ''}`}
                  draggable={!readonly}
                  onDragStart={(e) => handleDragStart(e, ingredient)}
                  onDragEnd={handleDragEnd}
                  title={`${ingredient.name} - ${ingredient.calories}kcal/100g`}
                >
                  <div className="ingredient-card-icon">{ingredient.icon}</div>
                  <div className="ingredient-card-name">{ingredient.name}</div>
                  <div className="ingredient-card-cal">{ingredient.calories} kcal</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
