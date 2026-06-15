import React from 'react';
import type { ElementType } from '../types';

interface PanelProps {
  onDragStart: (type: ElementType) => void;
  onDragEnd?: () => void;
}

const elementConfig: { type: ElementType; label: string }[] = [
  { type: 'ground', label: '地面块' },
  { type: 'wall', label: '墙体块' },
  { type: 'enemy', label: '敌人出生点' },
  { type: 'coin', label: '金币道具' },
];

const Panel: React.FC<PanelProps> = ({ onDragStart, onDragEnd }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: ElementType) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(type);
  };

  const handleDragEnd = () => {
    if (onDragEnd) onDragEnd();
  };

  const renderElementIcon = (type: ElementType) => {
    switch (type) {
      case 'ground':
        return (
          <div
            style={{
              width: 48,
              height: 24,
              background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
              borderRadius: 4,
            }}
          />
        );
      case 'wall':
        return (
          <div
            style={{
              width: 24,
              height: 48,
              background: '#92400e',
              borderRadius: 2,
            }}
          />
        );
      case 'enemy':
        return (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444, 0 0 16px #ef4444',
            }}
          />
        );
      case 'coin':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24">
            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: 240,
        background: 'rgba(31, 31, 35, 0.95)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRight: '1px solid #2e2e32',
      }}
    >
      <h3
        style={{
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        组件库
      </h3>
      {elementConfig.map(({ type, label }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => handleDragStart(e, type)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            background: '#2a2a2e',
            borderRadius: 8,
            cursor: 'grab',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3a3a3e';
            e.currentTarget.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2a2a2e';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a1e',
              borderRadius: 6,
            }}
          >
            {renderElementIcon(type)}
          </div>
          <span
            style={{
              color: '#e0e0e0',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 'auto',
          padding: 12,
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <p
          style={{
            color: '#9ca3af',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          💡 拖拽元素到画布，双击编辑属性，Delete键删除选中元素
        </p>
      </div>
    </div>
  );
};

export default Panel;
