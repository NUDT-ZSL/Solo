import { useEffect, useRef, useState, useCallback } from 'react';
import { useExhibitionStore } from '@/store';
import { findPath, snapToGrid, GRID_SIZE_CONST } from '@/utils/pathfinding';
import { WallShape, DragState, Wall, Exhibit } from '@/types';

const GRID_SIZE = GRID_SIZE_CONST;
const GRID_COLOR = 'rgba(208, 208, 208, 0.3)';
const GRID_HIGHLIGHT_COLOR = 'rgba(99, 102, 241, 0.4)';
const GRID_HIGHLIGHT_RADIUS = 3;
const GRID_SNAP_THRESHOLD = 10;
const CANVAS_BG = '#0f172a';
const WALL_COLOR = '#475569';
const WALL_SELECTED_COLOR = '#6366f1';
const PATH_COLOR = '#6366f1';
const ENTRANCE_COLOR = '#22c55e';
const EXIT_COLOR = '#ef4444';

export default function CanvasBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const dashOffsetRef = useRef<number>(0);

  const {
    currentExhibition,
    selectedTool,
    selectedWallId,
    selectedExhibitId,
    setSelectedWallId,
    setSelectedExhibitId,
    addWall,
    updateWall,
    addExhibit,
    updateExhibit,
    setPath,
  } = useExhibitionStore();

  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 600 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    type: null,
    id: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });
  const [previewWall, setPreviewWall] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [exhibitImages, setExhibitImages] = useState<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const images = new Map<string, HTMLImageElement>();
    currentExhibition.exhibits.forEach((exhibit) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = exhibit.imageUrl;
      img.onload = () => {
        setExhibitImages((prev) => new Map(prev).set(exhibit.id, img));
      };
      images.set(exhibit.id, img);
    });
    setExhibitImages(images);
  }, [currentExhibition.exhibits.map((e) => e.imageUrl).join(',')]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (currentExhibition.walls.length > 0) {
      const path = findPath(
        currentExhibition.walls,
        currentExhibition.entrance,
        currentExhibition.exit,
        canvasSize.width,
        canvasSize.height
      );
      setPath(path);
    }
  }, [currentExhibition.walls, currentExhibition.entrance, currentExhibition.exit, canvasSize]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvasSize.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasSize.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
  }, [canvasSize]);

  const drawWall = useCallback((ctx: CanvasRenderingContext2D, wall: Wall, isSelected: boolean) => {
    ctx.save();
    ctx.translate(wall.x + wall.width / 2, wall.y + wall.height / 2);
    ctx.rotate((wall.rotation * Math.PI) / 180);
    ctx.translate(-(wall.x + wall.width / 2), -(wall.y + wall.height / 2));

    ctx.fillStyle = WALL_COLOR;
    ctx.strokeStyle = isSelected ? WALL_SELECTED_COLOR : '#64748b';
    ctx.lineWidth = isSelected ? 2 : 1;

    if (wall.shape === 'rectangle') {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      if (isSelected) {
        ctx.shadowColor = WALL_SELECTED_COLOR;
        ctx.shadowBlur = 10;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        ctx.shadowBlur = 0;
      }
    } else if (wall.shape === 'L-shape') {
      const sw = wall.lShapeSecondWidth || wall.width;
      const sh = wall.lShapeSecondHeight || 100;
      ctx.beginPath();
      ctx.moveTo(wall.x, wall.y);
      ctx.lineTo(wall.x + wall.width, wall.y);
      ctx.lineTo(wall.x + wall.width, wall.y + wall.height);
      ctx.lineTo(wall.x + wall.width + sw, wall.y + wall.height);
      ctx.lineTo(wall.x + wall.width + sw, wall.y + wall.height + sh);
      ctx.lineTo(wall.x + wall.width - wall.width + sw, wall.y + wall.height + sh);
      ctx.lineTo(wall.x + sw, wall.y + wall.height);
      ctx.lineTo(wall.x, wall.y + wall.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (wall.shape === 'arc') {
      const radius = wall.arcRadius || 100;
      const startAngle = wall.arcStartAngle || 0;
      const endAngle = wall.arcEndAngle || Math.PI;
      const thickness = wall.height;
      const cx = wall.x + radius;
      const cy = wall.y + radius;

      ctx.beginPath();
      ctx.arc(cx, cy, radius + thickness / 2, startAngle, endAngle);
      ctx.arc(cx, cy, radius - thickness / 2, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const drawExhibit = useCallback((ctx: CanvasRenderingContext2D, exhibit: Exhibit, isSelected: boolean, img?: HTMLImageElement) => {
    ctx.save();
    ctx.translate(exhibit.x + exhibit.width / 2, exhibit.y + exhibit.height / 2);
    ctx.rotate((exhibit.rotation * Math.PI) / 180);
    ctx.translate(-(exhibit.x + exhibit.width / 2), -(exhibit.y + exhibit.height / 2));

    if (img && img.complete && img.naturalWidth > 0) {
      try {
        ctx.drawImage(img, exhibit.x, exhibit.y, exhibit.width, exhibit.height);
      } catch {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(exhibit.x, exhibit.y, exhibit.width, exhibit.height);
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(exhibit.name, exhibit.x + exhibit.width / 2, exhibit.y + exhibit.height / 2);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(exhibit.x, exhibit.y, exhibit.width, exhibit.height);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(exhibit.name, exhibit.x + exhibit.width / 2, exhibit.y + exhibit.height / 2);
    }

    if (isSelected) {
      ctx.strokeStyle = WALL_SELECTED_COLOR;
      ctx.lineWidth = 2;
      ctx.shadowColor = WALL_SELECTED_COLOR;
      ctx.shadowBlur = 8;
      ctx.strokeRect(exhibit.x - 2, exhibit.y - 2, exhibit.width + 4, exhibit.height + 4);
      ctx.shadowBlur = 0;

      const handleSize = 8;
      ctx.fillStyle = WALL_SELECTED_COLOR;
      ctx.fillRect(exhibit.x - handleSize / 2, exhibit.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(exhibit.x + exhibit.width - handleSize / 2, exhibit.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(exhibit.x - handleSize / 2, exhibit.y + exhibit.height - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(exhibit.x + exhibit.width - handleSize / 2, exhibit.y + exhibit.height - handleSize / 2, handleSize, handleSize);
    }
    ctx.restore();
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: { x: number; y: number }[]) => {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = PATH_COLOR;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -dashOffsetRef.current;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawEntranceExit = useCallback((ctx: CanvasRenderingContext2D) => {
    const { entrance, exit } = currentExhibition;
    ctx.save();

    ctx.fillStyle = ENTRANCE_COLOR;
    ctx.beginPath();
    ctx.arc(entrance.x, entrance.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('入', entrance.x, entrance.y);

    ctx.fillStyle = EXIT_COLOR;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('出', exit.x, exit.y);

    ctx.restore();
  }, [currentExhibition]);

  const drawGridHighlights = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!dragState.isDragging && !previewWall) return;

    let highlightPoints: { x: number; y: number }[] = [];

    if (previewWall) {
      const corners = [
        { x: previewWall.startX, y: previewWall.startY },
        { x: previewWall.endX, y: previewWall.startY },
        { x: previewWall.startX, y: previewWall.endY },
        { x: previewWall.endX, y: previewWall.endY },
      ];
      highlightPoints = corners;
    } else if (dragState.isDragging && dragState.id) {
      let element: Wall | Exhibit | undefined;
      if (dragState.type === 'wall') {
        element = currentExhibition.walls.find((w) => w.id === dragState.id);
      } else if (dragState.type === 'exhibit') {
        element = currentExhibition.exhibits.find((e) => e.id === dragState.id);
      }
      if (element) {
        const corners = [
          { x: element.x, y: element.y },
          { x: element.x + element.width, y: element.y },
          { x: element.x, y: element.y + element.height },
          { x: element.x + element.width, y: element.y + element.height },
        ];
        highlightPoints = corners;
      }
    }

    const highlightedGridPoints: { x: number; y: number }[] = [];
    const addedPoints = new Set<string>();

    for (const point of highlightPoints) {
      const gridX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
      const gridY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;

      const distX = Math.abs(point.x - gridX);
      const distY = Math.abs(point.y - gridY);

      if (distX < GRID_SNAP_THRESHOLD && distY < GRID_SNAP_THRESHOLD) {
        const key = `${gridX},${gridY}`;
        if (!addedPoints.has(key)) {
          addedPoints.add(key);
          highlightedGridPoints.push({ x: gridX, y: gridY });
        }
      }
    }

    if (highlightedGridPoints.length === 0) return;

    ctx.save();
    ctx.fillStyle = GRID_HIGHLIGHT_COLOR;
    for (const point of highlightedGridPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, GRID_HIGHLIGHT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [dragState, previewWall, currentExhibition.walls, currentExhibition.exhibits]);

  const drawPreviewWall = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!previewWall) return;
    ctx.save();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.strokeStyle = WALL_SELECTED_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const x = Math.min(previewWall.startX, previewWall.endX);
    const y = Math.min(previewWall.startY, previewWall.endY);
    const w = Math.abs(previewWall.endX - previewWall.startX);
    const h = Math.abs(previewWall.endY - previewWall.startY);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }, [previewWall]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    drawGrid(ctx);
    drawPath(ctx, useExhibitionStore.getState().path);
    drawEntranceExit(ctx);

    currentExhibition.walls.forEach((wall) => {
      drawWall(ctx, wall, wall.id === selectedWallId);
    });

    currentExhibition.exhibits.forEach((exhibit) => {
      const img = exhibitImages.get(exhibit.id);
      drawExhibit(ctx, exhibit, exhibit.id === selectedExhibitId, img);
    });

    drawPreviewWall(ctx);
    drawGridHighlights(ctx);

    dashOffsetRef.current = (dashOffsetRef.current + 30 / 60) % 20;
    animationRef.current = requestAnimationFrame(render);
  }, [canvasSize, drawGrid, drawPath, drawEntranceExit, drawWall, drawExhibit, drawPreviewWall, drawGridHighlights, currentExhibition, selectedWallId, selectedExhibitId, exhibitImages]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [render]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const hitTestWall = (x: number, y: number): Wall | null => {
    for (let i = currentExhibition.walls.length - 1; i >= 0; i--) {
      const wall = currentExhibition.walls[i];
      if (x >= wall.x && x <= wall.x + wall.width &&
          y >= wall.y && y <= wall.y + wall.height) {
        return wall;
      }
      if (wall.shape === 'L-shape') {
        const sw = wall.lShapeSecondWidth || wall.width;
        const sh = wall.lShapeSecondHeight || 100;
        if (x >= wall.x + wall.width - sw && x <= wall.x + wall.width + sw &&
            y >= wall.y + wall.height && y <= wall.y + wall.height + sh) {
          return wall;
        }
      }
    }
    return null;
  };

  const hitTestExhibit = (x: number, y: number): Exhibit | null => {
    for (let i = currentExhibition.exhibits.length - 1; i >= 0; i--) {
      const exhibit = currentExhibition.exhibits[i];
      if (x >= exhibit.x && x <= exhibit.x + exhibit.width &&
          y >= exhibit.y && y <= exhibit.y + exhibit.height) {
        return exhibit;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (selectedTool !== 'select') {
      const snappedX = snapToGrid(x);
      const snappedY = snapToGrid(y);
      setPreviewWall({ startX: snappedX, startY: snappedY, endX: snappedX, endY: snappedY });
      setDragState({
        isDragging: true,
        type: 'wall',
        id: null,
        offsetX: 0,
        offsetY: 0,
        startX: snappedX,
        startY: snappedY,
      });
      return;
    }

    const exhibit = hitTestExhibit(x, y);
    if (exhibit) {
      setSelectedExhibitId(exhibit.id);
      setDragState({
        isDragging: true,
        type: 'exhibit',
        id: exhibit.id,
        offsetX: x - exhibit.x,
        offsetY: y - exhibit.y,
        startX: exhibit.x,
        startY: exhibit.y,
      });
      return;
    }

    const wall = hitTestWall(x, y);
    if (wall) {
      setSelectedWallId(wall.id);
      setDragState({
        isDragging: true,
        type: 'wall',
        id: wall.id,
        offsetX: x - wall.x,
        offsetY: y - wall.y,
        startX: wall.x,
        startY: wall.y,
      });
      return;
    }

    setSelectedWallId(null);
    setSelectedExhibitId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (dragState.isDragging && selectedTool !== 'select' && previewWall) {
      const snappedX = snapToGrid(x);
      const snappedY = snapToGrid(y);
      setPreviewWall({ ...previewWall, endX: snappedX, endY: snappedY });
      return;
    }

    if (!dragState.isDragging) return;

    if (dragState.type === 'wall' && dragState.id) {
      const newX = snapToGrid(x - dragState.offsetX);
      const newY = snapToGrid(y - dragState.offsetY);
      updateWall(dragState.id, { x: newX, y: newY });
    } else if (dragState.type === 'exhibit' && dragState.id) {
      const newX = snapToGrid(x - dragState.offsetX);
      const newY = snapToGrid(y - dragState.offsetY);
      updateExhibit(dragState.id, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (selectedTool !== 'select' && previewWall) {
      const x = Math.min(previewWall.startX, previewWall.endX);
      const y = Math.min(previewWall.startY, previewWall.endY);
      let width = Math.abs(previewWall.endX - previewWall.startX);
      let height = Math.abs(previewWall.endY - previewWall.startY);

      width = Math.max(width, GRID_SIZE);
      height = Math.max(height, GRID_SIZE);

      if (width >= GRID_SIZE && height >= GRID_SIZE) {
        const shape = selectedTool as WallShape;
        const wallData: Omit<Wall, 'id'> = {
          shape,
          x,
          y,
          width,
          height,
          rotation: 0,
        };
        if (shape === 'L-shape') {
          wallData.lShapeSecondWidth = 20;
          wallData.lShapeSecondHeight = 100;
        }
        if (shape === 'arc') {
          wallData.arcRadius = Math.max(width, height) / 2;
          wallData.arcStartAngle = Math.PI;
          wallData.arcEndAngle = 2 * Math.PI;
        }
        addWall(wallData);
      }
      setPreviewWall(null);
    }

    setDragState({
      isDragging: false,
      type: null,
      id: null,
      offsetX: 0,
      offsetY: 0,
      startX: 0,
      startY: 0,
    });
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (selectedWallId) {
            const wall = currentExhibition.walls.find((w) => w.id === selectedWallId);
            if (wall) {
              addExhibit({
                wallId: selectedWallId,
                x: snapToGrid(wall.x + wall.width + 10),
                y: snapToGrid(wall.y + 20),
                width: 60,
                height: 80,
                rotation: 0,
                imageUrl: dataUrl,
                name: `展品 ${currentExhibition.exhibits.length + 1}`,
              });
            }
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  }, [selectedWallId, currentExhibition, addExhibit]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block"
        style={{ cursor: selectedTool === 'select' ? 'default' : 'crosshair', transition: 'all 0.2s ease-out' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="exhibit-upload"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (selectedWallId) {
                const wall = currentExhibition.walls.find((w) => w.id === selectedWallId);
                if (wall) {
                  addExhibit({
                    wallId: selectedWallId,
                    x: snapToGrid(wall.x + wall.width + 10),
                    y: snapToGrid(wall.y + 20),
                    width: 60,
                    height: 80,
                    rotation: 0,
                    imageUrl: dataUrl,
                    name: `展品 ${currentExhibition.exhibits.length + 1}`,
                  });
                }
              }
            };
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
