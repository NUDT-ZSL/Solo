import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { User, Recipe, Version } from './types';
import { useApi } from './hooks/useApi';
import RecipeEditor from './components/RecipeEditor';
import RecipeList from './components/RecipeList';
import VersionGraph from './components/VersionGraph';
import RecipeCard from './components/RecipeCard';
import AuthPage from './pages/AuthPage';
import './styles.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getRecipes, createRecipe } = useApi();

  useEffect(() => {
    const savedUser = localStorage.getItem('recipeUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  const loadRecipes = async () => {
    if (!user) return;
    try {
      const data = await getRecipes(user.id);
      setRecipes(data as Recipe[]);
      if (data.length > 0 && !selectedRecipe) {
        setSelectedRecipe(data[0]);
      }
    } catch (err) {
      console.error('加载食谱失败', err);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('recipeUser', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedRecipe(null);
    setRecipes([]);
    localStorage.removeItem('recipeUser');
  };

  const handleCreateRecipe = async () => {
    if (!user) return;
    const name = prompt('请输入食谱名称:', '我的新食谱');
    if (!name) return;

    try {
      const newRecipe = await createRecipe(user.id, name, {
        name,
        ingredients: [{ name: '示例食材', amount: '100', unit: '克' }],
        steps: [{ order: 1, description: '第一步操作' }],
        notes: '',
      });
      setRecipes([...recipes, newRecipe as Recipe]);
      setSelectedRecipe(newRecipe as Recipe);
    } catch (err) {
      console.error('创建食谱失败', err);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSidebarOpen(false);
  };

  const handleRecipeUpdate = (updatedRecipe: Recipe) => {
    setRecipes(
      recipes.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r))
    );
    setSelectedRecipe(updatedRecipe);
  };

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <h1 className="app-title">🍳 食谱版本管理</h1>
            <div className="header-user">
              <span>欢迎, {user.username}</span>
              <button className="btn-logout" onClick={handleLogout}>
                退出
              </button>
            </div>
          </div>
        </header>

        <div className="app-body">
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <RecipeList
              recipes={recipes}
              selectedId={selectedRecipe?.id}
              onSelect={handleSelectRecipe}
              onCreate={handleCreateRecipe}
            />
          </aside>

          {sidebarOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <main className="main-content">
            {selectedRecipe ? (
              <div className="editor-container">
                <RecipeEditor
                  recipe={selectedRecipe}
                  user={user}
                  onUpdate={handleRecipeUpdate}
                />
                <VersionGraph recipe={selectedRecipe} />
                {selectedRecipe.versions && selectedRecipe.versions.length > 0 && (
                  <RecipeCard
                    version={
                      selectedRecipe.versions.find(
                        (v) => v.id === selectedRecipe.currentVersionId
                      ) || selectedRecipe.versions[selectedRecipe.versions.length - 1]
                    }
                  />
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>请从左侧选择或创建一个食谱</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          height: 60px;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }

        .menu-toggle {
          display: none;
          background: none;
          font-size: 24px;
          color: #8b4513;
          padding: 8px;
        }

        .app-title {
          font-size: 20px;
          color: #8b4513;
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-logout {
          background: #f5deb3;
          color: #8b4513;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 14px;
        }

        .app-body {
          flex: 1;
          display: flex;
          margin-top: 60px;
        }

        .sidebar {
          width: 280px;
          background: #fff;
          border-radius: 8px;
          margin: 16px;
          padding: 16px;
          overflow-y: auto;
          position: sticky;
          top: 76px;
          height: calc(100vh - 92px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .sidebar-overlay {
          display: none;
        }

        .main-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60vh;
          color: #8d6e63;
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .menu-toggle {
            display: block;
          }

          .sidebar {
            position: fixed;
            left: -300px;
            top: 60px;
            bottom: 0;
            width: 280px;
            height: auto;
            margin: 0;
            border-radius: 0;
            z-index: 99;
            transition: left 0.3s ease;
          }

          .sidebar.open {
            left: 0;
          }

          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.3);
            z-index: 98;
          }

          .main-content {
            width: 100%;
          }
        }
      `}</style>
    </Router>
  );
}

export default App;
