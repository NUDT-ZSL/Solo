import React, { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LevelElement, ElementType, GroundElement, WallElement, EnemyElement, CoinElement } from './types';

interface EditorCanvasProps {
  elements: LevelElement[];
  onElementsChange: (elements: LevelElement[]) => void;
  scale: number;
}

const GRID_SIZE = 32;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

const getDefaultElement = (type: ElementType, x: number, y: number): LevelElement => {
  const id = uuidv4();
  switch (type) {
    case 'ground':
      return { id, type: 'ground', x, y, width: 64, height: 32 };
    case 'wall':
      return { id, type: 'wall', x, y, width: 32, height: 64 };
    case 'enemy':
      return { id, type: 'enemy', x, y, patrolRange: 128 };
    case 'coin':
      return { id, type: 'coin', x, y, value: 10 };
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
};

const EditorCanvas: React.FC<EditorCanvasProps> = ({ elements, onElementsChange, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingType, setDraggingType] = useState<ElementType | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<LevelElement | null>(null);
  const animationFrameRef = useRef<number>();

  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  const getMousePos = useCallback((e: React.MouseEvent | DragEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: LevelElement, isSelected: boolean, opacity = 1) => {
    ctx.globalAlpha = opacity;

    switch (element.type) {
      case 'ground': {
        const gradient = ctx.createLinearGradient(element.x, element.y, element.x, element.y + element.height);
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(element.x, element.y, element.width, element.height, 4);
        ctx.fill();
        break;
      }
      case 'wall': {
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.roundRect(element.x, element.y, element.width, element.height, 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        for (let row = 0; row < element.height / 16; row++) {
          const y = element.y + row * 16;
          const offset = row % 2 === 0 ? 0 : 16;
          for (let col = 0; col < element.width / 16; col++) {
            const x = element.x + col * 16 + offset;
            ctx.strokeRect(x, y, 16, 16);
          }
        }
        break;
      }
      case 'enemy': {
        const cx = element.x + 8;
        const cy = element.y + 8;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - element.patrolRange / 2, cy);
        ctx.lineTo(cx + element.patrolRange / 2, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'coin': {
        ctx.fillStyle = '#fbbf24';
        drawStar(ctx, element.x + 8, element.y + 8, 5, 8, 4);
        break;
      }
    }

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      let bx = element.x, by = element.y, bw = 32, bh = 32;
      if (element.type === 'ground' || element.type === 'wall') {
        bx = element.x;
        by = element.y;
        bw = element.width;
        bh = element.height;
      }
      ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    elements.forEach((element) => {
      drawElement(ctx, element, element.id === selectedId);
    });

    if (draggingType && dragPosition) {
      const tempElement = getDefaultElement(
        draggingType,
        snapToGrid(dragPosition.x - 16),
        snapToGrid(dragPosition.y - 16)
      );
      drawElement(ctx, tempElement, false, 0.6);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [elements, selectedId, draggingType, dragPosition, drawElement, snapToGrid]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  const findElementAt = useCallback((x: number, y: number): LevelElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      let ex = el.x, ey = el.y, ew = 32, eh = 32;
      if (el.type === 'ground' || el.type === 'wall') {
        ex = el.x;
        ey = el.y;
        ew = el.width;
        eh = el.height;
      }
      if (x >= ex && x <= ex + ew && y >= ey && y <= ey + eh) {
        return el;
      }
    }
    return null;
  }, [elements]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const pos = getMousePos(e);
    setDragPosition(pos);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.types.includes('elementType') ? 
      e.dataTransfer.getData('elementType') as ElementType : null;
    if (type) {
      setDraggingType(type);
    }
  };

  const handleDragLeave = () => {
    setDraggingType(null);
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('elementType') as ElementType;
    if (!type) return;

    const pos = getMousePos(e);
    const x = snapToGrid(pos.x - 16);
    const y = snapToGrid(pos.y - 16);

    const boundedX = Math.max(0, Math.min(CANVAS_WIDTH - 64, x));
    const boundedY = Math.max(0, Math.min(CANVAS_HEIGHT - 64, y));

    const newElement = getDefaultElement(type, boundedX, boundedY);
    onElementsChange([...elements, newElement]);

    setDraggingType(null);
    setDragPosition(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const clicked = findElementAt(pos.x, pos.y);
    setSelectedId(clicked?.id || null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const clicked = findElementAt(pos.x, pos.y);
    if (clicked) {
      setEditingElement(clicked);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        onElementsChange(elements.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setEditingElement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, onElementsChange]);

  const handleEditChange = (field: string, value: number) => {
    if (!editingElement) return;

    const updated = elements.map(el => {
      if (el.id !== editingElement.id) return el;
      const newEl = { ...el };
      if (newEl.type === 'ground' && field === 'width') {
        newEl.width = value as number;
      }
      if (newEl.type === 'wall' && field === 'height') {
        newEl.height = value as number;
      }
      if (newEl.type === 'enemy' && field === 'patrolRange') {
        newEl.patrolRange = value as number;
      }
      if (newEl.type === 'coin' && field === 'value') {
        newEl.value = value as 10 | 30 | 50;
      }
      return newEl;
    });

    onElementsChange(updated);
    setEditingElement(updated.find(el => el.id === editingElement.id) || null);
  };

  const handleDeleteSelected = () => {
    if (!editingElement) return;
    onElementsChange(elements.filter(el => el.id !== editingElement.id));
    setEditingElement(null);
    setSelectedId(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          display: 'block',
          cursor: draggingType ? 'copy' : 'default',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        }}
      />

      {editingElement && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setEditingElement(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 280,
              background: '#1e1e22',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <h4
              style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              编辑元素
            </h4>

            {editingElement.type === 'ground' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  宽度 ({(editingElement as GroundElement).width / 64} 格)
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={(editingElement as GroundElement).width / 64}
                  onChange={(e) => handleEditChange('width', parseInt(e.target.value) * 64)}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>1格</span>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>6格</span>
                </div>
              </div>
            )}

            {editingElement.type === 'wall' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  高度 ({(editingElement as WallElement).height / 32} 格)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={(editingElement as WallElement).height / 32}
                  onChange={(e) => handleEditChange('height', parseInt(e.target.value) * 32)}
                  style={{ width: '100%', accentColor: '#3b82f6' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>1格</span>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>5格</span>
                </div>
              </div>
            )}

            {editingElement.type === 'enemy' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  巡逻范围 ({(editingElement as EnemyElement).patrolRange}px)
                </label>
                <input
                  type="range"
                  min="64"
                  max="256"
                  step="32"
                  value={(editingElement as EnemyElement).patrolRange}
                  onChange={(e) => handleEditChange('patrolRange', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#ef4444' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>64px</span>
                  <span style={{ color: '#6b7280', fontSize: 11 }}>256px</span>
                </div>
              </div>
            )}

            {editingElement.type === 'coin' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8, display: 'block' }}>
                  金币价值
                </label>
                <select
                  value={(editingElement as CoinElement).value}
                  onChange={(e) => handleEditChange('value', parseInt(e.target.value) as 10 | 30 | 50)}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#2a2a2e',
                    color: '#ffffff',
                    border: '1px solid #3a3a3e',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <option value={10}>10 分</option>
                  <option value={30}>30 分</option>
                  <option value={50}>50 分</option>
                </select>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                onClick={handleDeleteSelected}
                style={{
                  flex: 1,
                  padding: 10,
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                删除
              </button>
              <button
                onClick={() => setEditingElement(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorCanvas;
