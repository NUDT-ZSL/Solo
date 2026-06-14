import React, { useState, useCallback } from 'react';
import RecipeSolver from './RecipeSolver';
import RecipeDetail from './RecipeDetail';
import type { Toast } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'detail'>('home');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleRecipeClick = (id: number) => {
    setSelectedRecipeId(id);
    setCurrentPage('detail');
  };

  const handleBack = () => {
    setCurrentPage('home');
    setSelectedRecipeId(null);
  };

  return (
    <div className="app-container">
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {currentPage === 'home' && (
        <RecipeSolver onRecipeClick={handleRecipeClick} showToast={showToast} />
      )}

      {currentPage === 'detail' && selectedRecipeId !== null && (
        <RecipeDetail
          recipeId={selectedRecipeId}
          onBack={handleBack}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default App;
