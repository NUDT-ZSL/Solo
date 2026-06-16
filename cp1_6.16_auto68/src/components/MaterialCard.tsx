import React from 'react';
import type { Material } from '../types';
import { formatCurrency } from '../logic/inventoryLogic';

const LOW_STOCK_THRESHOLD = 5;

interface MaterialCardProps {
  material: Material;
  isMissing?: boolean;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  isMissing = false,
  onDelete,
  isDeleting = false,
}) => {
  const isLowStock = material.quantity < LOW_STOCK_THRESHOLD;

  return (
    <div
      className={`material-card ${isMissing ? 'missing' : ''} ${isDeleting ? 'deleting' : ''}`}
      style={{ borderTopColor: material.color }}
    >
      <div className="card-header" style={{ backgroundColor: material.color }}>
        <span className="color-indicator" style={{ backgroundColor: material.color }}></span>
      </div>
      <div className="card-body">
        <h3 className="material-name">{material.name}</h3>
        <div className="material-info">
          <p>
            <span className="label">库存:</span>
            <span className={`quantity ${isLowStock ? 'low' : ''}`}>
              {material.quantity}
              <span className="unit-tag">{material.unit}</span>
            </span>
          </p>
          <p>
            <span className="label">单价:</span>
            <span className="price">{formatCurrency(material.price)}/{material.unit}</span>
          </p>
        </div>
        {isLowStock && (
          <div className="warning-badge" title="库存不足">
            !
          </div>
        )}
      </div>
      <div className="supplier-footer">
        <span className="supplier-icon">🏪</span>
        <span className="supplier-name">{material.supplier || '未指定'}</span>
      </div>
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(material.id);
        }}
      >
        ×
      </button>
    </div>
  );
};
