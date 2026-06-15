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

interface Favorite {
  id: string;
  recipeId: string;
  recipeName: string;
  cuisine: string;
  difficulty: string;
  createdAt: string;
}

interface DrawerProps {
  isOpen: boolean;
  favorites: Favorite[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onRecipeClick: (recipeId: string) => void;
  theme: Theme;
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

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  favorites,
  onClose,
  onRemove,
  onRecipeClick,
  theme
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    maxWidth: '100%',
    height: '100vh',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
    zIndex: 300,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 300ms ease-out',
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 480px)': {
      width: '100%'
    }
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px',
    borderBottom: `1px solid ${theme.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: theme.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background-color 200ms ease, transform 150ms ease'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px'
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px 24px',
    color: theme.textSecondary,
    fontSize: '14px'
  };

  const itemStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    cursor: 'pointer'
  };

  const itemInfoStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0
  };

  const itemTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: theme.textPrimary,
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const itemMetaStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '12px',
    color: theme.textSecondary
  };

  const difficultyBadgeStyle = (difficulty: string): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: difficultyColor[difficulty] || theme.textSecondary
  });

  const removeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background-color 200ms ease, transform 150ms ease',
    color: theme.textSecondary
  };

  return (
    <div style={drawerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          <span>⭐</span>
          我的收藏
          {favorites.length > 0 && (
            <span
              style={{
                backgroundColor: theme.primary,
                color: '#fff',
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 500
              }}
            >
              {favorites.length}
            </span>
          )}
        </h2>
        <button
          style={closeButtonStyle}
          onClick={onClose}
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
        >
          ✕
        </button>
      </div>

      <div style={contentStyle}>
        {favorites.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p>还没有收藏的菜谱</p>
            <p style={{ marginTop: '8px', fontSize: '13px' }}>
              点击菜谱卡片上的 ❤️ 来收藏吧
            </p>
          </div>
        ) : (
          favorites.map((favorite) => (
            <div
              key={favorite.id}
              style={itemStyle}
              onClick={() => onRecipeClick(favorite.recipeId)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={itemInfoStyle}>
                <div style={itemTitleStyle}>
                  <span>{cuisineEmoji[favorite.cuisine] || '🍲'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {favorite.recipeName}
                  </span>
                </div>
                <div style={itemMetaStyle}>
                  <span style={difficultyBadgeStyle(favorite.difficulty)}>
                    {difficultyText[favorite.difficulty] || favorite.difficulty}
                  </span>
                  <span>📅 {formatDate(favorite.createdAt)}</span>
                </div>
              </div>

              <button
                style={removeButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(favorite.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(229, 57, 53, 0.1)';
                  e.currentTarget.style.color = theme.danger;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.textSecondary;
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.style.transform = 'scale(0.9)';
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="移除收藏"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (max-width: 480px) {
          div[style*="width: 400px"] {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Drawer;
