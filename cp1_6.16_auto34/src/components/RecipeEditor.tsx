import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  RecipeStep,
  Recipe,
  PresetIngredient,
  RecipeTemplate,
  IngredientWithPercentage,
  SaveRecipeResponse,
} from '../lib/types';
import {
  calculatePercentages,
  getAllIngredients,
  aggregateIngredientPercentages,
} from '../lib/calculator';
import StepCard from './StepCard';
import IngredientSearch from './IngredientSearch';

interface RecipeEditorProps {
  presetIngredients: PresetIngredient[];
  templates: RecipeTemplate[];
  onGenerateCard: (recipe: Recipe) => void;
}

const MAX_STEPS = 10;

const RecipeEditor: React.FC<RecipeEditorProps> = ({
  presetIngredients,
  templates,
  onGenerateCard,
}) => {
  const [recipeName, setRecipeName] = useState('未命名配方');
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeTemplate[]>(templates);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [newStepIds, setNewStepIds] = useState<Set<string>>(new Set());
  const [deletingStepIds, setDeletingStepIds] = useState<Set<string>>(new Set());
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [hoveredRecipeId, setHoveredRecipeId] = useState<string | null>(null);
  const [sidebarHover, setSidebarHover] = useState(false);

  const { ingredientsWithPercentage, totalWeight, aggregatedPercentages, percentageMap } = useMemo(() => {
    const startTime = performance.now();
    const allIngredients = getAllIngredients(steps);
    const { ingredients, totalWeight } = calculatePercentages(allIngredients);
    const aggregated = aggregateIngredientPercentages(ingredients);
    
    const map = new Map<string, IngredientWithPercentage>();
    ingredients.forEach((ing) => map.set(ing.id, ing));
    
    const endTime = performance.now();
    console.log(`百分比计算耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      ingredientsWithPercentage: ingredients,
      totalWeight,
      aggregatedPercentages: aggregated,
      percentageMap: map,
    };
  }, [steps]);

  const addStep = useCallback(() => {
    if (steps.length >= MAX_STEPS) {
      alert(`最多只能添加 ${MAX_STEPS} 个步骤`);
      return;
    }

    const newStep: RecipeStep = {
      id: uuidv4(),
      title: `步骤 ${steps.length + 1}`,
      description: '',
      timerHours: 0,
      timerMinutes: 0,
      ingredients: [],
    };

    setSteps((prev) => [...prev, newStep]);
    setNewStepIds((prev) => new Set(prev).add(newStep.id));
    setTimeout(() => {
      setNewStepIds((prev) => {
        const next = new Set(prev);
        next.delete(newStep.id);
        return next;
      });
    }, 400);
  }, [steps.length]);

  const updateStep = useCallback((updatedStep: RecipeStep) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === updatedStep.id ? updatedStep : step))
    );
  }, []);

  const deleteStep = useCallback((stepId: string) => {
    setDeletingStepIds((prev) => new Set(prev).add(stepId));
    setTimeout(() => {
      setSteps((prev) => prev.filter((step) => step.id !== stepId));
      setDeletingStepIds((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    }, 300);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, stepId: string) => {
    setDraggedStepId(stepId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, stepId: string) => {
    e.preventDefault();
    if (stepId !== draggedStepId) {
      setDragOverStepId(stepId);
    }
  }, [draggedStepId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStepId(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();
    if (!draggedStepId || draggedStepId === targetStepId) {
      setDraggedStepId(null);
      setDragOverStepId(null);
      return;
    }

    setSteps((prev) => {
      const newSteps = [...prev];
      const draggedIndex = newSteps.findIndex((s) => s.id === draggedStepId);
      const targetIndex = newSteps.findIndex((s) => s.id === targetStepId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const [draggedStep] = newSteps.splice(draggedIndex, 1);
      newSteps.splice(targetIndex, 0, draggedStep);

      return newSteps;
    });

    setDraggedStepId(null);
    setDragOverStepId(null);
  }, [draggedStepId]);

  const handleDragEnd = useCallback(() => {
    setDraggedStepId(null);
    setDragOverStepId(null);
  }, []);

  const handleSave = async () => {
    if (!recipeName.trim()) {
      alert('请输入配方名称');
      return;
    }

    if (steps.length === 0) {
      alert('请至少添加一个步骤');
      return;
    }

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: recipeName,
          steps,
          totalWeight,
          ingredientPercentages: aggregatedPercentages,
        }),
      });

      const data: SaveRecipeResponse = await response.json();

      if (data.success) {
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 1000);

        const newSavedRecipe: RecipeTemplate = {
          id: data.id,
          name: recipeName,
          steps: JSON.parse(JSON.stringify(steps)),
          stepCount: steps.length,
        };
        setSavedRecipes((prev) => [...prev, newSavedRecipe]);
      }
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  const handleGenerateCard = () => {
    if (!recipeName.trim()) {
      alert('请输入配方名称');
      return;
    }

    if (steps.length === 0) {
      alert('请至少添加一个步骤');
      return;
    }

    const recipe: Recipe = {
      name: recipeName,
      steps,
      totalWeight,
    };
    onGenerateCard(recipe);
  };

  const loadTemplate = (template: RecipeTemplate) => {
    setRecipeName(template.name);
    setSteps(JSON.parse(JSON.stringify(template.steps)));
  };

  const handleRecipeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 20) {
      setRecipeName(value);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFF8DC' }}>
      <div
        className="no-print py-4 px-6"
        style={{ backgroundColor: '#8B4513' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#FFD700' }}>
            🍰 烘焙配方编辑器
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm" style={{ color: '#F5DEB3' }}>
              总重量: <span className="font-bold text-lg" style={{ color: '#FFD700' }}>{totalWeight}g</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex main-layout">
        <div
          className="editor-section flex-1 p-6 overflow-y-auto"
          style={{
            width: '70%',
            borderRight: `2px solid ${sidebarHover ? '#8B4513' : '#D2691E'}`,
            transition: 'border-color 0.2s ease',
            paddingBottom: '100px',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#8B4513' }}>
                配方名称
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={handleRecipeNameChange}
                className="w-full text-xl font-bold"
                style={{ color: '#8B4513' }}
                placeholder="输入配方名称（最多20字）"
                maxLength={20}
              />
              <div className="text-right text-xs mt-1" style={{ color: '#D2B48C' }}>
                {recipeName.length}/20
              </div>
            </div>

            {totalWeight > 0 && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FFFAF0', border: '1px solid #F5DEB3' }}>
                <h3 className="font-bold mb-3" style={{ color: '#8B4513' }}>📊 食材汇总占比</h3>
                <div className="grid grid-cols-2 gap-2">
                  {aggregatedPercentages
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 6)
                    .map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span style={{ color: '#8B4513' }}>{item.name}</span>
                        <span className="font-bold" style={{ color: '#2E8B57' }}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  onDragEnter={(e) => handleDragEnter(e, step.id)}
                  onDragLeave={handleDragLeave}
                >
                  <StepCard
                    step={step}
                    stepIndex={index}
                    presetIngredients={presetIngredients}
                    ingredientsWithPercentage={percentageMap}
                    onUpdateStep={updateStep}
                    onDeleteStep={deleteStep}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedStepId === step.id}
                    isDragOver={dragOverStepId === step.id}
                    isNew={newStepIds.has(step.id)}
                    isDeleting={deletingStepIds.has(step.id)}
                  />
                </div>
              ))}
            </div>

            {steps.length === 0 && (
              <div
                className="text-center py-16 rounded-lg border-2 border-dashed"
                style={{ borderColor: '#F5DEB3', color: '#D2B48C' }}
              >
                <p className="text-4xl mb-4">🥐</p>
                <p className="text-lg">点击下方"添加步骤"按钮开始创建配方</p>
              </div>
            )}
          </div>
        </div>

        <div
          className="sidebar-section p-4 overflow-y-auto no-print"
          style={{ width: '30%' }}
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
        >
          <div className="mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#8B4513' }}>
              🍽️ 预设食材库
            </h3>
            <IngredientSearch
              presetIngredients={presetIngredients}
              onSelect={() => {}}
              placeholder="浏览或搜索食材..."
            />
            <div className="mt-3 flex flex-wrap gap-1">
              {presetIngredients.slice(0, 10).map((ing) => (
                <span
                  key={ing.name}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: '#F5DEB3', color: '#8B4513' }}
                >
                  {ing.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#8B4513' }}>
              📂 我的配方
            </h3>
            <div className="space-y-3">
              {savedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-3 rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: hoveredRecipeId === recipe.id ? '#FFFAF0' : '#FFF',
                    border: '1px solid #F5DEB3',
                    transform: hoveredRecipeId === recipe.id ? 'translateY(-3px)' : 'translateY(0)',
                    boxShadow: hoveredRecipeId === recipe.id
                      ? '0 8px 20px rgba(139, 69, 19, 0.25)'
                      : '0 2px 6px rgba(139, 69, 19, 0.1)',
                  }}
                  onMouseEnter={() => setHoveredRecipeId(recipe.id)}
                  onMouseLeave={() => setHoveredRecipeId(null)}
                  onClick={() => loadTemplate(recipe)}
                >
                  <div className="font-medium" style={{ color: '#8B4513' }}>
                    {recipe.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#D2B48C' }}>
                    {recipe.stepCount} 个步骤
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="no-print fixed bottom-0 left-0 right-0 p-4 flex justify-center gap-4"
        style={{
          backgroundColor: 'rgba(255, 248, 220, 0.95)',
          borderTop: '2px solid #D2691E',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={addStep}
          disabled={steps.length >= MAX_STEPS}
          className="btn-primary text-base px-8 py-3"
          style={{
            transition: 'transform 0.1s ease',
          }}
        >
          ➕ 添加步骤 ({steps.length}/{MAX_STEPS})
        </button>
        <button
          onClick={handleSave}
          className="btn-primary text-base px-8 py-3"
          style={{
            backgroundColor: '#2E8B57',
            transition: 'transform 0.1s ease',
          }}
        >
          💾 保存配方
        </button>
        <button
          onClick={handleGenerateCard}
          className="text-base px-8 py-3 font-bold rounded-lg"
          style={{
            backgroundColor: '#FFD700',
            color: '#8B4513',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🎴 生成卡片
        </button>
      </div>

      {showSaveSuccess && (
        <div
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 float-up"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center scale-in"
            style={{ backgroundColor: '#32CD32' }}
          >
            <span className="text-4xl text-white">✓</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeEditor;
