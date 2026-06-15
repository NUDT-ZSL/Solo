import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Artwork, PlacedItem, AnimatingItem } from './types';

interface GalleryCanvasProps {
  placedItems: PlacedItem[];
  onItemsChange: (items: PlacedItem[]) => void;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onPreview3D: () => void;
  artworks: Artwork[];
  draggingArtwork: Artwork | null;
  onCanvasDragEnd: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const ELASTIC_DURATION = 300;

interface PreviewState {
  artwork: Artwork;
  x: number;
  y: number;
}

const GalleryCanvas: React.FC<GalleryCanvasProps> = ({
  placedItems,
  onItemsChange,
  selectedItemId,
  onSelectItem,
  onPreview3D,
  artworks,
  draggingArtwork,
  onCanvasDragEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [animatingItems, setAnimatingItems] = useState<AnimatingItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const animatingItemsRef = useRef<AnimatingItem[]>([]);

  useEffect(() => {
    animatingItemsRef.current = animatingItems;
  }, [animatingItems]);

  const artworkMap = useMemo(() => {
    const map = new Map<string, Artwork>();
    artworks.forEach(a => map.set(a.id, a));
    return map;
  }, [artworks]);

  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  const easeOutElastic = useCallback((t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const p = 0.5;
    const s = p / 4;
    const raw = Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    if (t >= 0.85) {
      const tailT = (t - 0.85) / 0.15;
      return raw + (1 - raw) * Math.min(1, tailT);
    }
    return raw;
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
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(-halfW + 4, -halfH + 4, width - 8, height - 8);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, 0, halfW - 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(139, 125, 114, 0.12)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(CANVAS_WIDTH, y + 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 125, 114, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);
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
    const currentAnims = animatingItemsRef.current;
    const activeAnimations: AnimatingItem[] = [];
    let needsRender = false;

    const animMap = new Map<string, AnimatingItem>();
    currentAnims.forEach(a => animMap.set(a.id, a));

    placedItems.forEach(item => {
      const artwork = artworkMap.get(item.artworkId);
      if (!artwork) return;

      let displayX = item.x;
      let displayY = item.y;
      let animAlpha = 1;

      const animation = animMap.get(item.id);
      if (animation) {
        const elapsed = now - animation.startTime;
        const progress = Math.min(1, elapsed / animation.duration);
        const easedProgress = easeOutElastic(progress);
        
        displayX = animation.fromX + (animation.toX - animation.fromX) * easedProgress;
        displayY = animation.fromY + (animation.toY - animation.fromY) * easedProgress;
        animAlpha = 0.4 + 0.6 * easedProgress;

        if (progress < 1) {
          activeAnimations.push(animation);
          needsRender = true;
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

    if (activeAnimations.length !== currentAnims.length) {
      animatingItemsRef.current = activeAnimations;
      setAnimatingItems(activeAnimations);
    }

    if (preview) {
      const snapX = snapToGrid(preview.x);
      const snapY = snapToGrid(preview.y);

      drawArtwork(
        ctx,
        preview.artwork,
        preview.x,
        preview.y,
        0,
        1,
        false,
        0.35
      );

      ctx.strokeStyle = 'rgba(92, 79, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      
      const pw = preview.artwork.width;
      const ph = preview.artwork.height;
      ctx.strokeRect(snapX - pw / 2, snapY - ph / 2, pw, ph);
      
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(92, 79, 68, 0.8)';
      ctx.beginPath();
      ctx.arc(snapX, snapY, 4, 0, Math.PI * 2);
      ctx.fill();

      needsRender = true;
    }

    if (needsRender || preview) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
  }, [placedItems, preview, selectedItemId, artworkMap, drawGrid, drawArtwork, easeOutElastic, snapToGrid]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  const addElasticAnimation = useCallback((
    id: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const anim: AnimatingItem = {
      id,
      fromX,
      fromY,
      toX,
      toY,
      startTime: performance.now(),
      duration: ELASTIC_DURATION
    };
    animatingItemsRef.current = [...animatingItemsRef.current, anim];
    setAnimatingItems(prev => [...prev, anim]);
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingArtwork) return;
    setIsDraggingOver(true);
    const pos = getCanvasPos(e.clientX, e.clientY);
    const halfW = draggingArtwork.width / 2;
    const halfH = draggingArtwork.height / 2;
    const clampedX = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, pos.x));
    const clampedY = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, pos.y));
    setPreview({ artwork: draggingArtwork, x: clampedX, y: clampedY });
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
  }, [draggingArtwork, getCanvasPos, render]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!draggingArtwork) return;
    
    const pos = getCanvasPos(e.clientX, e.clientY);
    const clampedX = Math.max(draggingArtwork.width / 2, Math.min(CANVAS_WIDTH - draggingArtwork.width / 2, pos.x));
    const clampedY = Math.max(draggingArtwork.height / 2, Math.min(CANVAS_HEIGHT - draggingArtwork.height / 2, pos.y));
    
    setPreview(prev => {
      if (!prev || prev.x !== clampedX || prev.y !== clampedY) {
        return { artwork: draggingArtwork, x: clampedX, y: clampedY };
      }
      return prev;
    });
  }, [draggingArtwork, getCanvasPos]);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
    setPreview(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (!draggingArtwork) {
      setPreview(null);
      return;
    }

    const pos = getCanvasPos(e.clientX, e.clientY);
    const rawX = Math.max(draggingArtwork.width / 2, Math.min(CANVAS_WIDTH - draggingArtwork.width / 2, pos.x));
    const rawY = Math.max(draggingArtwork.height / 2, Math.min(CANVAS_HEIGHT - draggingArtwork.height / 2, pos.y));
    
    const snapX = snapToGrid(rawX);
    const snapY = snapToGrid(rawY);

    const clampedSnapX = Math.max(draggingArtwork.width / 2, Math.min(CANVAS_WIDTH - draggingArtwork.width / 2, snapX));
    const clampedSnapY = Math.max(draggingArtwork.height / 2, Math.min(CANVAS_HEIGHT - draggingArtwork.height / 2, snapY));

    const newItem: PlacedItem = {
      id: uuidv4(),
      artworkId: draggingArtwork.id,
      x: clampedSnapX,
      y: clampedSnapY,
      rotation: 0,
      scale: 1
    };

    addElasticAnimation(newItem.id, rawX, rawY - 40, clampedSnapX, clampedSnapY);
    
    setPreview(null);
    onCanvasDragEnd();
    onItemsChange([...placedItems, newItem]);
    onSelectItem(newItem.id);
  }, [draggingArtwork, getCanvasPos, snapToGrid, addElasticAnimation, onCanvasDragEnd, placedItems, onItemsChange, onSelectItem]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || draggingItem) return;

    const { x, y } = getCanvasPos(e.clientX, e.clientY);

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
  }, [placedItems, artworkMap, onSelectItem, draggingItem, getCanvasPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedItemId) return;

    const { x, y } = getCanvasPos(e.clientX, e.clientY);

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
  }, [selectedItemId, placedItems, artworkMap, getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingItem) return;

    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    const targetX = x - dragOffsetRef.current.x;
    const targetY = y - dragOffsetRef.current.y;

    const selectedItem = placedItems.find(item => item.id === draggingItem);
    if (!selectedItem) return;

    const artwork = artworkMap.get(selectedItem.artworkId);
    if (!artwork) return;

    const halfW = (artwork.width * selectedItem.scale) / 2;
    const halfH = (artwork.height * selectedItem.scale) / 2;

    const clampedX = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, targetX));
    const clampedY = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, targetY));

    onItemsChange(placedItems.map(item => 
      item.id === draggingItem 
        ? { ...item, x: clampedX, y: clampedY }
        : item
    ));
  }, [draggingItem, placedItems, artworkMap, onItemsChange, getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    if (draggingItem) {
      const item = placedItems.find(i => i.id === draggingItem);
      if (item) {
        const artwork = artworkMap.get(item.artworkId);
        if (artwork) {
          const halfW = (artwork.width * item.scale) / 2;
          const halfH = (artwork.height * item.scale) / 2;
          
          const snapX = snapToGrid(item.x);
          const snapY = snapToGrid(item.y);
          const clampedSnapX = Math.max(halfW, Math.min(CANVAS_WIDTH - halfW, snapX));
          const clampedSnapY = Math.max(halfH, Math.min(CANVAS_HEIGHT - halfH, snapY));
          
          if (clampedSnapX !== item.x || clampedSnapY !== item.y) {
            addElasticAnimation(draggingItem, item.x, item.y, clampedSnapX, clampedSnapY);
            onItemsChange(placedItems.map(i =>
              i.id === draggingItem
                ? { ...i, x: clampedSnapX, y: clampedSnapY }
                : i
            ));
          }
        }
      }
      setDraggingItem(null);
    }
  }, [draggingItem, placedItems, artworkMap, snapToGrid, addElasticAnimation, onItemsChange]);

  return (
    <div className="canvas-container">
      <div className="canvas-header">
        <h2>展厅布局</h2>
        <button className="preview-btn" onClick={onPreview3D}>
          3D 预览
        </button>
      </div>
      
      <div className={`canvas-wrapper ${isDraggingOver ? 'dragging-over' : ''}`}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="gallery-canvas"
          onDragEnter={handleDragEnter}
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
        <span>从左侧拖拽艺术品到画布 · 点击选中 · 拖动调整位置（自动吸附20px网格）</span>
      </div>

      <style>{`
        .canvas-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
          flex: 1;
          overflow: auto;
        }

        .canvas-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 800px;
          margin-bottom: 16px;
          flex-shrink: 0;
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
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .preview-btn:hover {
          background: #6F6359;
          box-shadow: 0 2px 8px rgba(92, 79, 68, 0.2);
        }

        .preview-btn:active {
          background: #5C4F44;
          transform: scale(0.98);
        }

        .canvas-wrapper {
          position: relative;
          box-shadow: 0 8px 32px rgba(44, 44, 44, 0.12);
          border-radius: 4px;
          overflow: hidden;
          transition: box-shadow 0.2s ease;
          flex-shrink: 0;
        }

        .canvas-wrapper.dragging-over {
          box-shadow: 0 0 0 3px rgba(92, 79, 68, 0.25), 0 12px 40px rgba(44, 44, 44, 0.18);
        }

        .gallery-canvas {
          display: block;
          cursor: default;
        }

        .canvas-hint {
          margin-top: 12px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-style: italic;
          color: #8B7D72;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default GalleryCanvas;
