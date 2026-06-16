import React, { useState, useMemo } from 'react';
import { RecipeStep, IngredientWithPercentage } from '../lib/types';
import { formatToRecipeCard, aggregateIngredientPercentages } from '../lib/calculator';

interface RecipeCardProps {
  recipeName: string;
  steps: RecipeStep[];
  totalWeight: number;
  allIngredients: IngredientWithPercentage[];
  onBack: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipeName,
  steps,
  totalWeight,
  allIngredients,
  onBack,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const aggregatedPercentages = useMemo(() => {
    return aggregateIngredientPercentages(allIngredients).sort(
      (a, b) => b.percentage - a.percentage
    );
  }, [allIngredients]);

  const formattedText = useMemo(() => {
    return formatToRecipeCard(recipeName, steps, totalWeight, aggregatedPercentages);
  }, [recipeName, steps, totalWeight, aggregatedPercentages]);

  const handleExportText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
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
    <div className="min-h-screen fade-in" style={{ backgroundColor: '#FFF8DC', padding: '20px' }}>
      <div className="no-print flex justify-between items-center mb-6">
        <button onClick={onBack} className="btn-primary">
          ← 返回编辑
        </button>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="btn-primary">
            🖨️ 打印
          </button>
          <button onClick={handleExportText} className="btn-secondary">
            📋 导出文本
          </button>
        </div>
      </div>

      {copySuccess && (
        <div
          className="no-print fixed top-4 right-4 px-4 py-2 rounded-lg text-white font-bold scale-in z-50"
          style={{ backgroundColor: '#2E8B57' }}
        >
          ✓ 已复制
        </div>
      )}

      <div className="max-w-4xl