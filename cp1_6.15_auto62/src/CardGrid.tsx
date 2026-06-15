import { Recipe } from './collection'
import RecipeCard from './RecipeCard'

interface CardGridProps {
  recipes: Recipe[]
  onToggleFavorite: (id: string) => void
  newRecipeId: string | null
}

const CardGrid = ({ recipes, onToggleFavorite, newRecipeId }: CardGridProps) => {
  return (
    <div style={styles.gridContainer}>
      <div style={styles.grid}>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onToggleFavorite={onToggleFavorite}
            isNew={recipe.id === newRecipeId}
          />
        ))}
      </div>
      {recipes.length === 0 && (
        <div style={styles.emptyState}>
          <span style={styles.emptyEmoji}>🍽️</span>
          <p style={styles.emptyText}>暂无匹配的菜谱</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  gridContainer: {
    padding: '32px 0',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    padding: '0 24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: '16px',
  },
  emptyEmoji: {
    fontSize: '64px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#999',
  },
}

export default CardGrid
