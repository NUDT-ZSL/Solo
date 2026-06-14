import React from 'react';
import { AnnotationElement } from './types';

interface LayerPanelProps {
  elements: AnnotationElement[];
  selectedId: string | null;
  onSelectElement: (id: string) => void;
}

const typeLabels: Record<string, { name: string; icon: string; color: string }> = {
  anchor: { name: '锚点', icon: '●', color: '#e53935' },
  text: { name: '文本框', icon: 'T', color: '#1e88e5' },
  arrow: { name: '箭头', icon: '→', color: '#43a047' },
  ruler: { name: '量尺', icon: '⟷', color: '#fb8c00' },
};

const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedId,
  onSelectElement,
}) => {
  const getElementNumber = (element: AnnotationElement): number => {
    const sameTypeElements = elements.filter((e) => e.type === element.type);
    return sameTypeElements.findIndex((e) => e.id === element.id) + 1;
  };

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <span className="panel-title">图层</span>
        <span className="panel-count">{elements.length}</span>
      </div>
      <div className="panel-content">
        {elements.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <span className="empty-text">暂无标注元素</span>
          </div>
        ) : (
          <div className="layer-list">
            {elements.map((element, index) => {
              const typeInfo = typeLabels[element.type];
              const number = getElementNumber(element);
              const isSelected = selectedId === element.id;

              return (
                <div
                  key={element.id}
                  className={`layer-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectElement(element.id)}
                  style={{
                    borderLeft: `3px solid ${isSelected ? '#4a90d9' : 'transparent'}`,
                  }}
                >
                  <span
                    className="layer-icon"
                    style={{ color: typeInfo.color }}
                  >
                    {typeInfo.icon}
                  </span>
                  <span className="layer-name">
                    {typeInfo.name} {number}
                  </span>
                  <span className="layer-index">#{index + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerPanel;
