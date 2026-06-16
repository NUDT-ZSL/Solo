import React, { useState, useCallback } from 'react';
import { categories, getMaterialsByCategory, Material, Category } from '@/data/materials';

interface MaterialPanelProps {}

const MaterialPanel: React.FC<MaterialPanelProps> = () => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0].id);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, material: Material) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(material));

    const dragImg = document.createElement('div');
    dragImg.style.width = `${material.defaultWidth}px`;
    dragImg.style.height = `${material.defaultHeight}px`;
    dragImg.style.backgroundColor = material.color;
    dragImg.style.borderRadius = '6px';
    dragImg.style.opacity = '0.7';
    dragImg.style.position = 'absolute';
    dragImg.style.top = '-10000px';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, material.defaultWidth / 2, material.defaultHeight / 2);
    setTimeout(() => document.body.removeChild(dragImg), 0);
  }, []);

  const renderCategoryTabs = () => (
    <div className="category-tabs">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => setActiveCategory(cat.id)}
          style={
            activeCategory === cat.id
              ? {
                  background: `linear-gradient(135deg, ${cat.gradientStart}, ${cat.gradientEnd})`,
                }
              : undefined
          }
        >
          <span className="category-icon">{getCategoryIcon(cat.id)}</span>
          <span className="category-name">{cat.name}</span>
        </button>
      ))}
    </div>
  );

  const renderMaterialsGrid = () => {
    const materials = getMaterialsByCategory(activeCategory);
    const category = categories.find((c) => c.id === activeCategory);

    return (
      <div className="materials-grid">
        {materials.map((material) => (
          <div
            key={material.id}
            className="material-card"
            draggable
            onDragStart={(e) => handleDragStart(e, material)}
            style={{
              background: `linear-gradient(135deg, ${category?.gradientStart}, ${category?.gradientEnd})`,
            }}
            title={`拖拽到画布: ${material.name}`}
          >
            <div
              className="material-thumb"
              style={{
                backgroundColor: material.color,
                width: Math.min(material.defaultWidth * 0.7, 56),
                height: Math.min(material.defaultHeight * 0.7, 56),
              }}
            />
            <div className="material-name">{material.name}</div>
            <div className="material-size">
              {material.defaultWidth}×{material.defaultHeight}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <aside className="material-panel">
      <div className="panel-header">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <h2>素材库</h2>
      </div>

      {renderCategoryTabs()}
      {renderMaterialsGrid()}

      <div className="panel-footer">
        <span>共 {getMaterialsByCategory(activeCategory).length} 个素材</span>
      </div>
    </aside>
  );
};

function getCategoryIcon(categoryId: string): string {
  switch (categoryId) {
    case 'nature':
      return '🌿';
    case 'building':
      return '🏠';
    case 'water':
      return '💧';
    case 'decor':
      return '✨';
    default:
      return '📦';
  }
}

export default MaterialPanel;
