import React, { useState, useEffect, useCallback } from 'react';
import SearchCard from './components/SearchCard';
import RecipeCard from './components/RecipeCard';
import Drawer from './components/Drawer';
import TimerView from './components/TimerView';

export interface Recipe {
  id: string;
  name: string;
  cuisine: 'chinese' | 'western' | 'japanese' | 'other';
  ingredients: { name: string; amount: string }[];
  steps: { description: string; duration: number }[];
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export interface Favorite {
  id: string;
  recipeId: string;
  recipeName: string;
  cuisine: string;
  difficulty: string;
  createdAt: string;
}

export interface HighlightedIngredients {
  [recipeId: string]: string[];
}

const theme = {
  primary: '#ff7043',
  primaryDark: '#e64a19',
  secondary: '#ffe0b2',
  background: '#fafafa',
  cardBackground: 'linear-gradient(135deg, #fff8e1 0%, #fce4ec 100%)',
  success: '#66bb6a',
  warning: '#ffb74d',
  danger: '#e53935',
  textPrimary: '#333333',
  textSecondary: '#666666',
  border: '#e0e0e0',
  tagColors: ['#e0f2f1', '#e8eaf6', '#fce4ec', '#fff3e0'],
  breakpoints: {
    mobile: '480px',
    tablet: '640px',
    desktop: '960px'
  }
};

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [highlightedIngredients, setHighlightedIngredients] = useState<HighlightedIngredients>({});
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');

