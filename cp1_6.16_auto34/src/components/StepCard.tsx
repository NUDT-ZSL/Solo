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

  const addIngredient = (name: string) => {
    const newIngredient: Ingredient = {
      id: uuidv4(),
      name,
      weight: 0,
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

          <textarea
            value={step.description}
            onChange={(e) => updateStepDescription(e.target.value)}
            placeholder="步骤说明（可选）"
            className="w-full mb-3 text-sm resize-none"
            rows={2}
          />

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
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-amber-800">🥘 食材列表</span>
        </div>

        {step.ingredients.length > 0 && (
          <div className="space-y-2 mb-3">
            {step.ingredients.map((ing) => {
              const withPercent = ingredientsWithPercentage.get(ing.id);
              const percentage = withPercent?.percentage ?? 0;
              const progressColor = getProgressBarColor(percentage);

              return (
                <div
                  key={ing.id}
                  className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200"
                >
                  <span className="w-24 font-medium text-amber-900 truncate">
                    {ing.name}
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
                      className="w-16 text-center"
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
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: progressColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-16 text-right"
                      style={{ color: '#2E8B57' }}
                    >
                      {percentage.toFixed(1)}%
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
