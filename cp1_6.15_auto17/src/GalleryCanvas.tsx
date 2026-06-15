import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Artwork, PlacedItem, DragPreview, AnimatingItem } from './types';

interface GalleryCanvasProps {
  placedItems: PlacedItem[];
  onItemsChange: (items: PlacedItem[]) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onPreview3D: () => void;
  artworks: Artwork[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const ELASTIC_DURATION = 300;

const GalleryCanvas: React.FC<GalleryCanvasProps> = ({
  placedItems,
  onItemsChange,
  selectedItemId,
  onSelectItem,
  onPreview3D,
  artworks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [animatingItems, setAnimatingItems] = useState<AnimatingItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const artworkMap = useMemo(() => {
    const map = new Map<string, Artwork>();
    artworks.forEach(a => map.set(a.id, a));
    return map;
  }, [artworks]);

  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  const easeOutElastic = useCallback((t: number): number => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }, []);

  const drawArtwork = useCallback((
    ctx: CanvasRenderingContext2D,
    artwork: Artwork,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    isSelected: boolean,
    alpha: number = 1
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const width = artwork.width;
    const height = artwork.height;
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.fillStyle = artwork.color;
    ctx.strokeStyle = isSelected ? '#5C4F44' : '#8B7D72';
    ctx.lineWidth = isSelected ? 3 : 2;

    if (artwork.type === 'painting') {
      ctx.fillRect(-halfW, -halfH, width, height);
      ctx.strokeRect(-halfW, -halfH, width, height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(-halfW + 4, -halfH + 4, width - 8, height - 8);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, 0, halfW - 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(139, 125, 114, 0.15)';
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

    ctx.strokeStyle = 'rgba(139, 125, 114, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawGrid(ctx);

    const now = performance.now();
    const activeAnimations: AnimatingItem[] = [];

    placedItems.forEach(item => {
      const artwork = artworkMap.get(item.artworkId);
      if (!artwork) return;

      let displayX = item.x;
      let displayY = item.y;
      let animAlpha = 1;

      const animation = animatingItems.find(a => a.id === item.id);
      if (animation) {
        const progress = Math.min(1, (now - animation.startTime) / animation.duration);
        const easedProgress = easeOutElastic(progress);
        
        displayX = animation.fromX + (animation.toX - animation.fromX) * easedProgress;
        displayY = animation.fromY + (animation.toY - animation.fromY) * easedProgress;
        animAlpha = 0.5 + 0.5 * easedProgress;

        if (progress < 1) {
          activeAnimations.push(animation);
        }
      }

      drawArtwork(
        ctx,
        artwork,
        displayX,
        displayY,
        item.rotation,
        item.scale,
        selectedItemId === item.id,
        animAlpha
      );
    });

    if (animatingItems.length !== activeAnimations.length) {
      setAnimatingItems(activeAnimations);
    }

    if (dragPreview && dragPreview.visible) {
      const artwork = dragPreview.artwork;
      drawArtwork(
        ctx,
        artwork,
        dragPreview.x,
        dragPreview.y,
        0,
        1,
        false,
        0.5
      );

      const snapX = snapToGrid(dragPreview.x);
      const snapY = snapToGrid(dragPreview.y);
      ctx.strokeStyle = 'rgba(92, 79, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(snapX - 10, snapY);
      ctx.lineTo(snapX + 10, snapY);
      ctx.moveTo(snapX, snapY - 10);
      ctx.lineTo(snapX, snapY + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (activeAnimations.length > 0 || dragPreview) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
  }, [placedItems, dragPreview, animatingItems, selectedItemId, artworkMap, drawGrid, drawArtwork, easeOutElastic, snapToGrid]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const artwork = JSON.parse(e.dataTransfer.getData('application/json'));
      setDragPreview({
        artwork,
        x,
        y,
        visible: true
      });
    } catch {
      // 忽略解析错误
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setDragPreview(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDragPreview(null);

    try {
      const artwork: Artwork = JSON.parse(e.dataTransfer.getData('application/json'));
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = snapToGrid(e.clientX - rect.left);
      const y = snapToGrid(e.clientY - rect.top);

      const clampedX = Math.max(artwork.width / 2, Math.min(CANVAS_WIDTH - artwork.width / 2, x));
      const clampedY = Math.max(artwork.height / 2, Math.min(CANVAS_HEIGHT - artwork.height / 2, y));

      const newItem: PlacedItem = {
        id: uuidv4(),
        artworkId: artwork.id,
        x: clampedX,
        y: clampedY,
        rotation: 0,
        scale: 1
      };

      setAnimatingItems(prev => [...prev, {
        id: newItem.id,
        fromX: x,
        fromY: y - 50,
        toX: clampedX,
        toY: clampedY,
        startTime: performance.now(),
        duration: ELASTIC_DURATION
      }]);

      onItemsChange([...placedItems, newItem]);
      onSelectItem(newItem.id);
    } catch {
      // 忽略解析错误
    }
  }, [placedItems, onItemsChange, onSelectItem, snapToGrid]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || draggingItem) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = placedItems.length - 1; i >= 0; i--) {
      const item = placedItems[i];
      const artwork = artworkMap.get(item.artworkId);
      if (!artwork) continue;

      const halfW = (artwork.width * item.scale) / 2;
      const halfH = (artwork.height * item.scale) / 2;

      const dx = x - item.x;
      const dy = y - item.y;
      const angle = -(item.rotation * Math.PI) / 180;
      const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

      if (artwork.type === 'painting') {
        if (Math.abs(rotatedX) <= halfW && Math.abs(rotatedY) <= halfH) {
          onSelectItem(item.id);
          return;
        }
      } else {
        if (Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY) <= halfW) {
          onSelectItem(item.id);
          return;
        }
      }
    }

    onSelectItem(null);
  }, [placedItems, artworkMap, onSelectItem, draggingItem]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedItemId) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const selectedItem = placedItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    const artwork = artworkMap.get(selectedItem.artworkId);
    if (!artwork) return;

    const halfW = (artwork.width * selectedItem.scale) / 2;
    const halfH = (artwork.height * selectedItem.scale) / 2;

    const dx = x - selectedItem.x;
    const dy = y - selectedItem.y;
    const angle = -(selectedItem.rotation * Math.PI) / 180;
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

    let isHit = false;
    if (artwork.type === 'painting') {
      isHit = Math.abs(rotatedX) <= halfW && Math.abs(rotatedY) <= halfH;
    } else {
      isHit = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY) <= halfW;
    }

    if (isHit) {
      setDraggingItem(selectedItemId);
      dragOffsetRef.current = { x: dx, y: dy };
      e.preventDefault();
    }
  }, [selectedItemId, placedItems, artworkMap]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingItem) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffsetRef.current.x;
    const y = e.clientY - rect.top - dragOffsetRef.current.y;

    const selectedItem = placedItems.find(item => item.id === draggingItem);
    if (!selectedItem) return;

    const artwork = artworkMap.get(selectedItem.artworkId);
    if (!artwork) return;

    const halfW = (artwork.width * selectedItem.scale) / 2;
    const halfH = (artwork.height * selectedItem.scale) / 2;

    const clampedX = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, x));
    const clampedY = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, y));

    setDragPreview({
      artwork,
      x: clampedX,
      y: clampedY,
      visible: true
    });

    onItemsChange(placedItems.map(item => 
      item.id === draggingItem 
        ? { ...item, x: clampedX, y: clampedY }
        : item
    ));
  }, [draggingItem, placedItems, artworkMap, onItemsChange]);

  const handleMouseUp = useCallback(() => {
    if (draggingItem) {
      const item = placedItems.find(i => i.id === draggingItem);
      if (item) {
        const snapX = snapToGrid(item.x);
        const snapY = snapToGrid(item.y);
        
        if (snapX !== item.x || snapY !== item.y) {
          setAnimatingItems(prev => [...prev, {
            id: draggingItem,
            fromX: item.x,
            fromY: item.y,
            toX: snapX,
            toY: snapY,
            startTime: performance.now(),
            duration: ELASTIC_DURATION
          }]);

          onItemsChange(placedItems.map(i =>
            i.id === draggingItem
              ? { ...i, x: snapX, y: snapY }
              : i
          ));
        }
      }
      setDraggingItem(null);
      setDragPreview(null);
    }
  }, [draggingItem, placedItems, snapToGrid, onItemsChange]);

  return (
    <div className="canvas-container">
      <div className="canvas-header">
        <h2>展厅布局</h2>
        <button className="preview-btn" onClick={onPreview3D}>
          3D 预览
        </button>
      </div>
      
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`gallery-canvas ${isDraggingOver ? 'dragging-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="canvas-hint">
        <span>从左侧拖拽艺术品到画布 · 点击选中 · 拖动调整位置</span>
      </div>

      <style>{`
        .canvas-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .canvas-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 800px;
          margin-bottom: 16px;
        }

        .canvas-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 0;
        }

        .preview-btn {
          padding: 10px 24px;
          background: #8B7D72;
          color: #F5F0EB;
          border: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .preview-btn:hover {
          background: #5C4F44;
        }

        .preview-btn:active {
          transform: scale(0.98);
        }

        .canvas-wrapper {
          position: relative;
          box-shadow: 0 8px 32px rgba(44, 44, 44, 0.15);
          border-radius: 4px;
          overflow: hidden;
        }

        .gallery-canvas {
          display: block;
          cursor: default;
          transition: box-shadow 0.2s ease;
        }

        .gallery-canvas.dragging-over {
          box-shadow: 0 0 0 3px rgba(92, 79, 68, 0.3), 0 8px 32px rgba(44, 44, 44, 0.15);
        }

        .canvas-hint {
          margin-top: 12px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-style: italic;
          color: #8B7D72;
        }
      `}</style>
    </div>
  );
};

export default GalleryCanvas;