  const loadFavorites = useCallback(async () => {
    try {
      const response = await fetch('/api/favorites');
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleSearch = async (input: string) => {
    setLoading(true);
    setUserInput(input);
    
    try {
      const ingredients = input.split(/[,，、\s]+/).filter(i => i.trim());
      const url = ingredients.length > 0 
        ? `/api/recipes?ingredients=${encodeURIComponent(ingredients.join(','))}`
        : `/api/recipes?q=${encodeURIComponent(input)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setRecipes(data.slice(0, 9));
      setHighlightedIngredients({});
    } catch (error) {
      console.error('Failed to search recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRecipes([]);
    setUserInput('');
  };

  const handleToggleHighlight = (recipeId: string, ingredientName: string) => {
    setHighlightedIngredients(prev => {
      const current = prev[recipeId] || [];
      const exists = current.includes(ingredientName);
      return {
        ...prev,
        [recipeId]: exists
          ? current.filter(i => i !== ingredientName)
          : [...current, ingredientName]
      };
    });
  };

  const handleFavorite = async (recipe: Recipe) => {
    try {
      const isFavorited = favorites.some(f => f.recipeId === recipe.id);
      
      if (isFavorited) {
        const favorite = favorites.find(f => f.recipeId === recipe.id);
        if (favorite) {
          await fetch(`/api/favorites/${favorite.id}`, { method: 'DELETE' });
        }
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: recipe.id,
            recipeName: recipe.name,
            cuisine: recipe.cuisine,
            difficulty: recipe.difficulty
          })
        });
      }
      loadFavorites();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
      loadFavorites();
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleStartCooking = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowTimer(true);
  };

  const handleRefreshRecipe = async (recipeId: string) => {
    try {
      const currentIndex = recipes.findIndex(r => r.id === recipeId);
      const ingredients = userInput.split(/[,，、\s]+/).filter(i => i.trim());
      const url = ingredients.length > 0 
        ? `/api/recipes?ingredients=${encodeURIComponent(ingredients.join(','))}`
        : `/api/recipes?q=${encodeURIComponent(userInput)}`;
      
      const response = await fetch(url);
      const data: Recipe[] = await response.json();
      
      const unusedRecipes = data.filter(r => !recipes.some(existing => existing.id === r.id));
      
      if (unusedRecipes.length > 0 && currentIndex !== -1) {
        const newRecipe = unusedRecipes[Math.floor(Math.random() * unusedRecipes.length)];
        const newRecipes = [...recipes];
        newRecipes[currentIndex] = newRecipe;
        setRecipes(newRecipes);
      }
    } catch (error) {
      console.error('Failed to refresh recipe:', error);
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px 80px',
    minHeight: '100vh',
    backgroundColor: theme.background
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: 700,
    color: theme.primary,
    marginBottom: '8px'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: theme.textSecondary
  };

  const resultsContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    marginTop: '32px',
    '@media (max-width: 960px)': {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    '@media (max-width: 640px)': {
      gridTemplateColumns: '1fr'
    }
  };

  const navBarStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '48px',
    backgroundColor: '#fff',
    borderTop: `1px solid ${theme.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 100,
    '@media (max-width: 480px)': {
      padding: '0 12px'
    }
  };

  const navButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: theme.textPrimary,
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'background-color 200ms ease'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 200,
    opacity: drawerOpen ? 1 : 0,
    visibility: drawerOpen ? 'visible' : 'hidden',
    transition: 'opacity 200ms ease'
  };

  const loadingStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px',
    fontSize: '16px',
    color: theme.textSecondary
  };

  const noResultsStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px',
    fontSize: '16px',
    color: theme.textSecondary,
    gridColumn: '1 / -1'
  };

  return (
    <>
      {showTimer && selectedRecipe && (
        <TimerView
          recipe={selectedRecipe}
          onClose={() => {
            setShowTimer(false);
            setSelectedRecipe(null);
          }}
        />
      )}

      <div style={overlayStyle} onClick={() => setDrawerOpen(false)} />

      <Drawer
        isOpen={drawerOpen}
        favorites={favorites}
        onClose={() => setDrawerOpen(false)}
        onRemove={handleRemoveFavorite}
        onRecipeClick={(recipeId) => {
          fetch(`/api/recipes/${recipeId}`)
            .then(res => res.json())
            .then(recipe => {
              setSelectedRecipe(recipe);
              setShowTimer(true);
              setDrawerOpen(false);
            });
        }}
        theme={theme}
      />

      <div style={containerStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>🍳 智能菜谱适配器</h1>
          <p style={subtitleStyle}>输入食材或描述，为您匹配最适合的菜谱</p>
        </header>

        <SearchCard
          onSearch={handleSearch}
          onClear={handleClear}
          theme={theme}
          loading={loading}
        />

        {loading && (
          <div style={loadingStyle}>正在为您匹配最佳菜谱...</div>
        )}

        {!loading && recipes.length > 0 && (
          <div style={resultsContainerStyle}>
            {recipes.map((recipe, index) => (
              <div
                key={recipe.id}
                style={{
                  opacity: 0,
                  animation: `fadeInUp 400ms ease-out ${index * 100}ms forwards`
                }}
              >
                <RecipeCard
                  recipe={recipe}
                  theme={theme}
                  isFavorited={favorites.some(f => f.recipeId === recipe.id)}
                  highlightedIngredients={highlightedIngredients[recipe.id] || []}
                  onToggleHighlight={handleToggleHighlight}
                  onFavorite={handleFavorite}
                  onStartCooking={handleStartCooking}
                  onRefresh={handleRefreshRecipe}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && recipes.length === 0 && userInput && (
          <div style={noResultsStyle}>
            没有找到匹配的菜谱，请尝试其他关键词
          </div>
        )}
      </div>

      <nav style={navBarStyle}>
        <button
          style={navButtonStyle}
          onClick={() => setDrawerOpen(true)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span>⭐</span>
          <span>我的收藏</span>
          {favorites.length > 0 && (
            <span
              style={{
                backgroundColor: theme.primary,
                color: '#fff',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '20px',
                textAlign: 'center'
              }}
            >
              {favorites.length}
            </span>
          )}
        </button>

        <a
          href="#"
          style={{
            ...navButtonStyle,
            textDecoration: 'none'
          }}
          onClick={(e) => {
            e.preventDefault();
            alert('智能菜谱适配器 v1.0\n\n根据食材智能匹配最佳菜谱');
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span>关于</span>
        </a>
      </nav>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 960px) {
          div[style*="gridTemplateColumns: repeat(3, 1fr)"] {
            gridTemplateColumns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 640px) {
          div[style*="gridTemplateColumns: repeat(3, 1fr)"] {
            gridTemplateColumns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          nav[style*="position: fixed"] {
            padding: 0 12px !important;
          }
        }
      `}</style>
    </>
  );
};

export default App;
