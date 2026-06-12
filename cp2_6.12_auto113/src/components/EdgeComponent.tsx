import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Edge, Node } from '@/types';
import {
  EDGE_COLOR,
  EDGE_WIDTH,
  ANIMATION_DURATION,
  PRIMARY_COLOR,
  DEFAULT_RELATION_LABELS,
} from '@/utils/constants';

interface EdgeComponentProps {
  edge: Edge;
  sourceNode: Node | undefined;
  targetNode: Node | undefined;
  isSelected: boolean;
  isFiltered: boolean;
  onSelect: (id: string) => void;
  onUpdateEdge: (id: string, updates: Partial<Edge>) => void;
  onDelete: (id: string) => void;
}

export const EdgeComponent: React.FC<EdgeComponentProps> = React.memo(({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  isFiltered,
  onSelect,
  onUpdateEdge,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(edge.label);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  if (!sourceNode || !targetNode) return null;

  const sourceX = sourceNode.x;
  const sourceY = sourceNode.y + sourceNode.height / 2;
  const targetX = targetNode.x;
  const targetY = targetNode.y - targetNode.height / 2;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 14;

  const arrowX = targetX - arrowLength * Math.cos(angle);
  const arrowY = targetY - arrowLength * Math.sin(angle);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(edge.id);
  }, [edge.id, onSelect]);

  const handleLabelDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel(edge.label);
    setIsEditing(true);
    setShowLabelPicker(false);
  }, [edge.label]);

  const handleShowPicker = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLabelPicker((prev) => !prev);
  }, []);

  const handleLabelSelect = useCallback((label: string) => {
    onUpdateEdge(edge.id, { label });
    setShowLabelPicker(false);
    setIsEditing(false);
  }, [edge.id, onUpdateEdge]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editLabel.trim() && editLabel !== edge.label) {
      onUpdateEdge(edge.id, { label: editLabel.trim() });
    }
  }, [editLabel, edge.id, edge.label, onUpdateEdge]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditLabel(edge.label);
    }
  }, [handleBlur, edge.label]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(edge.id);
  }, [edge.id, onDelete]);

  const pathD = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const strokeColor = isSelected ? PRIMARY_COLOR : EDGE_COLOR;

  return (
    <g style={{ opacity: isFiltered ? 0.3 : 1 }}>
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION, ease: 'easeOut' }}
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />

      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION, ease: 'easeOut' }}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={EDGE_WIDTH}
        style={{ pointerEvents: 'none' }}
        markerEnd={`url(#arrowhead-${edge.id})`}
      />

      <defs>
        <marker
          id={`arrowhead-${edge.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={strokeColor}
          />
        </marker>
      </defs>

      <g
        onDoubleClick={handleLabelDoubleClick}
        onClick={handleShowPicker}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={midX - 32}
          y={midY - 12}
          width={64}
          height={24}
          rx={4}
          fill="#ffffff"
          stroke={isSelected ? PRIMARY_COLOR : '#e0e0e0'}
          strokeWidth={isSelected ? 2 : 1}
          style={{ pointerEvents: 'all' }}
        />
        {isEditing ? (
          <foreignObject
            x={midX - 30}
            y={midY - 10}
            width={60}
            height={20}
          >
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12,
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
                padding: 0,
                boxSizing: 'border-box',
              }}
            />
          </foreignObject>
        ) : (
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize={12}
            fill="#424242"
            style={{
              fontFamily: 'system-ui, sans-serif',
              pointerEvents: 'none',
              fontWeight: 500,
            }}
          >
            {edge.label}
          </text>
        )}
      </g>

      {isSelected && !isEditing && !showLabelPicker && (
        <g onClick={handleDelete} style={{ cursor: 'pointer' }}>
          <circle
            cx={arrowX}
            cy={arrowY}
            r={13}
            fill="#ffffff"
            stroke="#ef5350"
            strokeWidth={1.5}
          />
          <text
            x={arrowX}
            y={arrowY + 4}
            textAnchor="middle"
            fontSize={14}
            fill="#ef5350"
            fontWeight="bold"
            style={{ fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' }}
          >
            ×
          </text>
        </g>
      )}

      {showLabelPicker && (
        <foreignObject
          x={midX - 90}
          y={midY + 16}
          width={180}
          height={180}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              border: '1px solid #e0e0e0',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 11,
                color: '#9e9e9e',
                padding: '4px 8px',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              选择关系标签
            </div>
            {DEFAULT_RELATION_LABELS.map((label) => (
              <div
                key={label}
                onClick={() => handleLabelSelect(label)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'system-ui, sans-serif',
                  background: edge.label === label ? '#e3f2fd' : 'transparent',
                  color: edge.label === label ? '#1976d2' : '#424242',
                  fontWeight: edge.label === label ? 600 : 400,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (edge.label !== label) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = edge.label === label ? '#e3f2fd' : 'transparent';
                }}
              >
                {label}
              </div>
            ))}
            <div
              style={{
                height: 1,
                background: '#eeeeee',
                margin: '4px 0',
              }}
            />
            <div
              onClick={() => {
                setEditLabel(edge.label);
                setIsEditing(true);
                setShowLabelPicker(false);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'system-ui, sans-serif',
                color: '#757575',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ✏️ 自定义...
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
});

EdgeComponent.displayName = 'EdgeComponent';
