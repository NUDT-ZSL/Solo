import React, { useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import RecipeCard from './components/RecipeCard';
import ActivityBoard from './components/ActivityBoard';
import RecipeForm from './components/RecipeForm';
import RecipeDetailModal from './components/RecipeDetailModal';
import CreateActivityModal from './components/CreateActivityModal';
import InviteLink from './components/InviteLink';
import Notification from './components/Notification';
import { Recipe, Activity as ActivityType } from './types';
import { recipeAPI, activityAPI } from './services/api';
import { getSocket } from './services/socket';
import './App.css';

const App: React.FC = () => {
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [createdActivity, setCreatedActivity] = useState<ActivityType | null>(null);
  const [currentActivity, setCurrentActivity] = useState<ActivityType | null>(null);
  const [notification, setNotification] = useState({ visible: false, message: '' });
  const [leftWidth, setLeftWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newRecipeId, setNewRecipeId] = useState<string | null>(null);

  const currentUser = '美食爱好者';

  const loadRecipes = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const data = await recipeAPI.getAll(pageNum, 12);
      if (reset) {
        setRecipes(data);
      } else {
        setRecipes((prev) => [...prev, ...data]);
      }
      if (data.length < 12) {
        setHasMore(false);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  React.useEffect(() => {
    loadRecipes(1, true);

    const socket = getSocket();
    socket.on('recipe-created', (recipe: Recipe) => {
      setRecipes((prev) => [recipe, ...prev]);
      setNewRecipeId(recipe.id);
      setTimeout(() => setNewRecipeId(null), 1000);
    });

    return () => {
      socket.off('recipe-created');
    };
  }, [loadRecipes]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
      if (bottom && hasMore && !loading) {
        loadRecipes(page + 1);
      }
    },
    [hasMore, loading, page, loadRecipes]
  );

  const handleCreateRecipe = async (data: {
    title: string;
    description: string;
    ingredients: string[];
    steps: string[];
    difficulty: number;
  }) => {
    try {
      const recipe = await recipeAPI.create({
        ...data,
        author: currentUser
      });
      setRecipes((prev) => [recipe, ...prev]);
      setNewRecipeId(recipe.id);
      setTimeout(() => setNewRecipeId(null), 1000);
      setShowRecipeForm(false);
      showNotification('菜谱发布成功！');
    } catch (error) {
      console.error('Failed to create recipe:', error);
      alert('发布失败，请重试');
    }
  };

  const handleCreateActivity = async (data: {
    recipeId: string;
    name: string;
    host: string;
    maxParticipants: number;
    startTime?: number;
  }) => {
    try {
      const activity = await activityAPI.create(data);
      setCreatedActivity(activity);
      setCurrentActivity(activity);
      setShowCreateActivity(false);
      setShowInviteLink(true);
      showNotification('活动创建成功！');
    } catch (error) {
      console.error('Failed to create activity:', error);
      alert('创建活动失败，请重试');
    }
  };

  const showNotification = (message: string) => {
    setNotification({ visible: true, message });
  };

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const container = document.getElementById('main-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth >= 25 && newWidth <= 70) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const navItems = [
    { name: '菜谱广场', path: '/' },
    { name: '热门活动', path: '/activities' },
    { name: '我的收藏', path: '/favorites' }
  ];

  const getActiveIndex = () => {
    for (let i = 0; i < navItems.length; i++) {
      if (location.pathname === navItems[i].path) {
        return i;
      }
    }
    return 0;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">🍳</span>
            <h1 className="app-title">社区厨房</h1>
          </div>

          <nav className="desktop-nav">
            {navItems.map((item, index) => (
              <a
                key={item.path}
                href={item.path}
                className={`nav-item ${
                  location.pathname === item.path ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                {item.name}
                {location.pathname === item.path && (
                  <span className="nav-underline" />
                )}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="create-recipe-btn"
              onClick={() => setShowRecipeForm(true)}
            >
              + 发布菜谱
            </button>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`mobile-nav-item ${
                  location.pathname === item.path ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                }}
              >
                {item.name}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="main-content" id="main-container">
        <div
          className="left-panel"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="panel-header">
            <h2>🍽️ 菜谱列表</h2>
            <span className="recipe-count">共 {recipes.length} 道菜谱</span>
          </div>

          <div
            className="recipe-list-container"
            onScroll={handleScroll}
          >
            <div className="recipe-grid">
              {recipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={index}
                  isNew={recipe.id === newRecipeId}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>

            {loading && (
              <div className="loading-more">
                <div className="spinner"></div>
                <span>加载中...</span>
              </div>
            )}

            {!hasMore && recipes.length > 0 && (
              <div className="no-more">—— 已加载全部菜谱 ——</div>
            )}

            {!loading && recipes.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>还没有菜谱，快来发布第一道菜谱吧！</p>
              </div>
            )}
          </div>
        </div>

        <div
          className={`resizer ${isResizing ? 'active' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className="resizer-handle" />
        </div>

        <div
          className="right-panel"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="panel-header">
            <h2>👨‍🍳 活动协作</h2>
          </div>

          <div className="activity-panel-content">
            {currentActivity ? (
              <ActivityBoard
                activityId={currentActivity.id}
                currentUser={currentUser}
                onNotification={showNotification}
              />
            ) : (
              <div className="empty-activity">
                <div className="empty-activity-icon">🎉</div>
                <h3>还没有进行中的活动</h3>
                <p>选择一道菜谱创建烹饪活动，邀请朋友一起协作吧！</p>
                <button
                  className="start-activity-btn"
                  onClick={() => {
                    if (recipes.length > 0) {
                      setSelectedRecipe(recipes[0]);
                    } else {
                      showNotification('请先发布一道菜谱');
                    }
                  }}
                >
                  创建第一个活动
                </button>

                {recipes.length > 0 && (
                  <div className="quick-select">
                    <p className="quick-select-title">快速选择菜谱：</p>
                    <div className="quick-recipe-list">
                      {recipes.slice(0, 4).map((recipe) => (
                        <div
                          key={recipe.id}
                          className="quick-recipe-item"
                          onClick={() => setSelectedRecipe(recipe)}
                        >
                          <span className="quick-recipe-icon">🍳</span>
                          <span className="quick-recipe-name">
                            {recipe.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {showRecipeForm && (
        <RecipeForm
          onSubmit={handleCreateRecipe}
          onCancel={() => setShowRecipeForm(false)}
          authorName={currentUser}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onCreateActivity={(recipe) => {
            setShowCreateActivity(true);
          }}
        />
      )}

      {showCreateActivity && selectedRecipe && (
        <CreateActivityModal
          recipeId={selectedRecipe.id}
          recipeTitle={selectedRecipe.title}
          currentUser={currentUser}
          onSubmit={handleCreateActivity}
          onCancel={() => setShowCreateActivity(false)}
        />
      )}

      {showInviteLink && createdActivity && (
        <InviteLink
          activityId={createdActivity.id}
          activityName={createdActivity.name}
          onClose={() => setShowInviteLink(false)}
        />
      )}

      <Notification
        message={notification.message}
        visible={notification.visible}
        onClose={() => setNotification({ visible: false, message: '' })}
      />

      <Routes>
        <Route path="/" element={null} />
        <Route path="/activities" element={null} />
        <Route path="/favorites" element={null} />
      </Routes>
    </div>
  );
};

export default App;
