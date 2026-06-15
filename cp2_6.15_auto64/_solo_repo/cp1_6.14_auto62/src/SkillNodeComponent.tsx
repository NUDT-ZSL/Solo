import React from 'react';
import { SkillNode, CATEGORY_COLORS, CATEGORY_LABELS } from './TreeDataManager';

interface SkillNodeTooltipProps {
  node: SkillNode;
  x: number;
  y: number;
}

export const SkillNodeTooltip: React.FC<SkillNodeTooltipProps> = ({ node, x, y }) => {
  const categoryLabel = CATEGORY_LABELS[node.category];
  const categoryColor = CATEGORY_COLORS[node.category];

  return (
    <div
      style={{
        position: 'absolute',
        left: x + 16,
        top: y - 10,
        background: 'rgba(30, 30, 46, 0.9)',
        borderRadius: 8,
        padding: 12,
        pointerEvents: 'none',
        zIndex: 1000,
        minWidth: 200,
        border: `1px solid ${categoryColor}`,
        boxShadow: `0 0 12px ${categoryColor}40`,
        transition: 'opacity 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{node.icon}</span>
        <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>{node.name}</span>
        <span
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: categoryColor + '30',
            color: categoryColor,
          }}
        >
          {categoryLabel}
        </span>
      </div>
      {node.description && (
        <div style={{ color: '#b0b0c0', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
          {node.description}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#8888aa' }}>
        <span>消耗: <span style={{ color: '#4fc3f7' }}>{node.cost}</span> 点</span>
        <span>冷却: <span style={{ color: '#ff7043' }}>{node.cooldown}s</span></span>
        <span>等级: <span style={{ color: '#ffd54f' }}>{node.levelRequired}</span></span>
      </div>
    </div>
  );
};

interface ConnectionModeIndicatorProps {
  sourceName: string;
  onCancel: () => void;
}

export const ConnectionModeIndicator: React.FC<ConnectionModeIndicatorProps> = ({ sourceName, onCancel }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(79, 195, 247, 0.15)',
        border: '1px solid #4fc3f7',
        borderRadius: 8,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ color: '#4fc3f7', fontSize: 13 }}>
        🔗 连线模式 — 从 <strong>{sourceName}</strong> 连接到目标节点
      </span>
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: '1px solid #ff7043',
          color: '#ff7043',
          borderRadius: 4,
          padding: '2px 8px',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        取消
      </button>
    </div>
  );
};

interface CanvasOverlayProps {
  scale: number;
  showGrid: boolean;
  onToggleGrid: () => void;
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ scale, showGrid, onToggleGrid }) => {
  return (
    <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 8, zIndex: 50 }}>
      <div
        style={{
          background: 'rgba(15, 52, 96, 0.8)',
          borderRadius: 6,
          padding: '4px 10px',
          color: '#4fc3f7',
          fontSize: 12,
          fontFamily: 'monospace',
          backdropFilter: 'blur(4px)',
        }}
      >
        {Math.round(scale * 100)}%
      </div>
      <button
        onClick={onToggleGrid}
        style={{
          background: showGrid ? 'rgba(79, 195, 247, 0.2)' : 'rgba(15, 52, 96, 0.8)',
          border: showGrid ? '1px solid #4fc3f7' : '1px solid #2a2a4e',
          color: showGrid ? '#4fc3f7' : '#8888aa',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
          fontSize: 12,
          backdropFilter: 'blur(4px)',
        }}
      >
        {showGrid ? '▦ 网格' : '▦ 网格'}
      </button>
    </div>
  );
};
