import { useRef, useState, useCallback, useEffect } from 'react';
import type { Block, LayoutConfig } from '../types';
import { BLOCK_BORDER_RADIUS } from '../utils/constants';

interface CanvasProps {
  blocks: Block[];
  layoutConfig: LayoutConfig;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
}

interface DragState {
  blockId: string;
  startX: number;
  startY: number;
  blockStartX: number;
  blockStartY: number;
}

export default function Canvas({
  blocks,
  layoutConfig,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<DragState | null>(null);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        onSelectBlock(null);
      }
    },
    [onSelectBlock]
  );

  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent, block: Block) => {
      e.stopPropagation();
      onSelectBlock(block.id);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragStateRef.current = {
        blockId: block.id,
        startX: e.clientX,
        startY: e.clientY,
        blockStartX: block.x,
        blockStartY: block.y,
      };
      setDraggingId(block.id);
    },
    [onSelectBlock]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      setDragOffset({ x: dx, y: dy });

      const newX = Math.max(0, Math.min(rect.width - 50, dragState.blockStartX + dx));
      const newY = Math.max(0, Math.min(rect.height - 50, dragState.blockStartY + dy));

      onUpdateBlock(dragState.blockId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setDraggingId(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onUpdateBlock]);

  const getContainerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: layoutConfig.display,
      position: 'relative',
      transition: 'all 0.3s ease-in-out',
    };

    if (layoutConfig.display === 'flex') {
      return {
        ...base,
        flexDirection: layoutConfig.flexDirection,
        justifyContent: layoutConfig.justifyContent,
        alignItems: layoutConfig.alignItems,
        gap: '20px',
      };
    }

    if (layoutConfig.display === 'grid') {
      return {
        ...base,
        gridTemplateColumns: layoutConfig.gridTemplateColumns,
        gridTemplateRows: layoutConfig.gridTemplateRows,
        gap: '20px',
      };
    }

    return base;
  };

  const getBlockStyle = (block: Block, index: number): React.CSSProperties => {
    const isDragging = draggingId === block.id;
    const isSelected = selectedBlockId === block.id;

    const shadowOffset = isDragging
      ? `${Math.min(12, 4 + Math.abs(dragOffset.x) / 10)}px ${Math.min(12, 4 + Math.abs(dragOffset.y) / 10)}px`
      : '4px 4px';

    const baseStyle: React.CSSProperties = {
      width: `${block.width}px`,
      height: `${block.height}px`,
      backgroundColor: block.backgroundColor,
      borderRadius: `${BLOCK_BORDER_RADIUS}px`,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
      boxShadow: `${shadowOffset} 12px rgba(0, 0, 0, 0.15)`,
      border: isSelected ? '2px solid #6366F1' : '2px solid transparent',
      boxSizing: 'border-box',
      userSelect: 'none',
    };

    const hasCustomPosition = block.x !== 0 || block.y !== 0;
    if (hasCustomPosition) {
      return {
        ...baseStyle,
        position: 'absolute',
        left: `${block.x}px`,
        top: `${block.y}px`,
      };
    }

    if (index > 0 && layoutConfig.display === 'block') {
      return { ...baseStyle, marginTop: '20px' };
    }

    if (layoutConfig.display === 'inline-block') {
      return { ...baseStyle, marginRight: '20px', display: 'inline-block' };
    }

    return baseStyle;
  };

  return (
    <div
      ref={canvasRef}
      className="canvas-wrapper"
      onMouseDown={handleCanvasMouseDown}
    >
      <div className="canvas-grid" />
      <div className="canvas-container" style={getContainerStyle()}>
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="canvas-block"
            style={getBlockStyle(block, index)}
            onMouseDown={(e) => handleBlockMouseDown(e, block)}
          />
        ))}
      </div>
    </div>
  );
}
