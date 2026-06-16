import React, { useState } from 'react';
import type { Pattern, Material, ProduceResult } from '../types';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '../types';
import { formatCurrency, calculateCost, checkInventory } from '../logic/inventoryLogic';

interface PatternDetailModalProps {
  pattern: Pattern;
  materials: Material[];
  onClose: () => void;
  onProduce: (patternId: string) => Promise<{ result: ProduceResult; updatedMaterials: Material[] }>;
}

export const PatternDetailModal: React.FC<PatternDetailModalProps> = ({
  pattern,
  materials,
  onClose,
  onProduce,
}) => {
  const [isProducing, setIsProducing] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [lastCost, setLastCost] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentMaterials, setCurrentMaterials] = useState(materials);

  const typeColor = PRODUCT_TYPE_COLORS[pattern.productType];
  const typeLabel = PRODUCT_TYPE_LABELS[pattern.productType];
  const estimatedCost = calculateCost(currentMaterials, pattern.materials);
  const { sufficient, missingIds } = checkInventory(currentMaterials, pattern.materials);

  const getMaterialById = (id: string) => {
    return currentMaterials.find((m) => m.id === id);
  };

  const handleProduce = async () => {
    setIsProducing(true);
    setErrorMessage('');

    try {
      const { result, updatedMaterials } = await onProduce(pattern.id);
      setCurrentMaterials(updatedMaterials);

      if (result.success) {
        setLastCost(result.totalCost);
        setShowCost(true);
        setTimeout(() => setShowCost(false), 3000);
      } else {
        setErrorMessage('材料库存不足，请补充材料后再试');
      }
    } catch (error) {
      setErrorMessage('制作失败，请稍后重试');
    } finally {
      setIsProducing(false);
    }
  };

  return (
    <div className="modal-overlay detail-overlay" onClick={onClose}>
      <div className="modal-content detail-modal slide-up" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="detail-header">
          <span
            className="pattern-type-tag large"
            style={{ backgroundColor: typeColor }}
          >
            {typeLabel}
          </span>
          <h2>{pattern.name}</h2>
        </div>

        <div className="detail-body">
          <div className="detail-image-section">
            <img
              src={pattern.imageUrl}
              alt={pattern.name}
              className="detail-image"
            />
          </div>

          <div className="detail-content">
            <div className="detail-section">
              <h3>制作步骤</h3>
              <div className="steps-content">
                {pattern.steps.split('\n').map((step, index) => (
                  <p key={index} className="step-item">{step}</p>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h3>所需材料</h3>
              <div className="materials-list">
                {pattern.materials.map((pm) => {
                  const material = getMaterialById(pm.materialId);
                  const isMissing = missingIds.includes(pm.materialId);
                  return (
                    <div
                      key={pm.materialId}
                      className={`material-item ${isMissing ? 'missing' : ''}`}
                    >
                      <div className="material-color-dot" style={{ backgroundColor: material?.color || '#ccc' }}></div>
                      <div className="material-details">
                        <span className="material-name">{pm.materialName}</span>
                        <span className="material-quantity">
                          用量: {pm.quantity} {material?.unit || ''}
                        </span>
                      </div>
                      <div className="material-stock">
                        {material ? (
                          <span className={material.quantity < pm.quantity ? 'low' : ''}>
                            库存: {material.quantity}
                          </span>
                        ) : (
                          <span className="low">材料已删除</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-footer">
          <div className={`cost-display ${showCost ? 'animate' : ''}`}>
            <span className="cost-label">物料成本:</span>
            <span className="cost-value">
              {showCost ? formatCurrency(lastCost) : formatCurrency(estimatedCost)}
            </span>
          </div>

          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}

          <div className="footer-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isProducing}
            >
              关闭
            </button>
            <button
              className="btn btn-primary produce-btn"
              onClick={handleProduce}
              disabled={isProducing || !sufficient}
            >
              {isProducing ? '制作中...' : !sufficient ? '材料不足' : '制作成品'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
