import { useState, useEffect, useMemo } from 'react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { recipes as initialRecipes } from './data/recipes';
import type { Recipe, UserPreferences } from './types';
import { useFilter } from './hooks/useFilter';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetail } from './components/RecipeDetail';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

function HomePage({
  recipes,
  preferences,
  onToggleFavorite,
  onOpenProfile
}: {
  recipes: Recipe[];
  preferences: UserPreferences;
  onToggleFavorite: (id: string) => void;
  onOpenProfile: () => void;
}) {
  const { state, filtered, setSearchQuery, toggleTag } = useFilter(recipes);

  const allCuisines = useMemo(
    () => [...new Set(recipes.map(r => r.cuisine))],
    [recipes]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return [...tagSet];
  }, [recipes]);

  const recommendedRecipes = useMemo(() => {
    const scored = recipes.map(recipe => {
      let score = 0;
      if (preferences.cuisines.includes(recipe.cuisine)) score += 3;
      recipe.tags.forEach(tag => {
        if (preferences.spiceLevel.some(s => tag.includes(s))) score += 2;
        if (preferences.ingredients.some(i => tag.includes(i))) score += 2;
      });
      score += recipe.rating * 0.5;
      return { recipe, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(s => s.recipe);
  }, [recipes, preferences]);

  const isFavorite = (id: string) => preferences.favorites.includes(id);

  return (
    <div className="page-wrapper">
      <section className="recommend-section">
        <h2 className="recommend-title">
          <span style={{ fontSize: '28px' }}>👨‍🍳</span>
          今日推荐
        </h2>
        <div className="recommend-grid">
          {recommendedRecipes.map((recipe, idx) => (
            <div
              key={recipe.id}
              style={{
                animation: `fadeInScale 0.6s ease-out ${idx * 0.1}s both`
              }}
            >
              <RecipeCard
                recipe={recipe}
                featured={true}
                onToggleFavorite={onToggleFavorite}
                isFavorite={isFavorite(recipe.id)}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="filter-bar">
        <div className="filter-section">
          <span className="filter-label">菜系：</span>
          {allCuisines.map(c => (
            <span
              key={c}
              className={`tag-chip ${state.selectedCuisine === c ? 'active' : ''}`}
              onClick={() => toggleTag(c)}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="filter-bar" style={{ marginTop: '-8px', borderBottom: 'none', paddingBottom: '0' }}>
        <div className="filter-section">
          <span className="filter-label">标签：</span>
          {allTags.slice(0, 10).map(t => (
            <span
              key={t}
              className={`tag-chip ${state.selectedTags.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-svg" viewBox="0 0 200 120">
            <path d="M10,90 Q50,30 100,60 T190,40" />
          </svg>
          <p className="empty-title">没有找到匹配的菜谱</p>
          <p className="empty-desc">试试换个关键词或清除筛选条件吧～</p>
        </div>
      ) : (
        <div className="waterfall-container">
          {filtered.map(recipe => (
            <div key={recipe.id} className="recipe-card-wrapper">
              <RecipeCard
                recipe={recipe}
                onToggleFavorite={onToggleFavorite}
                isFavorite={isFavorite(recipe.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPage({
  recipes,
  onUpdateRecipe
}: {
  recipes: Recipe[];
  onUpdateRecipe: (recipe: Recipe) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [id]);

  const recipe = recipes.find(r => r.id === id);

  return (
    <RecipeDetail
      recipe={recipe}
      loading={loading}
      onUpdateRecipe={onUpdateRecipe}
    />
  );
}

function AppContent({
  recipes,
  setRecipes,
  preferences,
  setPreferences,
  sidebarOpen,
  setSidebarOpen
}: {
  recipes: Recipe[];
  setRecipes: (r: Recipe[]) => void;
  preferences: UserPreferences;
  setPreferences: (p: UserPreferences) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}) {
  const [searchInput, setSearchInput] = useState('');

  const allCuisines = useMemo(
    () => [...new Set(recipes.map(r => r.cuisine))],
    [recipes]
  );

  const allSpiceLevels = ['不辣', '微辣', '中辣', '特辣'];
  const allIngredients = ['鸡肉', '猪肉', '牛肉', '鱼类', '海鲜', '豆制品', '蔬菜', '面食', '米饭', '蛋类'];

  const handleToggleFavorite = (id: string) => {
    const newFavs = preferences.favorites.includes(id)
      ? preferences.favorites.filter(f => f !== id)
      : [...preferences.favorites, id];
    setPreferences({ ...preferences, favorites: newFavs });
  };

  const handleUpdateRecipe = (updated: Recipe) => {
    setRecipes(recipes.map(r => r.id === updated.id ? updated : r));
  };

  const favoriteRecipes = recipes.filter(r => preferences.favorites.includes(r.id));

  return (
    <>
      <Navbar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        onProfileClick={() => setSidebarOpen(true)}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              recipes={recipes}
              preferences={preferences}
              onToggleFavorite={handleToggleFavorite}
              onOpenProfile={() => setSidebarOpen(true)}
            />
          }
        />
        <Route
          path="/recipe/:id"
          element={
            <DetailPage
              recipes={recipes}
              onUpdateRecipe={handleUpdateRecipe}
            />
          }
        />
      </Routes>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        favoriteRecipes={favoriteRecipes}
        allCuisines={allCuisines}
        allSpiceLevels={allSpiceLevels}
        allIngredients={allIngredients}
      />
    </>
  );
}

const DEFAULT_PREFERENCES: UserPreferences = {
  cuisines: ['川菜', '日料'],
  spiceLevel: ['微辣', '中辣'],
  ingredients: ['鸡肉', '牛肉'],
  favorites: []
};

const STORAGE_KEY_RECIPES = 'recipevault_recipes';
const STORAGE_KEY_PREFS = 'recipevault_preferences';

export function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECIPES);
      return stored ? JSON.parse(stored) : initialRecipes;
    } catch {
      return initialRecipes;
    }
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFS);
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(preferences));
  }, [preferences]);

  return (
    <MemoryRouter>
      <AppContent
        recipes={recipes}
        setRecipes={setRecipes}
        preferences={preferences}
        setPreferences={setPreferences}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    </MemoryRouter>
  );
}
