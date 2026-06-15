import React from 'react';

interface Theme {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  cardBackground: string;
  success: string;
  warning: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  tagColors: string[];
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

interface Recipe {
  id: string;
  name: string;
  cuisine: 'chinese' | 'western' | 'japanese' | 'other';
  ingredients: { name: string; amount: string }[];
  steps: { description: string; duration: number }[];
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  theme: Theme;
  isFavorited: boolean;
  highlightedIngredients: string[];
  onToggleHighlight: (recipeId: string, ingredientName: string) => void;
  onFavorite: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onRefresh: (recipeId: string) => void;
}

const cuisineEmoji: Record<string, string> = {
  chinese: '🍜',
  western: '🍝',
  japanese: '🍣',
  other: '🍲'
};

const difficultyText: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

const difficultyColor: Record<string, string> = {
  easy: '#66bb6a',
  medium: '#ffa726',
  hard: '#ef5350'
};

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  theme,
  isFavorited,
  highlightedIngredients,
  onToggleHighlight,
  onFavorite,
  onStartCooking,
  onRefresh
}) => {
  const getRandomColor = (index: number) => {
    return theme.tagColors[index % theme.tagColors.length];
  };

  const cardStyle: React.CSSProperties = {
    width: '280px',
    height: '340px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #fff8e1 0%, #fce4ec 100%)',
    padding: '16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    position: 'relative',
    margin: '0 auto',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  };

  const cuisineBadgeStyle: React.CSSProperties = {
    fontSize: '32px'
  };

  const favoriteButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    transition: 'transform 150ms ease, background-color 200ms ease'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: theme.textPrimary,
    marginBottom: '4px'
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '12px'
  };

  const metaItemStyle: React.CSSProperties = {
    fontSize: '12px',
    color: theme.textSecondary
  };

  const difficultyBadgeStyle: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: difficultyColor[recipe.difficulty]
  };

  const tagCloudStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    flex: 1,
    overflow: 'hidden'
  };

  const tagStyle = (color: string, isHighlighted: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: '8px',
    backgroundColor: isHighlighted ? '#e8f5e9' : color,
    fontSize: '12px',
    color: theme.textPrimary,
    cursor: 'pointer',
    border: isHighlighted ? '2px solid #66bb6a' : '2px solid transparent',
    transition: 'transform 150ms ease, box-shadow 150ms ease, background-color 200ms ease, border-color 200ms ease',
    userSelect: 'none',
    fontWeight: isHighlighted ? 600 : 400
  });

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    height: '36px',
    borderRadius: '12px',
    backgroundColor: theme.primary,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 200ms ease, transform 150ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    color: theme.textPrimary,
    fontSize: '16px',
    border: `1px solid ${theme.border}`,
    cursor: 'pointer',
    transition: 'background-color 200ms ease, transform 150ms ease, border-color 200ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
      }}
    >
      <div>
        <div style={headerStyle}>
          <span style={cuisineBadgeStyle}>{cuisineEmoji[recipe.cuisine]}</span>
          <button
            style={favoriteButtonStyle}
            onClick={() => onFavorite(recipe)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={isFavorited ? '取消收藏' : '收藏菜谱'}
          >
            {isFavorited ? '❤️' : '🤍'}
          </button>
        </div>

        <h3 style={titleStyle}>{recipe.name}</h3>

        <div style={metaStyle}>
          <span style={metaItemStyle}>⏱️ {recipe.totalTime}分钟</span>
          <span style={difficultyBadgeStyle}>{difficultyText[recipe.difficulty]}</span>
        </div>

        <div style={tagCloudStyle}>
          {recipe.ingredients.slice(0, 8).map((ingredient, index) => (
            <span
              key={ingredient.name}
              style={tagStyle(
                getRandomColor(index),
                highlightedIngredients.includes(ingredient.name)
              )}
              onClick={() => onToggleHighlight(recipe.id, ingredient.name)}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={`${ingredient.name} ${ingredient.amount}`}
            >
              {ingredient.name}
            </span>
          ))}
          {recipe.ingredients.length > 8 && (
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                fontSize: '12px',
                color: theme.textSecondary
              }}
            >
              +{recipe.ingredients.length - 8}
            </span>
          )}
        </div>
      </div>

      <div style={buttonContainerStyle}>
        <button
          style={primaryButtonStyle}
          onClick={() => onStartCooking(recipe)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryDark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.primary;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span>👨‍🍳</span>
          去烹饪
        </button>

        <button
          style={secondaryButtonStyle}
          onClick={() => onRefresh(recipe.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
            e.currentTarget.style.borderColor = theme.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = theme.border;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="换一个"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
