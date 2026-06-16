import React, { useState, useMemo } from 'react';
import type { Recipe, RecipeCategory } from './types';
import { COLOR_SCHEMES, CATEGORY_LABELS } from './types';

interface RecipeListProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
}

function getAverageRating(recipe: Recipe): number {
  if (recipe.ratings.length === 0) return 0;
  const sum = recipe.ratings.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / recipe.ratings.length) * 10) / 10;
}

const StarIcon: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#FFD54F' : '#BDBDBD'}
    style={{ transition: 'fill 0.2s ease' }}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? '#E53935' : 'none'}
    stroke={filled ? '#E53935' : '#BDBDBD'}
    strokeWidth="2"
    style={{
      transition: 'all 0.2s ease',
      transform: filled ? 'scale(1.1)' : 'scale(1)',
    }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const RecipeCard: React.FC<{
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite: () => void;
}> = ({ recipe, onClick, onToggleFavorite }) => {
  const colors = COLOR_SCHEMES[recipe.colorScheme];
  const avgRating = getAverageRating(recipe);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div
      className="recipe-card"
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div
        className="recipe-thumbnail"
        style={{
          height: '140px',
          background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`,
          position: 'relative',
        }}
      >
        <div
          className="duration-badge"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#5D4037',
          }}
        >
          ⏱ {recipe.totalMinutes}分钟
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#424242',
              flex: 1,
            }}
          >
            {recipe.name}
          </h3>
          <button
            onClick={handleFavoriteClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeartIcon filled={recipe.isFavorite} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= Math.round(avgRating)} />
          ))}
          <span style={{ fontSize: '12px', color: '#757575', marginLeft: '4px' }}>
            {avgRating.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  onSelectRecipe,
  onToggleFavorite,
}) => {
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | 'all'>('all');
  const [animationKey, setAnimationKey] = useState(0);

  const favoriteRecipes = useMemo(() => {
    if (activeCategory === 'all') {
      return recipes.filter((r) => r.isFavorite);
    }
    return recipes.filter((r) => r.isFavorite && r.category === activeCategory);
  }, [recipes, activeCategory]);

  const filteredRecipes = useMemo(() => {
    if (activeCategory === 'all') return recipes.filter((r) => !r.isFavorite);
    return recipes.filter((r) => r.category === activeCategory && !r.isFavorite);
  }, [recipes, activeCategory]);

  const handleCategoryChange = (category: RecipeCategory | 'all') => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setAnimationKey((prev) => prev + 1);
  };

  const categories: Array<{ key: RecipeCategory | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'chinese', label: CATEGORY_LABELS.chinese },
    { key: 'western', label: CATEGORY_LABELS.western },
    { key: 'dessert', label: CATEGORY_LABELS.dessert },
  ];

  return (
    <div className="recipe-list" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        className="category-tabs"
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeCategory === cat.key ? '#FF7043' : '#FFFFFF',
              color: activeCategory === cat.key ? '#FFFFFF' : '#5D4037',
              boxShadow: activeCategory === cat.key ? '0 2px 8px rgba(255, 112, 67, 0.3)' : 'none',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {favoriteRecipes.length > 0 && (
        <div
          className="favorites-section"
          style={{
            background: '#FFEBEE',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#5D4037',
            }}
          >
            ❤️ 我的收藏
          </h2>
          <div
            className="recipe-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {favoriteRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onSelectRecipe(recipe)}
                onToggleFavorite={() => onToggleFavorite(recipe.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div key={animationKey} className="fade-transition">
        <div
          className="recipe-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onSelectRecipe(recipe)}
              onToggleFavorite={() => onToggleFavorite(recipe.id)}
            />
          ))}
        </div>
      </div>

      {filteredRecipes.length === 0 && favoriteRecipes.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#757575',
          }}
        >
          <p style={{ fontSize: '16px' }}>暂无该分类的食谱</p>
        </div>
      )}
    </div>
  );
};
