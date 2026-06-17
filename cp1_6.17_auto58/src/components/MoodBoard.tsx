import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useMoodBoardStore } from '../store/useMoodBoardStore';
import { getElementById } from '../data/elements';
import { generateThumbnail } from '../core/exportHandler';
import './MoodBoard.css';

export interface MoodBoardHandle {
  getCanvasSnapshot: () => string | null;
  getCanvasElement: () => HTMLCanvasElement | null;
}

interface MoodBoardProps {
  onThumbnailReady?: (thumbnail: string) => void;
}

export const MoodBoard = forwardRef<MoodBoardHandle, MoodBoardProps>(({ onThumbnailReady }, ref) => {
  const {
    elements,
    selectedElementId,
    setSelectedElement,
    updateElement,
    bringToFront,
    removeElement,
  } = useMoodBoardStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startScale: number; startW: number; startH: number } | null>(null);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  useImperativeHandle(ref, () => ({
    getCanvasSnapshot: () => {
      if (!exportCanvasRef.current) return null;
      return generateThumbnail(exportCanvasRef.current, 80);
    },
    getCanvasElement: () => exportCanvasRef.current,
  }));

  const renderElementToCanvas = useCallback((ctx: CanvasRenderingContext2D, elementId: string, x: number, y: number, w: number, h: number) => {
    const item = getElementById(elementId);
    if (!item) return;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();

    switch (item.category) {
      case 'primaryColor':
      case 'secondaryColor':
        ctx.fillStyle = item.value;
        ctx.fillRect(x, y, w, h);
        break;
      case 'font':
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#333';
        ctx.font = `${Math.min(h * 0.4, 32)}px ${item.value}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Aa', x + w / 2, y + h / 2);
        break;
      case 'layout':
        ctx.fillStyle = '#E3F2FD';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#1976D2';
        if (item.value === 'centered') {
          ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6);
        } else if (item.value === 'sidebar-left') {
          ctx.fillRect(x, y, w * 0.25, h);
          ctx.fillStyle = '#90CAF9';
          ctx.fillRect(x + w * 0.35, y + h * 0.1, w * 0.55, h * 0.35);
        } else if (item.value === 'grid') {
          const cellW = w / 3;
          const cellH = h / 3;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              ctx.strokeStyle = '#1976D2';
              ctx.strokeRect(x + i * cellW + 2, y + j * cellH + 2, cellW - 4, cellH - 4);
            }
          }
        } else if (item.value === 'masonry') {
          ctx.fillRect(x + 5, y + 5, w * 0.28, h * 0.4);
          ctx.fillRect(x + w * 0.36, y + 5, w * 0.28, h * 0.25);
          ctx.fillRect(x + w * 0.68, y + 5, w * 0.28, h * 0.5);
          ctx.fillRect(x + 5, y + h * 0.48, w * 0.28, h * 0.3);
          ctx.fillRect(x + w * 0.36, y + h * 0.34, w * 0.28, h * 0.44);
        } else if (item.value === 'cards') {
          ctx.fillRect(x + w * 0.1, y + h * 0.15, w * 0.35, h * 0.7);
          ctx.fillStyle = '#90CAF9';
          ctx.fillRect(x + w * 0.55, y + h * 0.15, w * 0.35, h * 0.7);
        } else if (item.value === 'split') {
          ctx.fillRect(x, y, w / 2, h);
          ctx.fillStyle = '#BBDEFB';
          ctx.fillRect(x + w / 2, y, w / 2, h);
        } else if (item.value === 'timeline') {
          ctx.beginPath();
          ctx.moveTo(x + w * 0.1, y + h / 2);
          ctx.lineTo(x + w * 0.9, y + h / 2);
          ctx.strokeStyle = '#1976D2';
          ctx.lineWidth = 2;
          ctx.stroke();
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + w * (0.25 + i * 0.25), y + h / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'pattern':
        ctx.fillStyle = '#FAFAFA';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#1976D2';
        if (item.value === 'dots') {
          for (let px = x + 8; px < x + w; px += 16) {
            for (let py = y + 8; py < y + h; py += 16) {
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (item.value === 'stripes') {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 12);
          ctx.clip();
          for (let i = -h; i < w + h; i += 12) {
            ctx.fillRect(x + i, y, 4, h);
          }
          ctx.restore();
        } else if (item.value === 'grid') {
          ctx.strokeStyle = '#1976D2';
          ctx.lineWidth = 1;
          for (let gx = x; gx <= x + w; gx += 12) {
            ctx.beginPath();
            ctx.moveTo(gx, y);
            ctx.lineTo(gx, y + h);
            ctx.stroke();
          }
          for (let gy = y; gy <= y + h; gy += 12) {
            ctx.beginPath();
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
            ctx.stroke();
          }
        } else if (item.value === 'gradient') {
          const grad = ctx.createLinearGradient(x, y, x + w, y + h);
          grad.addColorStop(0, '#1976D2');
          grad.addColorStop(0.5, '#90CAF9');
          grad.addColorStop(1, '#E3F2FD');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);
        } else if (item.value === 'geometric') {
          const size = 20;
          for (let gx = x; gx < x + w; gx += size) {
            for (let gy = y; gy < y + h; gy += size) {
              const col = Math.floor((gx - x) / size) + Math.floor((gy - y) / size);
              if (col % 2 === 0) {
                ctx.fillRect(gx, gy, size, size);
              }
            }
          }
        } else if (item.value === 'waves') {
          ctx.fillStyle = '#E3F2FD';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#1976D2';
          ctx.lineWidth = 2;
          for (let wy = y + 15; wy < y + h; wy += 20) {
            ctx.beginPath();
            for (let wx = x; wx <= x + w; wx += 4) {
              const yy = wy + Math.sin((wx - x) * 0.08) * 6;
              if (wx === x) ctx.moveTo(wx, yy);
              else ctx.lineTo(wx, yy);
            }
            ctx.stroke();
          }
        } else if (item.value === 'noise') {
          for (let i = 0; i < 100; i++) {
            const nx = x + Math.random() * w;
            const ny = y + Math.random() * h;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (item.value === 'marble') {
          const grad = ctx.createRadialGradient(x + w * 0.3, y + h * 0.4, 5, x + w * 0.3, y + h * 0.4, w * 0.6);
          grad.addColorStop(0, 'rgba(25,118,210,0.15)');
          grad.addColorStop(1, 'rgba(25,118,210,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, w, h);
          const grad2 = ctx.createLinearGradient(x, y, x + w, y + h);
          grad2.addColorStop(0, '#FAFAFA');
          grad2.addColorStop(1, '#E3F2FD');
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = grad2;
          ctx.fillRect(x, y, w, h);
          ctx.globalCompositeOperation = 'source-over';
        }
        break;
      case 'iconStyle':
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#1976D2';
        ctx.font = `${Math.min(w, h) * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const iconMap: Record<string, string> = {
          outline: '☆',
          filled: '★',
          duotone: '★',
          'hand-drawn': '✎',
          '3d': '◆',
          gradient: '♥',
        };
        const iconChar = iconMap[item.value] || '●';
        if (item.value === 'duotone') {
          ctx.fillStyle = '#BBDEFB';
          ctx.fillText(iconChar, x + w / 2 + 3, y + h / 2 + 3);
          ctx.fillStyle = '#1976D2';
        } else if (item.value === '3d') {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        } else if (item.value === 'gradient') {
          const grad = ctx.createLinearGradient(x, y, x + w, y + h);
          grad.addColorStop(0, '#1976D2');
          grad.addColorStop(1, '#EC407A');
          ctx.fillStyle = grad;
        }
        ctx.fillText(iconChar, x + w / 2, y + h / 2);
        ctx.shadowColor = 'transparent';
        break;
    }

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    exportCanvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sortedElements) {
      const scaledW = el.width * el.scale;
      const scaledH = el.height * el.scale;
      renderElementToCanvas(ctx, el.elementId, el.x, el.y, scaledW, scaledH);
    }

    if (onThumbnailReady) {
      onThumbnailReady(generateThumbnail(canvas, 80));
    }
  }, [elements, renderElementToCanvas, onThumbnailReady]);

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const el = elements.find((e) => e.id === elementId);
    if (!el || !canvasRef.current) return;

    bringToFront(elementId);
    setSelectedElement(elementId);

    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - el.x;
    const offsetY = e.clientY - rect.top - el.y;

    setDragging({ id: elementId, offsetX, offsetY });
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const el = elements.find((e) => e.id === elementId);
    if (!el || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setResizing({
      id: elementId,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startScale: el.scale,
      startW: el.width,
      startH: el.height,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragging) {
        const el = elements.find((e) => e.id === dragging.id);
        if (el) {
          const scaledW = el.width * el.scale;
          const scaledH = el.height * el.scale;
          let newX = x - dragging.offsetX;
          let newY = y - dragging.offsetY;
          newX = Math.max(0, Math.min(CANVAS_WIDTH - scaledW, newX));
          newY = Math.max(0, Math.min(CANVAS_HEIGHT - scaledH, newY));
          updateElement(dragging.id, { x: newX, y: newY });
        }
      }

      if (resizing) {
        const el = elements.find((e) => e.id === resizing.id);
        if (el) {
          const dx = x - resizing.startX;
          const dy = y - resizing.startY;
          const scaleDelta = Math.max(dx, dy) / Math.max(resizing.startW, resizing.startH);
          let newScale = Math.max(0.5, Math.min(2.0, resizing.startScale + scaleDelta));
          updateElement(resizing.id, { scale: Math.round(newScale * 100) / 100 });
        }
      }
    },
    [dragging, resizing, elements, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  const handleCanvasClick = () => {
    setSelectedElement(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeElement(id);
  };

  const renderElementContent = (elementId: string) => {
    const item = getElementById(elementId);
    if (!item) return null;

    const contentStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      borderRadius: '11px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };

    switch (item.category) {
      case 'primaryColor':
      case 'secondaryColor':
        return <div style={{ ...contentStyle, backgroundColor: item.value }} />;
      case 'font':
        return (
          <div
            style={{
              ...contentStyle,
              backgroundColor: '#FAFAFA',
              fontFamily: item.value,
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
            }}
          >
            Aa
          </div>
        );
      case 'layout':
        return (
          <div
            className={`layout-element layout-${item.value}`}
            style={contentStyle}
          />
        );
      case 'pattern':
        return (
          <div
            className={`pattern-element pattern-${item.value}`}
            style={contentStyle}
          />
        );
      case 'iconStyle':
        return (
          <div
            className={`icon-element icon-${item.value}`}
            style={contentStyle}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="moodboard-container">
      <div
        ref={canvasRef}
        className="moodboard-canvas"
        onClick={handleCanvasClick}
      >
        {elements
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => (
            <div
              key={el.id}
              className={`board-element ${selectedElementId === el.id ? 'selected' : ''}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width * el.scale,
                height: el.height * el.scale,
                zIndex: el.zIndex,
              }}
              onMouseDown={(e) => handleMouseDown(e, el.id)}
            >
              {renderElementContent(el.elementId)}
              {selectedElementId === el.id && (
                <>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(e, el.id)}
                  />
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(e, el.id)}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
});

MoodBoard.displayName = 'MoodBoard';
