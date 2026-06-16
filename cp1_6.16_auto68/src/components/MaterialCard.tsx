import React from 'react';
import type { Material } from '../types';
import { formatCurrency } from '../logic/inventoryLogic';

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
  const isLowStock = material.quantity < 5;

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
              {material.quantity} {material.unit}
            </span>
          </p>
          <p>
            <span className="label">单价:</span>
            <span className="price">{formatCurrency(material.price)}/{material.unit}</span>
          </p>
          <p>
            <span className="label">供应商:</span>
            <span className="supplier">{material.supplier}</span>
          </p>
        </div>
        {isLowStock && (
          <div className="warning-badge" title="库存不足">
            !
          </div>
        )}
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
