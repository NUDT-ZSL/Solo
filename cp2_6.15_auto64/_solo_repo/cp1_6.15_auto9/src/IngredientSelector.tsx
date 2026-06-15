import React, { useState } from 'react';
import { Ingredient } from './types';

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  selectedIngredients: string[];
  onSelect: (ingredientIds: string[]) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  ingredients,
  selectedIngredients,
  onSelect,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const groupedIngredients = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) {
      acc[ing.category] = [];
    }
    acc[ing.category].push(ing);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  const toggleIngredient = (id: string) => {
    if (selectedIngredients.includes(id)) {
      onSelect(selectedIngredients.filter(i => i !== id));
    } else {
      onSelect([...selectedIngredients, id]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const clearSelection = () => {
    onSelect([]);
  };

  if (isCollapsed) {
    return (
      <div className="ingredient-selector collapsed">
        <button className="toggle-btn" onClick={onToggleCollapse}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>食材</span>
          {selectedIngredients.length > 0 && (
            <span className="badge">{selectedIngredients.length}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="ingredient-selector">
      <div className="selector-header">
        <div className="selector-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <h3>食材筛选</h3>
        </div>
        <button className="collapse-btn" onClick={onToggleCollapse}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
      </div>

      {selectedIngredients.length > 0 && (
        <div className="selected-summary">
          <span>已选 {selectedIngredients.length} 种</span>
          <button className="clear-btn" onClick={clearSelection}>清空</button>
        </div>
      )}

      <div className="ingredient-list">
        {Object.entries(groupedIngredients).map(([category, items]) => (
          <div key={category} className="ingredient-category">
            <button
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              <span>{category}</span>
              <span className="category-count">{items.length}</span>
              <svg
                className={`chevron ${expandedCategories[category] ? 'expanded' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {(expandedCategories[category] !== false) && (
              <div className="category-items">
                {items.map(ing => (
                  <label
                    key={ing.id}
                    className={`ingredient-item ${selectedIngredients.includes(ing.id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(ing.id)}
                      onChange={() => toggleIngredient(ing.id)}
                    />
                    <span className="checkbox-custom">
                      {selectedIngredients.includes(ing.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      )}
                    </span>
                    <span className="ingredient-name">{ing.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IngredientSelector;
