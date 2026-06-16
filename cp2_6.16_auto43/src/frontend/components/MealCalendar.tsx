import React, { useState } from 'react';
import { AlertTriangle, Clock, Flame, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { MealSlot, Recipe, IngredientCategory } from '../types';

interface MealCalendarProps {
  mealPlan: MealSlot[];
  onUpdateMeal: (slotId: string, recipe: Recipe) => void;
  onMoveMeal: (fromSlotId: string, toSlotId: string) => void;
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const MEAL_TYPES = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '零食' },
];

const getCategoryColor = (category: IngredientCategory): string => {
  const colors: Record<IngredientCategory, string> = {
    vegetable: '#66bb6a',
    meat: '#ef5350',
    grain: '#ffa726',
    dairy: '#42a5f5',
    seasoning: '#8d6e63',
    other: '#78909c',
  };
  return colors[category] || '#78909c';
};

const MealCalendar: React.FC<MealCalendarProps> = ({ mealPlan, onUpdateMeal, onMoveMeal }) => {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const getSlot = (day: number, mealType: string): MealSlot | undefined => {
    return mealPlan.find((s) => s.day === day && s.mealType === mealType);
  };

  const handleDragStart = (slotId: string) => {
    setDraggedSlot(slotId);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    if (draggedSlot && draggedSlot !== slotId) {
      setDragOverSlot(slotId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (targetSlotId: string) => {
    if (draggedSlot && draggedSlot !== targetSlotId) {
      onMoveMeal(draggedSlot, targetSlotId);
    }
    setDraggedSlot(null);
    setDragOverSlot(null);
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
    setDragOverSlot(null);
  };

  const handleAlternativeSelect = (slotId: string, recipe: Recipe) => {
    onUpdateMeal(slotId, recipe);
    setShowAlternatives(null);
  };

  if (mealPlan.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <div className="text-lg">点击"生成一周食谱"按钮开始规划</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[900px]">
        <div className="flex mb-2">
          <div className="w-20 flex-shrink-0" />
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex-1 text-center font-semibold text-gray-300 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {MEAL_TYPES.map(({ key: mealType, label }) => (
          <div key={mealType} className="flex mb-4">
            <div className="w-20 flex-shrink-0 flex items-center text-sm text-gray-400 font-medium">
              {label}
            </div>
            {DAYS.map((_, dayIdx) => {
              const slot = getSlot(dayIdx, mealType);
              if (!slot) return <div key={`${dayIdx}-${mealType}`} className="flex-1 px-1" />;

              const isExpanded = expandedSlot === slot.id;
              const isDragging = draggedSlot === slot.id;
              const isDragOver = dragOverSlot === slot.id;

              return (
                <div key={slot.id} className="flex-1 px-1">
                  <div
                    draggable={!!slot.recipe}
                    onDragStart={() => handleDragStart(slot.id)}
                    onDragOver={(e) => handleDragOver(e, slot.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(slot.id)}
                    onDragEnd={handleDragEnd}
                    className={`relative fade-in rounded-xl p-3 cursor-pointer transition-all duration-300 ${
                      isDragging ? 'dragging opacity-50' : ''
                    } ${isDragOver ? 'drag-over' : ''}`}
                    style={{
                      width: 220,
                      minHeight: 280,
                      backgroundColor: '#1e1e2e',
                    }}
                    onClick={() => slot.recipe && setExpandedSlot(isExpanded ? null : slot.id)}
                  >
                    {slot.warnings.length > 0 && (
                      <div
                        className="absolute -top-1 -right-1 rounded-full flex items-center justify-center text-white"
                        style={{ width: 20, height: 20, backgroundColor: '#ff5252' }}
                        title={slot.warnings.join('\n')}
                      >
                        <AlertTriangle size={12} />
                      </div>
                    )}

                    {slot.recipe ? (
                      <>
                        <div className="font-semibold text-white mb-2 pr-4">
                          {slot.recipe.name}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {slot.recipe.cookTime}分钟
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame size={12} />
                            {slot.recipe.calories}卡
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {slot.recipe.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div
                                className="rounded-sm"
                                style={{
                                  width: 8,
                                  height: 8,
                                  backgroundColor: getCategoryColor(ing.category),
                                }}
                              />
                              <span className="text-xs text-gray-300">{ing.name}</span>
                            </div>
                          ))}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">做法步骤：</div>
                            <ol className="text-xs text-gray-300 space-y-1">
                              {slot.recipe.steps.map((step, idx) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-gray-500">{idx + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAlternatives(showAlternatives === slot.id ? null : slot.id);
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            <RefreshCw size={12} />
                            换一个
                          </button>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                          )}
                        </div>

                        {showAlternatives === slot.id && slot.alternatives.length > 0 && (
                          <div
                            className="absolute z-10 left-0 right-0 mt-2 p-3 rounded-xl shadow-xl fade-in"
                            style={{ width: 240, backgroundColor: '#2a2a3e' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-xs text-gray-400 mb-2">备选菜品：</div>
                            <div className="space-y-2">
                              {slot.alternatives.map((alt) => (
                                <button
                                  key={alt.id}
                                  onClick={() => handleAlternativeSelect(slot.id, alt)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700 transition-colors text-sm text-gray-200"
                                >
                                  {alt.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                        暂无菜品
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealCalendar;
