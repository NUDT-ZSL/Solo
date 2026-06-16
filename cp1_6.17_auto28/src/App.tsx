import React, { useState, useCallback } from 'react';
import type { Recipe } from './types';
import { mockRecipes } from './mockData';
import { RecipeList } from './RecipeList';
import { RecipeDetail } from './RecipeDetail';

type View = 'list' | 'detail';

export const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
  }, []);

  const handleToggleFavorite = useCallback((recipeId: string) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  }, []);

  const handleRateRecipe = useCallback((recipeId: string, score: number) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const existingRating = r.ratings.find((rating) => rating.userId === 'current-user');
        if (existingRating) {
          return {
            ...r,
            ratings: r.ratings.map((rating) =>
              rating.userId === 'current-user' ? { ...rating, score } : rating
            ),
          };
        }
        return {
          ...r,
          ratings: [...r.ratings, { userId: 'current-user', score }],
        };
      })
    );
  }, []);

  return (
    <div className="app" style={{ minHeight: '100vh', background: '#FFF8E1' }}>
      <nav
        style={{
          height: '56px',
          background: '#5D4037',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={handleBackToList}
        >
          🍳 食间厨房
        </h1>
      </nav>

      <main>
        {currentView === 'list' && (
          <RecipeList
            recipes={recipes}
            onSelectRecipe={handleSelectRecipe}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {currentView === 'detail' && selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onBack={handleBackToList}
            onRateRecipe={handleRateRecipe}
          />
        )}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px',
          color: '#757575',
          fontSize: '14px',
        }}
      >
        <p>用心烹饪，享受美食时光</p>
      </footer>
    </div>
  );
};
