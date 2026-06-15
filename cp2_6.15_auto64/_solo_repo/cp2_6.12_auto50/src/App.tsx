import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';

const IngredientPanel = React.lazy(() => import('./components/IngredientPanel'));
const RecipeCard = React.lazy(() => import('./components/RecipeCard'));
const CookingLog = React.lazy(() => import('./components/CookingLog'));

interface Ingredient {
  id: string;
  name: string;
  category: string;
}

interface Recipe {
  id: string;
  name: string;
  matchScore: number;
  description: string;
  requiredIngredients: string;
  steps: string;
  ingredients: string;
}

interface CookingLogType {
  id: string;
  recipeId: string;
  recipeName: string;
  matchScore: number;
  notes?: string;
  rating: number;
  createdAt: string;
}

const LoadingFallback: React.FC = () => (
  <div className="loading-container">
    <div className="spinner" />
    <div className="loading-text">加载中...</div>
  </div>
);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const SmallStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`star small ${n <= rating ? 'filled' : ''}`}>
        ★
      </span>
    ))}
  </div>
);

const App: React.FC = () => {
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingLogs, setCookingLogs] = useState<CookingLogType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<CookingLogType | null>(null);

  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ingredientsRes, logsRes] = await Promise.all([
          axios.get('/api/ingredients'),
          axios.get('/api/logs'),
        ]);
        setAllIngredients(ingredientsRes.data);
        setCookingLogs(logsRes.data);
      } catch (error) {
        console.error('获取初始数据失败:', error);
      }
    };
    fetchData();
  }, []);

  const handleAddIngredient = useCallback((ingredient: Ingredient) => {
    setSelectedIngredients((prev) => {
      if (prev.find((i) => i.id === ingredient.id)) {
        return prev;
      }
      return [...prev, ingredient];
    });
  }, []);

  const handleRemoveIngredient = useCallback((ingredientId: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i.id !== ingredientId));
  }, []);

  const handleGenerateRecipes = useCallback(async () => {
    if (selectedIngredients.length === 0) {
      return;
    }
    setIsGenerating(true);
    setRecipes([]);
    try {
      const ingredientNames = selectedIngredients.map((i) => i.name);
      const response = await axios.post('/api/generate-recipe', {
        ingredients: ingredientNames,
      });
      setRecipes(response.data);
    } catch (error) {
      console.error('生成食谱失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedIngredients]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsCookingMode(true);
  }, []);

  const handleSaveCookingLog = useCallback(async (data: {
    recipeId: string;
    recipeName: string;
    matchScore: number;
    notes: string;
    rating: number;
  }) => {
    try {
      await axios.post('/api/logs', data);
    } catch (error) {
      console.error('保存烹饪日志失败:', error);
    }
  }, []);

  const handleExitCookingMode = useCallback(() => {
    setIsCookingMode(false);
    setSelectedRecipe(null);
    axios.get('/api/logs').then((res) => {
      setCookingLogs(res.data);
    }).catch(console.error);
  }, []);

  const handleToggleExpand = useCallback((recipeId: string) => {
    setExpandedRecipeId((prev) => (prev === recipeId ? null : recipeId));
  }, []);

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const pageTransition = {
    duration: 0.3,
    ease: 'easeInOut',
  };

  const renderCenterContent = () => {
    if (isGenerating) {
      return (
        <div className="card">
          <div className="loading-container">
            <div className="spinner" />
            <div className="loading-text">AI 正在为你生成美味食谱...</div>
          </div>
        </div>
      );
    }

    if (selectedRecipe && isCookingMode) {
      return (
        <div className="card">
          <Suspense fallback={<LoadingFallback />}>
            <CookingLog
              recipe={selectedRecipe}
              onSave={handleSaveCookingLog}
              onBack={handleExitCookingMode}
            />
          </Suspense>
        </div>
      );
    }

    if (recipes.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {recipes.map((recipe, index) => (
            <Suspense key={recipe.id} fallback={<LoadingFallback />}>
              <RecipeCard
                recipe={recipe}
                index={index}
                isExpanded={expandedRecipeId === recipe.id}
                onToggleExpand={handleToggleExpand}
                onStartCooking={handleSelectRecipe}
              />
            </Suspense>
          ))}
        </div>
      );
    }

    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🍳</div>
          <div className="empty-state-text">请在左侧选择食材开始生成食谱</div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="card">
          <Suspense fallback={<LoadingFallback />}>
            <IngredientPanel
              allIngredients={allIngredients}
              selectedIngredients={selectedIngredients}
              onAdd={handleAddIngredient}
              onRemove={handleRemoveIngredient}
              maxIngredients={8}
              onGenerate={handleGenerateRecipes}
              isGenerating={isGenerating}
            />
          </Suspense>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
          transition={pageTransition}
        >
          <Routes location={location}>
            <Route path="/" element={renderCenterContent()} />
            <Route path="*" element={renderCenterContent()} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> 烹饪历史
          </h2>
          {cookingLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon" style={{ fontSize: '36px' }}>📝</div>
              <div style={{ fontSize: '14px', color: '#888' }}>暂无烹饪记录</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              {cookingLogs.map((log) => (
                <motion.div
                  key={log.id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: selectedLogDetail?.id === log.id ? '#FFF0DB' : '#FAFAFA',
                    cursor: 'pointer',
                    border: '1px solid #eee',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedLogDetail(selectedLogDetail?.id === log.id ? null : log)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#2F4F4F', fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.recipeName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                        {formatDate(log.createdAt)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="match-badge">{log.matchScore}%</span>
                        <SmallStars rating={log.rating} />
                      </div>
                    </div>
                  </div>
                  {selectedLogDetail?.id === log.id && log.notes && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px dashed #ddd',
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: 1.6,
                      }}
                    >
                      💬 {log.notes}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default App;
