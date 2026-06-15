import React from 'react';
import { LayoutBlockType, BLOCK_LABELS, DEFAULT_BLOCK_DIMENSIONS, DEFAULT_BACKGROUND_COLORS } from './LayoutEngine';

interface ComponentPanelProps {
  onDragStart: (type: LayoutBlockType) => void;
}

const COMPONENT_TYPES: LayoutBlockType[] = ['header', 'sidebar', 'main', 'card', 'footer'];

function BlockThumbnail({ type }: { type: LayoutBlockType }) {
  const dims = DEFAULT_BLOCK_DIMENSIONS[type];
  const bgColor = DEFAULT_BACKGROUND_COLORS[type];
  const scale = 0.15;
  const scaledWidth = Math.max(40, dims.width * scale);
  const scaledHeight = Math.max(30, dims.height * scale);

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      style={{ flexShrink: 0 }}
    >
      <rect
        x={0}
        y={0}
        width={dims.width}
        height={dims.height}
        fill={bgColor}
        stroke="#9ca3af"
        strokeWidth={4}
        rx={8}
        ry={8}
      />
      {type === 'header' && (
        <>
          <rect x={20} y={20} width={120} height={20} fill="#9ca3af" rx={4} />
          <rect x={dims.width - 200} y={20} width={180} height={20} fill="#9ca3af" rx={4} />
        </>
      )}
      {type === 'sidebar' && (
        <>
          <rect x={20} y={30} width={160} height={16} fill="#9ca3af" rx={3} />
          <rect x={20} y={60} width={160} height={16} fill="#9ca3af" rx={3} />
          <rect x={20} y={90} width={160} height={16} fill="#9ca3af" rx={3} />
          <rect x={20} y={120} width={160} height={16} fill="#9ca3af" rx={3} />
        </>
      )}
      {type === 'main' && (
        <>
          <rect x={30} y={30} width={dims.width - 60} height={20} fill="#9ca3af" rx={4} />
          <rect x={30} y={70} width={dims.width - 60} height={12} fill="#d1d5db" rx={3} />
          <rect x={30} y={95} width={dims.width - 60} height={12} fill="#d1d5db" rx={3} />
          <rect x={30} y={120} width={(dims.width - 80) / 2} height={120} fill="#e5e7eb" rx={4} />
          <rect x={30 + (dims.width - 80) / 2 + 20} y={120} width={(dims.width - 80) / 2} height={120} fill="#e5e7eb" rx={4} />
        </>
      )}
      {type === 'card' && (
        <>
          <rect x={0} y={0} width={dims.width} height={dims.height * 0.5} fill="#fcd34d" rx={8} />
          <rect x={20} y={dims.height * 0.5 + 15} width={dims.width - 40} height={14} fill="#9ca3af" rx={3} />
          <rect x={20} y={dims.height * 0.5 + 40} width={dims.width - 80} height={10} fill="#d1d5db" rx={2} />
        </>
      )}
      {type === 'footer' && (
        <>
          <rect x={dims.width / 2 - 60} y={15} width={120} height={14} fill="#9ca3af" rx={3} />
          <rect x={dims.width / 2 - 80} y={35} width={160} height={10} fill="#d1d5db" rx={2} />
        </>
      )}
    </svg>
  );
}

function DraggableItem({ type, onDragStart }: { type: LayoutBlockType; onDragStart: (type: LayoutBlockType) => void }) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(type);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        backgroundColor: '#ffffff',
        borderRadius: 6,
        cursor: 'grab',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        userSelect: 'none',
        border: '1px solid #e5e7eb',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.cursor = 'grabbing';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.cursor = 'grab';
      }}
    >
      <BlockThumbnail type={type} />
      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
        {BLOCK_LABELS[type]}
      </span>
    </div>
  );
}

const ComponentPanel: React.FC<ComponentPanelProps> = ({ onDragStart }) => {
  return (
    <div
      style={{
        width: 220,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        flexShrink: 0,
        height: '100%',
        overflow: 'auto',
        transition: 'opacity 0.25s ease',
      }}
    >
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#2563eb',
          marginBottom: 4,
          padding: '4px 2px',
          borderBottom: '2px solid #2563eb',
          paddingBottom: 8,
        }}
      >
        组件面板
      </h2>
      {COMPONENT_TYPES.map((type) => (
        <DraggableItem key={type} type={type} onDragStart={onDragStart} />
      ))}
    </div>
  );
};

export default ComponentPanel;
