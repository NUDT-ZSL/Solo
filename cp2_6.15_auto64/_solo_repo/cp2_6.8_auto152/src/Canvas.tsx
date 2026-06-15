import { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  User, CanvasElement, PathData, StickyData, EmojiData, DrawMode, Point
} from './types';

interface CanvasProps {
  elements: CanvasElement[];
  users: User[];
  currentUser: User | null;
  drawMode: DrawMode;
  selectedColor: string;
  lineWidth: number;
  selectedEmoji: string;
  isReadOnly: boolean;
  replayingId: string | null;
  onAddElement: (element: CanvasElement) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
  onUpdateCursor: (cursor: Point | null) => void;
}

function smoothPath(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    result.push({
      x: (p0.x + 2 * p1.x + p2.x) / 4,
      y: (p0.y + 2 * p1.y + p2.y) / 4
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

export default function Canvas(props: CanvasProps) {
  const {
    elements, users, currentUser, drawMode, selectedColor, lineWidth,
    selectedEmoji, isReadOnly, replayingId,
    onAddElement, onMoveElement, onUpdateCursor
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [draggingElement, setDraggingElement] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [stickyInput, setStickyInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const stickyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stickyInput && stickyInputRef.current) {
      stickyInputRef.current.focus();
    }
  }, [stickyInput]);

  const screenToCanvas = useCallback((sx: number, sy: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale
    };
  }, [viewport]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: CanvasElement, isHighlighted: boolean) => {
    ctx.save();
    if (isHighlighted) {
      ctx.shadowColor = '#63B3ED';
      ctx.shadowBlur = 20;
    }

    if (el.type === 'path') {
      if (el.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const smoothed = smoothPath(el.points);
      ctx.moveTo(smoothed[0].x, smoothed[0].y);
      for (let i = 1; i < smoothed.length; i++) {
        ctx.lineTo(smoothed[i].x, smoothed[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.fillStyle = '#1A202C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.scale, viewport.scale);

    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 1 / viewport.scale;
    const gridSize = 40;
    const startX = -viewport.x / viewport.scale;
    const startY = -viewport.y / viewport.scale;
    const endX = startX + (canvas.width / viewport.scale);
    const endY = startY + (canvas.height / viewport.scale);

    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    elements.forEach(el => {
      drawElement(ctx, el, replayingId === el.id);
    });

    if (isDrawing && currentPath.length > 1 && currentUser) {
      ctx.beginPath();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const smoothed = smoothPath(currentPath);
      ctx.moveTo(smoothed[0].x, smoothed[0].y);
      for (let i = 1; i < smoothed.length; i++) {
        ctx.lineTo(smoothed[i].x, smoothed[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [elements, viewport, currentPath, isDrawing, currentUser, selectedColor, lineWidth, drawElement, replayingId]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly || !currentUser) return;

    const point = screenToCanvas(e.clientX, e.clientY);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y });
      return;
    }

    if (drawMode === 'pen') {
      setIsDrawing(true);
      setCurrentPath([point]);
    } else if (drawMode === 'sticky') {
      if (!stickyInput) {
        setStickyInput({ x: point.x, y: point.y, value: '' });
      }
    } else if (drawMode === 'emoji') {
      const newEmoji: EmojiData = {
        id: uuidv4(),
        type: 'emoji',
        x: point.x - 24,
        y: point.y - 24,
        emoji: selectedEmoji,
        userId: currentUser.id,
        createdAt: Date.now()
      };
      onAddElement(newEmoji);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    onUpdateCursor(point);

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        x: panStart.vx + (e.clientX - panStart.x),
        y: panStart.vy + (e.clientY - panStart.y)
      }));
      return;
    }

    if (draggingElement) {
      onMoveElement(
        draggingElement.id,
        point.x - draggingElement.offsetX,
        point.y - draggingElement.offsetY
      );
      return;
    }

    if (isDrawing && drawMode === 'pen') {
      setCurrentPath(prev => [...prev, point]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggingElement) {
      setDraggingElement(null);
      return;
    }

    if (isDrawing && currentPath.length > 1 && currentUser) {
      const newPath: PathData = {
        id: uuidv4(),
        type: 'path',
        points: currentPath,
        color: selectedColor,
        width: lineWidth,
        userId: currentUser.id,
        createdAt: Date.now()
      };
      onAddElement(newPath);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleMouseLeave = () => {
    onUpdateCursor(null);
    if (isPanning) setIsPanning(false);
    if (draggingElement) setDraggingElement(null);
    if (isDrawing && currentPath.length > 1 && currentUser) {
      const newPath: PathData = {
        id: uuidv4(),
        type: 'path',
        points: currentPath,
        color: selectedColor,
        width: lineWidth,
        userId: currentUser.id,
        createdAt: Date.now()
      };
      onAddElement(newPath);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(prev => {
      const newScale = Math.max(0.5, Math.min(3, prev.scale * delta));
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: newScale };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = (mx - prev.x) / prev.scale;
      const cy = (my - prev.y) / prev.scale;
      return {
        x: mx - cx * newScale,
        y: my - cy * newScale,
        scale: newScale
      };
    });
  };

  const confirmSticky = () => {
    if (!stickyInput || !stickyInput.value.trim() || !currentUser) {
      setStickyInput(null);
      return;
    }
    const newSticky: StickyData = {
      id: uuidv4(),
      type: 'sticky',
      x: stickyInput.x,
      y: stickyInput.y,
      text: stickyInput.value.trim(),
      color: selectedColor,
      userId: currentUser.id,
      createdAt: Date.now()
    };
    onAddElement(newSticky);
    setStickyInput(null);
  };

  const startDragElement = (e: React.MouseEvent, el: StickyData | EmojiData) => {
    if (isReadOnly || !currentUser) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    setDraggingElement({
      id: el.id,
      offsetX: point.x - el.x,
      offsetY: point.y - el.y
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#1A202C',
        cursor: isPanning ? 'grabbing' : drawMode === 'pen' ? 'crosshair' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {elements.filter(el => el.type === 'sticky' || el.type === 'emoji').map(el => (
        <div
          key={el.id}
          className={replayingId === el.id ? 'highlight-element fade-in' : 'fade-in'}
          onMouseDown={(e) => startDragElement(e, el as StickyData | EmojiData)}
          style={{
            position: 'absolute',
            left: viewport.x + el.x * viewport.scale,
            top: viewport.y + el.y * viewport.scale,
            cursor: isReadOnly ? 'default' : 'grab',
            transform: `scale(${viewport.scale})`,
            transformOrigin: 'top left',
            zIndex: 5
          }}
        >
          {el.type === 'sticky' ? (
            <div style={{
              padding: '10px 14px',
              minWidth: 100,
              maxWidth: 200,
              background: '#FFF8DC',
              border: `2px solid ${el.color}`,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <div
                className="sticky-text"
                style={{
                  fontSize: 18,
                  color: '#2D3748',
                  lineHeight: 1.3,
                  wordBreak: 'break-word'
                }}
              >
                {el.text}
              </div>
            </div>
          ) : (
            <div style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36
            }}>
              {el.emoji}
            </div>
          )}
        </div>
      ))}

      {stickyInput && (
        <div
          style={{
            position: 'absolute',
            left: viewport.x + stickyInput.x * viewport.scale,
            top: viewport.y + stickyInput.y * viewport.scale,
            zIndex: 20,
            transform: `scale(${viewport.scale})`,
            transformOrigin: 'top left'
          }} className="fade-in"
        >
          <div style={{
            padding: 10,
            background: '#FFF8DC',
            border: `2px solid ${selectedColor}`,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}>
            <input
              ref={stickyInputRef}
              value={stickyInput.value}
              onChange={(e) => setStickyInput(prev => prev ? { ...prev, value: e.target.value } : null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmSticky();
                if (e.key === 'Escape') setStickyInput(null);
              }}
              onBlur={confirmSticky}
              placeholder="输入便签文字..."
              autoFocus
              className="sticky-text"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 18,
                color: '#2D3748',
                fontFamily: "'Caveat', cursive",
                minWidth: 120
              }}
            />
          </div>
        </div>
      )}

      {users.map(user => user.cursor && (
        <div
          key={user.id}
          style={{
            position: 'absolute',
            left: viewport.x + user.cursor.x * viewport.scale,
            top: viewport.y + user.cursor.y * viewport.scale,
            pointerEvents: 'none',
            zIndex: 15,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: user.color,
            opacity: 0.6,
            border: '2px solid white'
          }} />
          <div style={{
            position: 'absolute',
            top: 14,
            left: 10,
            padding: '2px 8px',
            background: user.color,
            color: '#1A202C',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            whiteSpace: 'nowrap'
          }}>
            {user.animal} {user.name}
          </div>
        </div>
      ))}

      <div style={{
        position: 'absolute',
        bottom: 80,
        left: 16,
        zIndex: 10,
        padding: '4px 10px',
        background: 'rgba(26, 32, 44, 0.8)',
        borderRadius: 6,
        fontSize: 12,
        color: '#A0AEC0'
      }}>
        缩放: {Math.round(viewport.scale * 100)}% | Alt+拖拽 平移 | 滚轮缩放
      </div>
    </div>
  );
}
