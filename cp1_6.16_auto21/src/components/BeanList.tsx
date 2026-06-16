import React, { useState } from 'react';
import type { CoffeeBean } from '../types';
import { BeanManager } from '../beans/BeanManager';

interface BeanListProps {
  beans: CoffeeBean[];
  onNewBatch: (beanId: string) => void;
  onBeanClick?: (beanId: string) => void;
}

const BeanList: React.FC<BeanListProps> = ({ beans, onNewBatch, onBeanClick }) => {
  const [expandedBeanId, setExpandedBeanId] = useState<string | null>(null);

  const toggleExpand = (beanId: string) => {
    setExpandedBeanId(expandedBeanId === beanId ? null : beanId);
    if (onBeanClick) {
      onBeanClick(beanId);
    }
  };

  const handleNewBatch = (e: React.MouseEvent, beanId: string) => {
    e.stopPropagation();
    onNewBatch(beanId);
  };

  return (
    <div className="bean-list-section">
      <div className="section-header">
        <h2 className="section-title">生豆库存看板</h2>
        <span className="bean-count">{beans.length} 种生豆</span>
      </div>
      <div className="bean-scroll-container">
        <div className="bean-card-track">
          {beans.map((bean) => {
            const isLowStock = bean.stockKg < 10;
            const isExpanded = expandedBeanId === bean.id;

            return (
              <div
                key={bean.id}
                className={`bean-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleExpand(bean.id)}
              >
                <div className="bean-card-inner">
                  <div className="bean-card-header">
                    <span className="origin-tag">{bean.origin}</span>
                  </div>

                  <div className="bean-card-body">
                    <h3 className="bean-name">{bean.name}</h3>
                    <p className="bean-process">{bean.processMethod}</p>
                    <div className="bean-flavors">
                      {bean.flavorNotes.slice(0, 3).map((note, idx) => (
                        <span key={idx} className="flavor-tag">{note}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bean-card-footer">
                    <span className={`stock-amount ${isLowStock ? 'low-stock' : ''}`}>
                      {bean.stockKg.toFixed(1)} kg
                    </span>
                    <button
                      className="create-batch-btn"
                      onClick={(e) => handleNewBatch(e, bean.id)}
                    >
                      新建批次
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bean-detail-panel">
                    <div className="detail-row">
                      <span className="detail-label">品种:</span>
                      <span className="detail-value">{bean.variety}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">海拔:</span>
                      <span className="detail-value">{bean.altitude}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">处理法:</span>
                      <span className="detail-value">{bean.processMethod}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">风味特征:</span>
                      <span className="detail-value">{bean.flavorNotes.join(', ')}</span>
                    </div>
                    {isLowStock && (
                      <div className="stock-warning">
                        ⚠️ 库存不足，请及时补货
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BeanList;
