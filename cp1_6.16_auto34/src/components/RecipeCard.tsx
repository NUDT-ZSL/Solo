import React, { useState, useMemo } from 'react';
import { Recipe } from '../lib/types';
import {
  calculatePercentages,
  getAllIngredients,
  aggregateIngredientPercentages,
  formatToRecipeCard,
} from '../lib/calculator';

interface RecipeCardProps {
  recipe: Recipe;
  onBack: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onBack }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const { ingredientsWithPercentage, totalWeight, aggregatedPercentages } = useMemo(() => {
    const allIngredients = getAllIngredients(recipe.steps);
    const { ingredients, totalWeight } = calculatePercentages(allIngredients);
    const aggregated = aggregateIngredientPercentages(ingredients);
    return {
      ingredientsWithPercentage: ingredients,
      totalWeight,
      aggregatedPercentages: aggregated.sort((a, b) => b.percentage - a.percentage),
    };
  }, [recipe.steps]);

  const percentageMap = useMemo(() => {
    const map = new Map<string, number>();
    ingredientsWithPercentage.forEach((ing) => {
      map.set(ing.id, ing.percentage);
    });
    return map;
  }, [ingredientsWithPercentage]);

  const handleExportText = async () => {
    try {
      const text = formatToRecipeCard(
        recipe.name,
        recipe.steps,
        totalWeight,
        aggregatedPercentages
      );
      
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-6 fade-in" style={{ backgroundColor: '#FFF8DC' }}>
      <div className="no-print flex justify-between items-center mb-6 max-w-4xl mx-auto">
        <button onClick={onBack} className="btn-primary">
          ← 返回编辑
        </button>
        <div className="flex gap-3">
          <button onClick={handleExportText} className="btn-secondary">
            📋 导出文本
          </button>
          <button onClick={handlePrint} className="btn-primary">
            🖨️ 打印
          </button>
        </div>
        {copySuccess && (
          <div
            className="fixed top-20 right-6 px-4 py-2 rounded-lg text-white font-medium scale-in z-50"
            style={{ backgroundColor: '#2E8B57' }}
          >
            ✓ 已复制
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="recipe-card" style={{ width: '100%' }}>
          <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid #D2691E' }}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#8B4513' }}>
              🍰 {recipe.name}
            </h1>
            <p className="text-lg" style={{ color: '#D2691E' }}>
              总重量: <span className="font-bold">{totalWeight}g</span>
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#8B4513' }}>
              📋 食材百分比
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#8B4513', color: '#FFF' }}>
                  <th className="p-3 text-left rounded-tl-lg">食材名称</th>
                  <th className="p-3 text-right rounded-tr-lg">占比</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedPercentages.map((item, index) => (
                  <tr
                    key={item.name}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFF8DC' : '#FFFAF0',
                      borderBottom: '1px solid #F5DEB3',
                    }}
                  >
                    <td className="p-3 font-medium" style={{ color: '#8B4513' }}>
                      {item.name}
                    </td>
                    <td className="p-3 text-right font-bold" style={{ color: '#2E8B57' }}>
                      {item.percentage.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#8B4513' }}>
              📝 制作步骤
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step, stepIndex) => (
                <div
                  key={step.id}
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: '#FFF8DC',
                    border: '1px solid #F5DEB3',
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="step-number-badge">{stepIndex + 1}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#8B4513' }}>
                        {step.title}
                      </h3>
                      {step.description && (
                        <p className="text-gray-700 mb-2">{step.description}</p>
                      )}
                      {(step.timerHours > 0 || step.timerMinutes > 0) && (
                        <p className="text-sm mb-2" style={{ color: '#D2691E' }}>
                          ⏱️ 定时: {step.timerHours > 0 && `${step.timerHours}小时`}
                          {step.timerMinutes > 0 && `${step.timerMinutes}分钟`}
                        </p>
                      )}
                    </div>
                  </div>

                  {step.ingredients.length > 0 && (
                    <div className="ml-12 border-t pt-3" style={{ borderColor: '#F5DEB3' }}>
                      <p className="text-sm font-medium mb-2" style={{ color: '#8B4513' }}>
                        食材:
                      </p>
                      <div className="space-y-1">
                        {step.ingredients.map((ing) => {
                          const percent = percentageMap.get(ing.id) ?? 0;
                          return (
                            <div
                              key={ing.id}
                              className="flex items-center justify-between text-sm py-1 px-2 rounded"
                              style={{ backgroundColor: '#FFFAF0' }}
                            >
                              <span>
                                • {ing.name}: {ing.weight}g
                                {ing.temperature && ` (${ing.temperature}°C)`}
                              </span>
                              <span className="font-bold" style={{ color: '#2E8B57' }}>
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 pt-4" style={{ borderTop: '2px solid #D2691E' }}>
            <div
              className="w-24 h-24 flex items-center justify-center rounded-lg"
              style={{ border: '2px dashed #D2B48C', backgroundColor: '#FFFAF0' }}
            >
              <span className="text-xs text-gray-500">二维码</span>
            </div>
            <div className="text-center">
              <p className="text-sm" style={{ color: '#8B4513' }}>
                配方由烘焙配方编辑器生成
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
