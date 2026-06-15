import { useState, useMemo } from 'react'
import {
  Recipe,
  generateInitialRecipes,
  toggleFavorite,
  filterByCategory,
  filterBySearch,
  addRecipe,
} from './collection'
import CardGrid from './CardGrid'
import CreateRecipe from './CreateRecipe'

const categories = ['全部', '中式', '西式', '日式', '甜点']

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(generateInitialRecipes)
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRecipeId, setNewRecipeId] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const filteredRecipes = useMemo(() => {
    let result = recipes
    result = filterByCategory(result, activeCategory)
    result = filterBySearch(result, searchKeyword)
    return result
  }, [recipes, activeCategory, searchKeyword])

  const handleToggleFavorite = (id: string) => {
    setRecipes((prev) => toggleFavorite(prev, id))
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value)
  }

  const handleCreateRecipe = (newRecipe: Recipe) => {
    setRecipes((prev) => addRecipe(prev, newRecipe))
    setNewRecipeId(newRecipe.id)
    setTimeout(() => setNewRecipeId(null), 500)
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoEmoji}>📖</span>
            <h1 style={styles.title}>菜谱卡片集</h1>
          </div>
          <button
            style={styles.createButton}
            onClick={() => setShowCreateForm(true)}
          >
            <span style={styles.createIcon}>+</span>
            创建菜谱
          </button>
        </div>
      </header>

      <nav style={styles.nav}>
        <div style={styles.categoryContainer}>
          {categories.map((category) => (
            <button
              key={category}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === category ? styles.categoryButtonActive : {}),
              }}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </nav>

      <main style={styles.main}>
        <CardGrid
          recipes={filteredRecipes}
          onToggleFavorite={handleToggleFavorite}
          newRecipeId={newRecipeId}
        />
      </main>

      <div style={styles.searchContainer}>
        <input
          type="text"
          style={{
            ...styles.searchInput,
            borderColor: isFocused ? '#FFC107' : '#E0E0E0',
            boxShadow: isFocused ? '0 0 0 3px rgba(255, 193, 7, 0.2)' : 'none',
          }}
          placeholder="搜索菜谱..."
          value={searchKeyword}
          onChange={handleSearchChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <span style={styles.searchIcon}>🔍</span>
      </div>

      <CreateRecipe
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateRecipe}
      />

      <style>{`
        .grid-fade-enter {
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#FFF8E7',
    position: 'relative',
  },
  header: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoEmoji: {
    fontSize: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    margin: 0,
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#FFC107',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '24px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
  },
  createIcon: {
    fontSize: '20px',
    fontWeight: 700,
  },
  nav: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F0F0F0',
  },
  categoryContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: '8px 20px',
    border: '2px solid #E0E0E0',
    backgroundColor: '#FAFAFA',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  categoryButtonActive: {
    borderColor: '#FFC107',
    backgroundColor: '#FFF8E7',
    color: '#FF9800',
    fontWeight: 600,
  },
  main: {
    paddingBottom: '100px',
  },
  searchContainer: {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 50,
  },
  searchInput: {
    width: '280px',
    padding: '12px 16px 12px 44px',
    border: '2px solid #E0E0E0',
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    fontSize: '16px',
    pointerEvents: 'none',
  },
}

export default App
