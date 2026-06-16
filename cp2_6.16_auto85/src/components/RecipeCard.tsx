import { Recipe } from '../services/api'

interface RecipeCardProps {
  recipe: Recipe
  onClick?: () => void
}

const cuisineColors: Record<string, string> = {
  chinese: '#fef3c7',
  western: '#dbeafe',
  japanese: '#fce7f3',
  fusion: '#e0e7ff'
}

const cuisineLabels: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  japanese: '日式',
  fusion: '融合'
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const bgColor = cuisineColors[recipe.cuisine] || '#f5f5f4'
  const cuisineLabel = cuisineLabels[recipe.cuisine] || '其他'

  return (
    <div
      className="recipe-card"
      style={{ backgroundColor: bgColor }}
      onClick={onClick}
    >
      <div className="recipe-card-header">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <span className="recipe-card-cuisine">{cuisineLabel}</span>
      </div>
      <p className="recipe-card-description">{recipe.description}</p>
      <div className="recipe-card-footer">
        <span className="recipe-card-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {recipe.cookTime} 分钟
        </span>
        <span className="recipe-card-ingredients-count">
          {recipe.ingredients.length} 种食材
        </span>
      </div>
      <div className="recipe-card-ingredients">
        {recipe.ingredients.slice(0, 3).map((ing) => (
          <span key={ing.id} className="ingredient-tag">
            {ing.name}
          </span>
        ))}
        {recipe.ingredients.length > 3 && (
          <span className="ingredient-more">+{recipe.ingredients.length - 3}</span>
        )}
      </div>
    </div>
  )
}
