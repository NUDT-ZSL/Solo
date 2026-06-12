import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Edge, Node } from '@/types';
import { EDGE_COLOR, EDGE_WIDTH, ANIMATION_DURATION, PRIMARY_COLOR, DEFAULT_RELATION_LABELS } from '@/utils/constants';

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
  const arrowLength = 10;

  const arrowX = targetX - arrowLength * Math.cos(angle);
  const arrowY = targetY - arrowLength * Math.sin(angle);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(edge.id);
  }, [edge.id, onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLabelPicker(true);
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

  return (
    <g style={{ opacity: isFiltered ? 0.3 : 1 }}>
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION, ease: 'easeOut' }}
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
      />

      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION, ease: 'easeOut' }}
        d={pathD}
        fill="none"
        stroke={isSelected ? PRIMARY_COLOR : EDGE_COLOR}
        strokeWidth={EDGE_WIDTH}
        style={{ pointerEvents: 'none' }}
        markerEnd="url(#arrowhead)"
      />

      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={isSelected ? PRIMARY_COLOR : EDGE_COLOR}
          />
        </marker>
      </defs>

      <g
        onClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={midX - 30}
          y={midY - 12}
          width={60}
          height={24}
          rx={4}
          fill="#ffffff"
          stroke={isSelected ? PRIMARY_COLOR : '#e0e0e0'}
          strokeWidth={1}
          style={{ pointerEvents: 'all' }}
        />
        {isEditing ? (
          <foreignObject
            x={midX - 28}
            y={midY - 10}
            width={56}
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
              }}
            />
          </foreignObject>
        ) : (
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize={11}
            fill="#424242"
            style={{
              fontFamily: 'system-ui, sans-serif',
              pointerEvents: 'none',
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
            r={12}
            fill="#ffffff"
            stroke="#ef5350"
            strokeWidth={1}
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
          x={midX - 80}
          y={midY + 16}
          width={160}
          height={120}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {DEFAULT_RELATION_LABELS.map((label) => (
              <div
                key={label}
                onClick={() => handleLabelSelect(label)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'system-ui, sans-serif',
                  background: edge.label === label ? '#e3f2fd' : 'transparent',
                  color: edge.label === label ? '#1976d2' : '#424242',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = edge.label === label ? '#e3f2fd' : 'transparent';
                }}
              >
                {label}
              </div>
            ))}
            <div
              onClick={() => {