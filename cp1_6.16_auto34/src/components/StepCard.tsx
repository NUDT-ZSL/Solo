import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RecipeStep, Ingredient, PresetIngredient, IngredientWithPercentage } from '../lib/types';
import { getProgressBarColor } from '../lib/calculator';
import IngredientSearch from './IngredientSearch';
import Timer from './Timer';

interface StepCardProps {
  step: RecipeStep;
  stepIndex: number;
  presetIngredients: PresetIngredient[];
  ingredientsWithPercentage: Map<string, IngredientWithPercentage>;
  onUpdateStep: (step: RecipeStep) => void;
  onDeleteStep: (stepId: string) => void;
  onDragStart: (e: React.DragEvent, stepId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetStepId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  isNew: boolean;
  isDeleting: boolean;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  stepIndex,
  presetIngredients,
  ingredientsWithPercentage,
  onUpdateStep,
  onDeleteStep,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  isNew,
  isDeleting,
}) => {
  const updateStepTitle = (title: string) => {
    onUpdateStep({ ...step, title });
  };

  const updateStepDescription = (description: string) => {
    onUpdateStep({ ...step, description });
  };

  const updateTimerHours = (hours: number) => {
    onUpdateStep({ ...step, timerHours: hours });
  };

  const updateTimerMinutes = (minutes: number) => {
    onUpdateStep({ ...step, timerMinutes: minutes });
  };

  const getDefaultWeight = (name: string): number => {
    const defaultWeights: Record<string, number> = {
      '面粉': 200,
      '细砂糖': 100,
      '黄油': 100,
      '鸡蛋': 50,
      '牛奶': 100,
      '奶油奶酪': 150,
      '泡打粉': 5,
      '小苏打': 3,
      '盐': 2,
      '香草精': 5,
      '可可粉': 30,
      '抹茶粉': 10,
      '肉桂粉': 3,
      '柠檬汁': 15,
      '蜂蜜': 50,
    };
    return defaultWeights[name] || 50;
  };

  const addIngredient = (name: string) => {
    const newIngredient: Ingredient = {
      id: uuidv4(),
      name,
      weight: getDefaultWeight(name),
      temperature: undefined,
      time: undefined,
    };
    onUpdateStep({
      ...step,
      ingredients: [...step.ingredients, newIngredient],
    });
  };

  const updateIngredient = (ingredientId: string, updates: Partial<Ingredient>) => {
    onUpdateStep({
      ...step,
      ingredients: step.ingredients.map((ing) =>
        ing.id === ingredientId ? { ...ing, ...updates } : ing
      ),
    });
  };

  const deleteIngredient = (ingredientId: string) => {
    onUpdateStep({
      ...step,
      ingredients: step.ingredients.filter((ing) => ing.id !== ingredientId),
    });
  };

  const animationClass = isDeleting
    ? 'step-card-exit'
    : isNew
    ? 'step-card-enter'
    : '';

  return (
    <div
      className={`p-4 mb-4 bg-white rounded-lg border-2 border-dashed transition-all duration-200 ${
        isDragging ? 'dragging opacity-50' : ''
      } ${isDragOver ? 'drag-over' : ''} ${animationClass}`}
      style={{ borderColor: '#F5DEB3' }}
      draggable
      onDragStart={(e) => onDragStart(e, step.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, step.id)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="step-number-badge cursor-move"
          title="拖拽排序"
        >
          {stepIndex + 1}
        </div>

        <div className="flex-1">
          <input
            type="text"
            value={step.title}
            onChange={(e) => updateStepTitle(e.target.value)}
            placeholder="步骤标题"
            className="w-full mb-2 text-lg font-semibold text-amber-900"
            style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #D2B48C' }}
          />

          <div className="p-3 mb-3 rounded-lg" style={{ backgroundColor: '#FFFAF0', border: '1px solid #F5DEB3' }}>
            <div className="text-xs font-medium mb-1" style={{ color: '#D2691E' }}>📝 步骤说明</div>
            <textarea
              value={step.description}
              onChange={(e) => updateStepDescription(e.target.value)}
              placeholder="请输入步骤说明（可选）"
              className="w-full text-sm resize-none bg-transparent border-none p-0"
              style={{ color: '#5D4037' }}
              rows={2}
            />
          </div>

          <Timer
            hours={step.timerHours}
            minutes={step.timerMinutes}
            onHoursChange={updateTimerHours}
            onMinutesChange={updateTimerMinutes}
          />
        </div>

        <button
          onClick={() => onDeleteStep(step.id)}
          className="btn-danger text-lg"
          title="删除步骤"
        >
          ✕
        </button>
      </div>

      <div className="ml-12">
        {step.ingredients.length > 0 && (
          <div className="p-3 mb-3 rounded-lg" style={{ backgroundColor: '#FFF8DC', border: '1px solid #D2B48C' }}>
            <div className="text-xs font-medium mb-2" style={{ color: '#D2691E' }}>🥘 食材列表</div>
            <div className="space-y-2">
              {step.ingredients.map((ing) => {
                const withPercent = ingredientsWithPercentage.get(ing.id);
                const percentage = withPercent?.percentage ?? 0;
                const progressColor = getProgressBarColor(percentage);
                const isUnweighed = ing.weight === 0;

                return (
                  <div
                    key={ing.id}
                    className="flex items-center gap-2 p-2 bg-white rounded border"
                    style={{ borderColor: isUnweighed ? '#E0E0E0' : '#F5DEB3' }}
                  >
                    <span 
                      className={`w-24 font-medium truncate ${isUnweighed ? 'text-gray-400' : 'text-amber-900'}`}
                    >
                      {ing.name}
                      {isUnweighed && (
                        <span className="ml-1 text-xs italic" style={{ color: '#9E9E9E' }}>
                          (未称量)
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={ing.weight || ''}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            weight: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-16 text-center ${isUnweighed ? 'text-gray-400' : ''}`}
                        placeholder="重量"
                      />
                      <span className="text-xs text-gray-500">g</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ing.temperature ?? ''}
                        onChange={(e) =>
                          updateIngredient(ing.id, {
                            temperature: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-14 text-center"
                        placeholder="温度"
                      />
                      <span className="text-xs text-gray-500">°C</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="progress-bar h-full rounded-full"
                          style={{
                            width: isUnweighed ? '0%' : `${Math.min(percentage, 100)}%`,
                            backgroundColor: isUnweighed ? '#E0E0E0' : progressColor,
                          }}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold w-16 text-right ${isUnweighed ? 'text-gray-400' : ''}`}
                        style={{ color: isUnweighed ? undefined : '#2E8B57' }}
                      >
                        {isUnweighed ? '-' : `${percentage.toFixed(1)}%`}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteIngredient(ing.id)}
                      className="btn-icon text-red-500"
                      title="删除食材"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-xs">
          <IngredientSearch
            presetIngredients={presetIngredients}
            onSelect={addIngredient}
            placeholder="点击添加食材..."
          />
        </div>
      </div>
    </div>
  );
};

export default StepCard;
