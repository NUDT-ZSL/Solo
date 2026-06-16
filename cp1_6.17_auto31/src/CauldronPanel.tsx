import { useState, useEffect } from 'react';
import { INGREDIENTS, getIngredientById } from './potionEngine';
import './CauldronPanel.css';

interface CauldronPanelProps {
  onStartBrew: (ingredientIds: string[]) => void;
  isBrewing: boolean;
  invalidRecipe: boolean;
}

export default function CauldronPanel({ onStartBrew, isBrewing, invalidRecipe }: CauldronPanelProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [showInvalidTip, setShowInvalidTip] = useState(false);

  useEffect(() => {
    if (invalidRecipe) {
      setShowInvalidTip(true);
      const timer = setTimeout(() => setShowInvalidTip(false), 600);
      return () => clearTimeout(timer);
    }
  }, [invalidRecipe]);

  const handleIngredientClick = (id: string) => {
    if (isBrewing) return;
    if (selectedIngredients.includes(id)) {
      setSelectedIngredients((prev) => prev.filter((i) => i !== id));
    } else if (selectedIngredients.length < 4) {
      setSelectedIngredients((prev) => [...prev, id]);
    }
  };

  const handleStartBrew = () => {
    if (selectedIngredients.length === 0 || isBrewing) return;
    onStartBrew(selectedIngredients);
  };

  const handleClearSlot = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isBrewing) return;
    setSelectedIngredients((prev) => prev.filter((i) => i !== id));
  };

  const renderSlot = (index: number) => {
    const id = selectedIngredients[index];
    const ingredient = id ? getIngredientById(id) : null;

    return (
      <div
        key={index}
        className={`recipe-slot ${ingredient ? 'filled' : ''}`}
        onClick={() => ingredient && handleIngredientClick(ingredient.id)}
      >
        {ingredient ? (
          <>
            <span className="slot-icon">{ingredient.icon}</span>
            <span className="slot-name">{ingredient.name}</span>
            <span className="slot-weight">{ingredient.weight}g</span>
            <button
              className="slot-remove"
              onClick={(e) => handleClearSlot(e, ingredient.id)}
              title="移除"
            >
              ×
            </button>
          </>
        ) : (
          <span className="slot-empty">空槽位 {index + 1}</span>
        )}
      </div>
    );
  };

  return (
    <div className="cauldron-panel">
      <h2 className="panel-title">📜 药材原料</h2>

      <div className="ingredients-grid">
        {INGREDIENTS.map((ing) => (
          <div
            key={ing.id}
            className={`ingredient-card ${selectedIngredients.includes(ing.id) ? 'selected' : ''} ${isBrewing ? 'disabled' : ''}`}
            onClick={() => handleIngredientClick(ing.id)}
            style={{ borderColor: selectedIngredients.includes(ing.id) ? '#FFD700' : 'transparent' }}
          >
            <span className="ingredient-icon">{ing.icon}</span>
            <span className="ingredient-name">{ing.name}</span>
          </div>
        ))}
      </div>

      <div className="recipe-section">
        <h3 className="recipe-title">🧪 配方槽</h3>
        <div className="recipe-slots">
          {[0, 1, 2, 3].map((i) => renderSlot(i))}
        </div>
      </div>

      <button
        className={`brew-button ${isBrewing ? 'brewing' : ''}`}
        onClick={handleStartBrew}
        disabled={isBrewing || selectedIngredients.length === 0}
      >
        {isBrewing ? '炼药中...' : '🔥 开始炼药'}
      </button>

      {showInvalidTip && (
        <div className="invalid-tip">
          ❌ 不合法的配方组合！
        </div>
      )}
    </div>
  );
}
