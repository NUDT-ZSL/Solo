import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeColor } from '@/types';
import { COLOR_MAP, COLOR_ORDER, COLOR_LABELS } from '@/utils/constants';

interface ColorLegendProps {
  activeFilter: NodeColor | null;
  onFilterChange: (color: NodeColor | null) => void;
  nodeCountByColor: Record<NodeColor, number>;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  activeFilter,
  onFilterChange,
  nodeCountByColor,
}) => {
  const totalNodes = Object.values(nodeCountByColor).reduce((sum, count) => sum + count, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        style={{
          position: 'absolute',
          right: 16,
          top: 64,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid #e0e0e0',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 100,
          minWidth: 180,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#616161',
            marginBottom: 8,
            padding: '0 4px 8px',
            borderBottom: '1px solid #eeeeee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>颜色筛选</span>
          <span
            style={{
              fontSize: 10,
              color: '#9e9e9e',
              fontWeight: 400,
            }}
          >
            共 {totalNodes} 节点
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <LegendItem
            color={null}
            label="全部显示"
            count={totalNodes}
            isActive={activeFilter === null}
            onClick={() => onFilterChange(null)}
          />
          {COLOR_ORDER.map((color) => {
            const count = nodeCountByColor[color] || 0;
            return (
              <LegendItem
                key={color}
                color={color}
                label={COLOR_LABELS[color]}
                count={count}
                isActive={activeFilter === color}
                onClick={() => onFilterChange(activeFilter === color ? null : color)}
              />
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface LegendItemProps {
  color: NodeColor | null;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

const LegendItem: React.FC<LegendItemProps> = ({
  color,
  label,
  count,
  isActive,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      transition: 'all 0.15s',
      background: isActive ? '#e3f2fd' : 'transparent',
      opacity: count === 0 ? 0.4 : 1,
      pointerEvents: count === 0 && !isActive ? 'none' : 'auto',
    }}
    onMouseEnter={(e) => {
      if (count > 0 && !isActive) {
        e.currentTarget.style.background = '#f5f5f5';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = isActive ? '#e3f2fd' : 'transparent';
    }}
  >
    {color === null ? (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #ef5350 25%, #ff9800 25%, #ff9800 50%, #4caf50 50%, #4caf50 75%, #1976d2 75%)',
          border: isActive ? '2px solid #1976d2' : '2px solid transparent',
          boxSizing: 'border-box',
        }}
      />
    ) : (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: COLOR_MAP[color],
          border: isActive ? '2px solid #1976d2' : '2px solid #ffffff',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    )}
    <span
      style={{
        fontSize: 13,
        color: isActive ? '#1976d2' : '#424242',
        fontWeight: isActive ? 600 : 400,
        flex: 1,
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 11,
        color: '#9e9e9e',
        background: isActive ? '#bbdefb' : '#f5f5f5',
        padding: '1px 6px',
        borderRadius: 8,
        fontWeight: 500,
      }}
    >
      {count}
    </span>
  </div>
);
