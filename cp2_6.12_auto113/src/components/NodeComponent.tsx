import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Node, NodeColor } from '@/types';
import { COLOR_MAP, COLOR_ORDER, MAX_DESCRIPTION_LENGTH, NODE_ANCHOR_RADIUS, ANIMATION_DURATION, PRIMARY_COLOR } from '@/utils/constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  isFiltered: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onAnchorDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onUpdateNode: (id: string, updates: Partial<Node>) => void;
  onChangeColor: (id: string, color: NodeColor) => void;
  onDelete: (id: string) => void;
}

export const NodeComponent: React.FC<NodeComponentProps> = React.memo(({
  node,
  isSelected,
  isFiltered,
  scale,
  onSelect,
  onDeselect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onAnchorDragStart,
  onUpdateNode,
  onChangeColor,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [editDescription, setEditDescription] = useState(node.description);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<SVGGElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect(node.id);
    setIsDragging(true);
    onDragStart(node.id, e);
  }, [isEditing, node.id, onSelect, onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || isEditing) return;
    e.stopPropagation();
    const svg = nodeRef.current?.closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    onDragMove(node.id, x, y);
  }, [isDragging, isEditing, node.id, scale, onDragMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd();
    }
  }, [isDragging, onDragEnd]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel(node.label);
    setEditDescription(node.description);
    setIsEditing(true);
  }, [node.label, node.description]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmedLabel = editLabel.trim() || '新节点';
    const trimmedDescription = editDescription.slice(0, MAX_DESCRIPTION_LENGTH);
    if (trimmedLabel !== node.label || trimmedDescription !== node.description) {
      onUpdateNode(node.id, {
        label: trimmedLabel,
        description: trimmedDescription,
      });
    }
  }, [editLabel, editDescription, node.id, node.label, node.description, onUpdateNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditLabel(node.label);
      setEditDescription(node.description);
    }
  }, [handleBlur, node.label, node.description]);

  const handleAnchorMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeselect();
    onAnchorDragStart(node.id, e);
  }, [node.id, onDeselect, onAnchorDragStart]);

  const handleColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColorPicker((prev) => !prev);
  }, []);

  const handleColorSelect = useCallback((color: NodeColor) => {
    onChangeColor(node.id, color);
    setShowColorPicker(false);
  }, [node.id, onChangeColor]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(node.id);
  }, [node.id, onDelete]);

  const nodeColor = COLOR_MAP[node.color];
  const effectiveWidth = node.width;
  const effectiveHeight = node.height;

  return (
    <g
      ref={nodeRef}
      transform={`translate(${node.x - effectiveWidth / 2}, ${node.y - effectiveHeight / 2})`}
      style={{
        opacity: isFiltered ? 0.3 : 1,
        cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'all',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {isDragging && (
        <rect
          x={4}
          y={4}
          width={effectiveWidth}
          height={effectiveHeight}
          rx={12}
          fill="rgba(0, 0, 0, 0.2)"
          filter="blur(4px)"
        />
      )}

      <motion.rect
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION, type: 'spring', bounce: 0.4 }}
        width={effectiveWidth}
        height={effectiveHeight}
        rx={12}
        fill="#ffffff"
        stroke={isSelected ? PRIMARY_COLOR : '#e0e0e0'}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray={isSelected ? '4 4' : undefined}
        style={{
          filter: isDragging ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      />

      <g
        style={{ cursor: 'pointer' }}
        onClick={handleColorClick}
      >
        <rect
          x={8}
          y={8}
          width={16}
          height={16}
          rx={4}
          fill={nodeColor}
          stroke="#ffffff"
          strokeWidth={2}
        />
        <polygon
          points={`${8 + 12},${8 + 10} ${8 + 16},${8 + 16} ${8 + 8},${8 + 16}`}
          fill="#ffffff"
          opacity={0.8}
        />
      </g>

      <AnimatePresence>
        {showColorPicker && (
          <foreignObject
            x={0}
            y={32}
            width={140}
            height={80}
          >
            <div
              ref={colorPickerRef}
              style={{
                background: '#ffffff',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {COLOR_ORDER.map((color) => (
                <motion.div
                  key={color}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleColorSelect(color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: COLOR_MAP[color],
                    cursor: 'pointer',
                    border: node.color === color ? '2px solid #1976d2' : '2px solid transparent',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          </foreignObject>
        )}
      </AnimatePresence>

      {isEditing ? (
        <foreignObject
          x={12}
          y={8}
          width={effectiveWidth - 24}
          height={effectiveHeight - 16}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <input
              ref={labelInputRef}
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: 0,
                fontFamily: 'system-ui, sans-serif',
              }}
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="描述..."
              style={{
                width: '100%',
                fontSize: 12,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: 0,
                fontFamily: 'system-ui, sans-serif',
                color: '#666',
              }}
            />
          </div>
        </foreignObject>
      ) : (
        <>
          <text
            x={effectiveWidth / 2}
            y={28}
            textAnchor="middle"
            fontSize={14}
            fontWeight={600}
            fill="#212121"
            style={{
              fontFamily: 'system-ui, sans-serif',
              pointerEvents: 'none',
            }}
          >
            {node.label.length > 8 ? node.label.slice(0, 8) + '...' : node.label}
          </text>
          {node.description && (
            <text
              x={effectiveWidth / 2}
              y={46}
              textAnchor="middle"
              fontSize={11}
              fill="#757575"
              style={{
                fontFamily: 'system-ui, sans-serif',
                pointerEvents: 'none',
              }}
            >
              {node.description.length > 10 ? node.description.slice(0, 10) + '...' : node.description}
            </text>
          )}
        </>
      )}

      {isSelected && !isEditing && (
        <g
          onClick={handleDelete}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={effectiveWidth - 8}
            cy={8}
            r={10}
            fill="#ef5350"
          />
          <text
            x={effectiveWidth - 8}
            y={12}
            textAnchor="middle"
            fontSize={14}
            fill="#ffffff"
            fontWeight="bold"
            style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
          >
            ×
          </text>
        </g>
      )}

      <circle
        cx={effectiveWidth / 2}
        cy={effectiveHeight}
        r={NODE_ANCHOR_RADIUS}
        fill={PRIMARY_COLOR}
        stroke="#ffffff"
        strokeWidth={2}
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleAnchorMouseDown}
      />
    </g>
  );
});

NodeComponent.displayName = 'NodeComponent';
