import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import { useFavorites } from './hooks/useFavorites';
import type { Recipe } from './types/Recipe';

interface FavoritesContextType {
  favorites: number[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => boolean;
  getAdjustedLikes: (id: number, baseLikes: number) => number;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const useFavoritesContext = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavoritesContext must be used within FavoritesProvider');
  return ctx;
};

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const useSearchContext = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearchContext must be used within SearchProvider');
  return ctx;
};

interface RecipesContextType {
  recipes: Recipe[];
  loading: boolean;
}

const RecipesContext = createContext<RecipesContextType | null>(null);

export const useRecipesContext = () => {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipesContext must be used within RecipesProvider');
  return ctx;
};

import { mockRecipes } from './data/mockRecipes';

function AnimatedRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut'>('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div
      style={{
        opacity: transitionStage === 'fadeIn' ? 1 : 0,
        transform: transitionStage === 'fadeIn' ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<RecipeList />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const favoritesState = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <FavoritesContext.Provider value={favoritesState}>
      <SearchContext.Provider value={{ searchQuery, setSearchQuery, activeTag, setActiveTag }}>
        <RecipesContext.Provider value={{ recipes: mockRecipes, loading }}>
          <Router>
            <AnimatedRoutes />
          </Router>
        </RecipesContext.Provider>
      </SearchContext.Provider>
    </FavoritesContext.Provider>
  );
}
