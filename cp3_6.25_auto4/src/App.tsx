import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { RecipeTimeLine } from './pages/RecipeTimeLine';
import { RecipeDetail } from './pages/RecipeDetail';
import type { Recipe, Notification } from './types';
import { RefreshCw } from 'lucide-react';

const API_BASE = '/api';

const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE}/recipes`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecipes(data);
      setLoadingError(null);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
      setLoadingError('加载菜谱失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = uuidv4();
    const newNotification: Notification = { ...notification, id };
    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addRecipe = useCallback(async (recipeData: Partial<Recipe>): Promise<Recipe | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const response = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newRecipe = await response.json();
      setRecipes(prev => [...prev, newRecipe]);

      addNotification({
        message: '菜谱创建成功！',
        type: 'success',
      });

      return newRecipe;
    } catch (err) {
      console.error('Failed to add recipe:', err);
      addNotification({
        message: '保存失败，请重试',
        type: 'error',
      });
      return null;
    }
  }, [addNotification]);

  const updateRecipe = useCallback(async (updatedRecipe: Recipe): Promise<Recipe | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const response = await fetch(`${API_BASE}/recipes/${updatedRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecipe),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const savedRecipe = await response.json();
      setRecipes(prev =>
        prev.map(r => r.id === savedRecipe.id ? savedRecipe : r)
      );

      return savedRecipe;
    } catch (err) {
      console.error('Failed to update recipe:', err);
      addNotification({
        message: '保存失败，请重试',
        type: 'error',
      });
      return null;
    }
  }, [addNotification]);

  const retryFailedRequest = useCallback(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#faf0e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #ffb74d',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ color: '#4e342e', fontSize: '16px' }}>加载中...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {notifications.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '90%',
            maxWidth: '500px',
          }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  background: notification.type === 'error' ? '#e53935' : '#43a047',
                  color: '#ffffff',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  animation: 'slideDown 0.3s ease',
                }}
              >
                <span style={{ fontSize: '14px' }}>{notification.message}</span>
                {notification.type === 'error' && (
                  <button
                    onClick={() => {
                      removeNotification(notification.id);
                      retryFailedRequest();
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.5)',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                      <RefreshCw size={12} />
                      重试
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>

        {loadingError && (
          <div style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#e53935',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>{loadingError}</span>
            <button
              onClick={retryFailedRequest}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.5)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={12} />
              重试
            </button>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <RecipeTimeLine
                recipes={recipes}
                onAddRecipe={addRecipe}
              />
            }
          />
          <Route
            path="/recipe/:id"
            element={
              <RecipeDetail
                recipes={recipes}
                onUpdateRecipe={updateRecipe}
                onAddNotification={addNotification}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
