import React, { useState, useEffect } from 'react';
import { PresetIngredient, RecipeTemplate, Recipe } from './lib/types';
import RecipeEditor from './components/RecipeEditor';
import RecipeCard from './components/RecipeCard';
import './styles/global.css';

type ViewMode = 'editor' | 'card';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [presetIngredients, setPresetIngredients] = useState<PresetIngredient[]>([]);
  const [templates, setTemplates] = useState<RecipeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const startTime = performance.now();
        
        const [ingredientsRes, templatesRes] = await Promise.all([
          fetch('/api/ingredients'),
          fetch('/api/templates'),
        ]);

        const ingredientsData = await ingredientsRes.json();
        const templatesData = await templatesRes.json();

        const endTime = performance.now();
        console.log(`API加载耗时: ${(endTime - startTime).toFixed(2)}ms`);

        if (ingredientsData.success) {
          setPresetIngredients(ingredientsData.data);
        }
        if (templatesData.success) {
          setTemplates(templatesData.data);
        }
      } catch (err) {
        console.error('加载初始数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleGenerateCard = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setViewMode('card');
  };

  const handleBackToEditor = () => {
    setViewMode('editor');
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#FFF8DC' }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🍰</div>
          <p className="text-lg" style={{ color: '#8B4513' }}>
            正在加载烘焙配方编辑器...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {viewMode === 'editor' && (
        <RecipeEditor
          presetIngredients={presetIngredients}
          templates={templates}
          onGenerateCard={handleGenerateCard}
        />
      )}
      {viewMode === 'card' && currentRecipe && (
        <RecipeCard recipe={currentRecipe} onBack={handleBackToEditor} />
      )}
    </div>
  );
};

export default App;
