import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe, UserPreferences } from '../types';
import { DraggableTags } from './DraggableTags';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  favoriteRecipes: Recipe[];
  allCuisines: string[];
  allSpiceLevels: string[];
  allIngredients: string[];
}

export function Sidebar({
  open,
  onClose,
  preferences,
  onPreferencesChange,
  favoriteRecipes,
  allCuisines,
  allSpiceLevels,
  allIngredients
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'favorites' | 'preferences'>('preferences');

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">个人中心</h2>
          <button className="sidebar-close" onClick={onClose} title="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'preferences' ? '600' : '500',
              color: activeTab === 'preferences' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'preferences' ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
              marginBottom: '-1px'
            }}
          >
            口味偏好
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'favorites' ? '600' : '500',
              color: activeTab === 'favorites' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'favorites' ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'none',
              marginBottom: '-1px'
            }}
          >
            我的收藏 ({favoriteRecipes.length})
          </button>
        </div>

        <div className="sidebar-body">
          {activeTab === 'preferences' && (
            <>
              <div className="sidebar-section">
                <h3 className="sidebar-section-title">
                  <span>🌶️</span> 辣度偏好
                </h3>
                <DraggableTags
                  allTags={allSpiceLevels}
                  selectedTags={preferences.spiceLevel}
                  onChange={(tags) =>
                    onPreferencesChange({ ...preferences, spiceLevel: tags })
                  }
                />
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-section-title">
                  <span>🍽️</span> 菜系偏好
                </h3>
                <DraggableTags
                  allTags={allCuisines}
                  selectedTags={preferences.cuisines}
                  onChange={(tags) =>
                    onPreferencesChange({ ...preferences, cuisines: tags })
                  }
                />
              </div>

              <div className="sidebar-section">
                <h3 className="sidebar-section-title">
                  <span>🥗</span> 食材偏好
                </h3>
                <DraggableTags
                  allTags={allIngredients}
                  selectedTags={preferences.ingredients}
                  onChange={(tags) =>
                    onPreferencesChange({ ...preferences, ingredients: tags })
                  }
                />
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                💡 提示：拖动标签到上方已选区来设置偏好，系统会根据你的偏好每天推荐合适的菜谱～
              </p>
            </>
          )}

          {activeTab === 'favorites' && (
            <div className="favorites-list">
              {favoriteRecipes.length === 0 ? (
                <div className="fav-empty">
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <p>还没有收藏的菜谱</p>
                  <p style={{ marginTop: '4px' }}>去菜谱墙逛逛吧～</p>
                </div>
              ) : (
                favoriteRecipes.map(recipe => (
                  <Link
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    className="favorite-item"
                    onClick={onClose}
                  >
                    <div
                      className="favorite-thumb image-placeholder"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}
                    >
                      {getFoodEmoji(recipe.cuisine)}
                    </div>
                    <div className="favorite-info">
                      <div className="favorite-name">{recipe.name}</div>
                      <div className="favorite-meta">
                        {recipe.cuisine} · {recipe.prepTime}分钟
                      </div>
                    </div>
                    <span style={{ fontSize: '18px' }}>❤️</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function getFoodEmoji(cuisine: string): string {
  const map: Record<string, string> = {
    '川菜': '🌶️',
    '粤菜': '🍗',
    '湘菜': '🐟',
    '鲁菜': '🍖',
    '日料': '🍣',
    '西餐': '🍝'
  };
  return map[cuisine] || '🍲';
}
