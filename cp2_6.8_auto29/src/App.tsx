import React, { useState, useEffect, useMemo } from 'react';
import RecipeCard from './components/RecipeCard';
import RecipeForm from './components/RecipeForm';
import RecommendationList from './components/RecommendationList';

interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  steps: string;
  ratings: number[];
  averageRating: number;
}

interface Recommendation {
  recipe: Recipe;
  similarity: number;
  sharedIngredients: string[];
}

type TabType = 'browse' | 'add' | 'recommend';

const EmptyIllustration: React.FC = () => (
  <div className="empty-state">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="#FFF8DC" />
      <path
        d="M70 90 Q100 60 130 90 Q130 130 100 140 Q70 130 70 90 Z"
        fill="#FF8C00"
        opacity="0.3"
      />
      <circle cx="85" cy="95" r="5" fill="#333" />
      <circle cx="115" cy="95" r="5" fill="#333" />
      <path
        d="M85 115 Q100 125 115 115"
        stroke="#333"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M60 70 L55 55"
        stroke="#FF8C00"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M140 70 L145 55"
        stroke="#FF8C00"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="55" cy="50" r="6" fill="#FF8C00" opacity="0.6" />
      <circle cx="145" cy="50" r="6" fill="#FF8C00" opacity="0.6" />
    </svg>
    <p>暂无匹配食谱</p>
    <p style={{ fontSize: '0.9rem', marginTop: '8px', color: '#aaa' }}>
      试试其他关键词吧
    </p>
  </div>
);

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error('获取食谱失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async (data: {
    title: string;
    imageUrl: string;
    description: string;
    ingredients: string[];
    steps: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchRecipes();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      const res = await fetch(`/api/recipes/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        setRecipes((prev) =>
          prev.map((r) => {
            if (r.id === id) {
              return {
                ...r,
                ratings: [...r.ratings, rating],
                averageRating:
                  [...r.ratings, rating].reduce((a, b) => a + b, 0) /
                  (r.ratings.length + 1),
              };
            }
            return r;
          })
        );
      }
    } catch (err) {
      console.error('评分失败:', err);
    }
  };

  const handleSelectRecipe = async (id: string) => {
    setSelectedRecipeId(id);
    try {
      const res = await fetch(`/api/recommendations/${id}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error('获取推荐失败:', err);
    }
  };

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const query = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  if (loading) {
    return (
      <div className="app" style={{ textAlign: 'center', padding: '80px' }}>
        <p style={{ fontSize: '1.2rem', color: '#888' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍳 美食食谱分享</h1>
        <p>分享您的拿手好菜，发现更多美味灵感</p>
      </header>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          📖 浏览食谱
        </button>
        <button
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ 上传食谱
        </button>
        <button
          className={`tab-btn ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          🎯 智能推荐
        </button>
      </div>

      {activeTab === 'browse' && (
        <>
          <input
            type="text"
            className="search-bar"
            placeholder="🔍 搜索食谱名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredRecipes.length === 0 ? (
            <EmptyIllustration />
          ) : (
            <div className="recipe-grid">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onRate={handleRate}
                  onSelect={handleSelectRecipe}
                  selected={recipe.id === selectedRecipeId}
                  isSelectable={true}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'add' && <RecipeForm onSubmit={handleAddRecipe} />}

      {activeTab === 'recommend' && (
        <RecommendationList
          recommendations={recommendations}
          selectedRecipeId={selectedRecipeId}
        />
      )}
    </div>
  );
};

export default App;
