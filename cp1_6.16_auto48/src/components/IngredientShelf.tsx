import React from 'react';
import { Material } from '../gameLogic';

interface IngredientShelfProps {
  materials: Material[];
  inventory: Record<string, number>;
  onDragStart: (material: Material) => void;
}

const IngredientShelf: React.FC<IngredientShelfProps> = ({ materials, inventory, onDragStart }) => {
  return (
    <div className="ingredient-shelf">
      <h2 className="panel-title">📦 配料架</h2>
      <div className="materials-grid">
        {materials.map(material => {
          const stock = inventory[material.id] || 0;
          const isLowStock = stock <= 2;
          const isOutOfStock = stock <= 0;
          
          return (
            <div
              key={material.id}
              className={`material-card ${isOutOfStock ? 'out-of-stock' : ''} ${isLowStock && !isOutOfStock ? 'low-stock' : ''}`}
              onMouseDown={() => !isOutOfStock && onDragStart(material)}
              title={`${material.name} - ${material.description}`}
            >
              <div 
                className="material-icon-wrapper"
                style={{ 
                  backgroundColor: isOutOfStock ? '#95A5A6' : material.color,
                  boxShadow: isOutOfStock ? 'none' : `0 0 15px ${material.color}50`
                }}
              >
                <span className="material-icon-large">{material.icon}</span>
              </div>
              <div className="material-info">
                <span className="material-name">{material.name}</span>
                <span className="material-stock">库存: {stock}</span>
              </div>
              <div 
                className="stock-indicator"
                style={{ 
                  backgroundColor: isOutOfStock ? '#95A5A6' : material.color 
                }}
              />
            </div>
          );
        })}
      </div>
      <p className="hint">拖拽材料到坩埚中</p>
    </div>
  );
};

export default IngredientShelf;
