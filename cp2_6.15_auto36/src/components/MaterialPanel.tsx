import React from 'react';
import { useDrag } from 'react-dnd';
import { ElementType } from '../types';

interface MaterialItem {
  type: ElementType;
  name: string;
  icon: string;
  shapeType?: 'rectangle' | 'circle' | 'triangle';
}

const materials: { title: string; items: MaterialItem[] }[] = [
  {
    title: '文本',
    items: [
      { type: 'text', name: '标题文本', icon: 'T' },
    ],
  },
  {
    title: '图片',
    items: [
      { type: 'image', name: '图片占位符', icon: '🖼️' },
    ],
  },
  {
    title: '装饰',
    items: [
      { type: 'line', name: '装饰线', icon: '━' },
    ],
  },
  {
    title: '几何形状',
    items: [
      { type: 'shape', name: '矩形', icon: '▢', shapeType: 'rectangle' },
      { type: 'shape', name: '圆形', icon: '○', shapeType: 'circle' },
      { type: 'shape', name: '三角形', icon: '△', shapeType: 'triangle' },
    ],
  },
];

interface MaterialItemComponentProps {
  item: MaterialItem;
}

const MaterialItemComponent: React.FC<MaterialItemComponentProps> = ({ item }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'MATERIAL',
    item: { 
      type: 'MATERIAL', 
      elementType: item.type,
      shapeType: item.shapeType,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item]);

  return (
    <div
      ref={drag}
      className="material-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="material-icon">{item.icon}</div>
      <span className="material-name">{item.name}</span>
    </div>
  );
};

interface MaterialPanelProps {
  isOpen?: boolean;
}

export const MaterialPanel: React.FC<MaterialPanelProps> = ({ isOpen = true }) => {
  return (
    <div className={`material-panel ${isOpen ? 'open' : ''}`}>
      <div className="material-panel-header">
        素材库
      </div>
      <div className="material-panel-content">
        {materials.map((section, sectionIndex) => (
          <div key={sectionIndex} className="material-section">
            <div className="material-section-title">{section.title}</div>
            <div className="material-items">
              {section.items.map((item, itemIndex) => (
                <MaterialItemComponent
                  key={`${sectionIndex}-${itemIndex}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
