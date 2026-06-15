import { forwardRef, useState, useRef, useCallback, useEffect, memo } from 'react';
import { Trash2 } from 'lucide-react';
import {
  LayoutBlock,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  MIN_BLOCK_SIZE,
} from './types';
import './Canvas.css';

const snapToGrid = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

interface LayoutBlockItemProps {
  block: LayoutBlock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LayoutBlock>) => void;
  onDelete: (id: string) => void;
  canvasRect: DOMRect | null;
}

const LayoutBlockItem = memo(function LayoutBlockItem({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canvasRect,
}: LayoutBlockItemProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const resizeStart = useRef<{
    x: number;
    y: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
      e.stopPropagation();
      onSelect(block.id);
      if (!canvasRect) return;

      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        startX: block.position.x,
        startY: block.position.y,
      };
    },
    [block.id, block.position.x, block.position.y, canvasRect, onSelect]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(block.id);
      if (!canvasRect) return;

      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        startWidth: block.size.width,
        startHeight: block.size.height,
      };
    },
    [block.id, block.size.width, block.size.height, canvasRect, onSelect]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart.current || !canvasRect) return;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        if (!dragStart.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;

        let newX = dragStart.current.startX + dx;
        let newY = dragStart.current.startY + dy;

        newX = clamp(snapToGrid(newX), 0, CANVAS_WIDTH - block.size.width);
        newY = clamp(snapToGrid(newY), 0, CANVAS_HEIGHT - block.size.height);

        onUpdate(block.id, { position: { x: newX, y: newY } });
        rafIdRef.current = null;
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStart.current = null;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isDragging, block.id, block.size.width, block.size.height, canvasRect, onUpdate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeStart.current || !canvasRect) return;

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        if (!resizeStart.current) return;
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;

        let newWidth = resizeStart.current.startWidth + dx;
        let newHeight = resizeStart.current.startHeight + dy;

        newWidth = clamp(
          snapToGrid(newWidth),
          MIN_BLOCK_SIZE,
          CANVAS_WIDTH - block.position.x
        );
        newHeight = clamp(
          snapToGrid(newHeight),
          MIN_BLOCK_SIZE,
          CANVAS_HEIGHT - block.position.y
        );

        onUpdate(block.id, { size: { width: newWidth, height: newHeight } });
        rafIdRef.current = null;
      });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        resizeStart.current = null;
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isResizing, block.id, block.position.x, block.position.y, canvasRect, onUpdate]);

  const blockStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: block.size.width,
    height: block.size.height,
    transform: `translate(${block.position.x}px, ${block.position.y}px)`,
    backgroundColor: block.fillColor,
    border: isSelected ? '2px solid #3b82f6' : `1px solid ${block.borderColor}`,
    borderRadius: block.type === 'article-card' ? '16px' : '4px',
    boxShadow:
      block.type === 'article-card'
        ? isSelected
          ? '0 4px 20px rgba(59, 130, 246, 0.25)'
          : '0 4px 12px rgba(0, 0, 0, 0.08)'
        : 'none',
    zIndex: block.zIndex,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging || isResizing ? 'none' : 'all 0.3s ease-in-out',
    userSelect: 'none',
  };

  return (
    <div
      ref={blockRef}
      className={`layout-block ${isDragging ? 'dragging' : ''}`}
      style={blockStyle}
      onMouseDown={handleMouseDown}
    >
      {block.type === 'article-card' && (
        <div className="block-article-content">
          <div className="article-image-placeholder" />
          <div className="article-title-line" />
          <div className="article-desc-line" />
          <div className="article-meta-line" />
        </div>
      )}
      {block.type === 'sidebar' && (
        <div className="block-sidebar-content">
          <div className="sidebar-avatar" />
          <div className="sidebar-name" />
          <div className="sidebar-bio" />
          <div className="sidebar-links">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sidebar-link-item" />
            ))}
          </div>
        </div>
      )}
      {block.type === 'footer' && (
        <div className="block-footer-content">
          <div className="footer-logo" />
          <div className="footer-links">
            {[1, 2, 3].map((i) => (
              <div key={i} className="footer-link" />
            ))}
          </div>
          <div className="footer-copyright" />
        </div>
      )}

      {isSelected && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
          title="拖拽调整大小"
        />
      )}
    </div>
  );
});

interface CanvasProps {
  blocks: LayoutBlock[];
  selectedBlockId: string | null;
  onBlockUpdate: (id: string, updates: Partial<LayoutBlock>) => void;
  onBlockSelect: (id: string | null) => void;
  onBlockDelete: (id: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(function Canvas(
  { blocks, selectedBlockId, onBlockUpdate, onBlockSelect, onBlockDelete, onDrop, onDragOver },
  ref
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (innerRef.current) {
        setCanvasRect(innerRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === innerRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
        onBlockSelect(null);
      }
    },
    [onBlockSelect]
  );

  const handleTrashDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTrashHovered(true);
  }, []);

  const handleTrashDragLeave = useCallback(() => {
    setIsTrashHovered(false);
  }, []);

  const handleTrashDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsTrashHovered(false);
    },
    []
  );

  const handleBlockMouseDown = useCallback(
    (id: string) => {
      setDraggingBlockId(id);
    },
    []
  );

  useEffect(() => {
    const handleMouseUp = () => {
      if (draggingBlockId && isTrashHovered) {
        onBlockDelete(draggingBlockId);
      }
      setDraggingBlockId(null);
    };

    const checkTrashHover = (e: MouseEvent) => {
      if (!draggingBlockId || !innerRef.current) return;
      const canvasRect2 = innerRef.current.getBoundingClientRect();
      const trashX = canvasRect2.right - 40 - 24;
      const trashY = canvasRect2.bottom - 40 - 24;
      const hovered =
        e.clientX >= trashX &&
        e.clientX <= trashX + 48 &&
        e.clientY >= trashY &&
        e.clientY <= trashY + 48;
      setIsTrashHovered(hovered);
    };

    if (draggingBlockId) {
      window.addEventListener('mousemove', checkTrashHover);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', checkTrashHover);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBlockId, isTrashHovered, onBlockDelete]);

  const handleSelect = useCallback(
    (id: string) => {
      handleBlockMouseDown(id);
      onBlockSelect(id);
    },
    [onBlockSelect]
  );

  return (
    <div
      className="canvas-wrapper"
      onClick={handleCanvasClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement>).current = el;
        }}
        className="canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <div className="canvas-grid" />

        {blocks.map((block) => (
          <LayoutBlockItem
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={handleSelect}
            onUpdate={onBlockUpdate}
            onDelete={onBlockDelete}
            canvasRect={canvasRect}
          />
        ))}

        <div
          className={`trash-bin ${isTrashHovered ? 'hovered' : ''}`}
          onDragOver={handleTrashDragOver}
          onDragLeave={handleTrashDragLeave}
          onDrop={handleTrashDrop}
        >
          <Trash2 size={24} color={isTrashHovered ? '#ffffff' : '#ef4444'} />
        </div>
      </div>
    </div>
  );
});

export default Canvas;
