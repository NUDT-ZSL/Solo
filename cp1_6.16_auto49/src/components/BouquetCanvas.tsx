import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SelectedFlower } from '../types';
import { FLOWER_COLORS, WRAPPING_OPTIONS } from '../types';
import { generateDefaultLayout } from '../logic/bouquetLogic';

interface BouquetCanvasProps {
  selectedFlowers: SelectedFlower[];
  wrappingColor: string;
  onWrappingChange: (color: string) => void;
  onLayoutChange: (flowers: SelectedFlower[]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

interface DragState {
  flowerIndex: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  rotation: number
) {
  const colors = FLOWER_COLORS[color] || FLOWER_COLORS.white;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle = '#27AE60';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, 100);
  ctx.stroke();

  ctx.strokeStyle = '#2ECC71';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 55);
  ctx.quadraticCurveTo(-20, 45, -22, 35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 65);
  ctx.quadraticCurveTo(20, 55, 22, 45);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const petalX = Math.cos(angle) * 14;
    const petalY = Math.sin(angle) * 14 - 5;

    ctx.save();
    ctx.translate(petalX, petalY);
    ctx.rotate(angle);

    const petalGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
    petalGrad.addColorStop(0, colors.inner);
    petalGrad.addColorStop(1, colors.outer);
    ctx.fillStyle = petalGrad;

    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const centerGrad = ctx.createRadialGradient(0, -5, 2, 0, -5, 8);
  centerGrad.addColorStop(0, '#FFD700');
  centerGrad.addColorStop(1, '#F39C12');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(0, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const BouquetCanvas: React.FC<BouquetCanvasProps> = ({
  selectedFlowers,
  wrappingColor,
  onWrappingChange,
  onLayoutChange,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const flowersRef = useRef<SelectedFlower[]>(selectedFlowers);
  const animRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [wrappingTransition, setWrappingTransition] = useState(false);
  const prevWrappingColor = useRef(wrappingColor);

  useEffect(() => {
    flowersRef.current = selectedFlowers;
  }, [selectedFlowers]);

  useEffect(() => {
    if (prevWrappingColor.current !== wrappingColor) {
      setWrappingTransition(true);
      const timer = setTimeout(() => setWrappingTransition(false), 300);
      prevWrappingColor.current = wrappingColor;
      return () => clearTimeout(timer);
    }
  }, [wrappingColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = window.innerWidth < 768 ? window.innerHeight * 0.6 : Math.max(400, rect.height);
      setCanvasSize({ width: w, height: h });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const currentFlowers = flowersRef.current;

    ctx.fillStyle = wrappingColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (currentFlowers.length === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = '18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('请从左侧选择花材', canvasSize.width / 2, canvasSize.height / 2);
      return;
    }

    const sorted = [...currentFlowers].sort((a, b) => a.layoutY - b.layoutY);
    sorted.forEach((flower) => {
      drawFlower(ctx, flower.layoutX, flower.layoutY, flower.color, flower.rotation);
    });
  }, [canvasSize, wrappingColor, canvasRef]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      renderCanvas();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [renderCanvas]);

  useEffect(() => {
    if (selectedFlowers.length === 0) return;

    const needsLayout = selectedFlowers.some(
      (f) => f.layoutX === 0 && f.layoutY === 0
    );
    if (needsLayout) {
      const laid = generateDefaultLayout(
        selectedFlowers,
        canvasSize.width,
        canvasSize.height
      );
      onLayoutChange(laid);
    }
  }, [selectedFlowers, canvasSize, onLayoutChange]);

  const getFlowerAtPos = useCallback(
    (x: number, y: number): number => {
      const currentFlowers = flowersRef.current;
      for (let i = currentFlowers.length - 1; i >= 0; i--) {
        const f = currentFlowers[i];
        const dx = x - f.layoutX;
        const dy = y - f.layoutY;
        if (dx * dx + dy * dy < 40 * 40) {
          return i;
        }
      }
      return -1;
    },
    []
  );

  const getCanvasPos = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [canvasRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const idx = getFlowerAtPos(pos.x, pos.y);
      if (idx >= 0) {
        const f = flowersRef.current[idx];
        dragRef.current = {
          flowerIndex: idx,
          offsetX: pos.x - f.layoutX,
          offsetY: pos.y - f.layoutY,
          isDragging: true,
        };
      }
    },
    [getCanvasPos, getFlowerAtPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current?.isDragging) return;
      const pos = getCanvasPos(e);
      const updated = [...flowersRef.current];
      const idx = dragRef.current.flowerIndex;
      if (idx < updated.length) {
        updated[idx] = {
          ...updated[idx],
          layoutX: pos.x - dragRef.current.offsetX,
          layoutY: pos.y - dragRef.current.offsetY,
        };
        onLayoutChange(updated);
      }
    },
    [getCanvasPos, onLayoutChange]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const pos = getCanvasPos(e);
      const idx = getFlowerAtPos(pos.x, pos.y);
      if (idx >= 0) {
        e.preventDefault();
        const updated = [...flowersRef.current];
        updated[idx] = {
          ...updated[idx],
          rotation: updated[idx].rotation + (e.deltaY > 0 ? 0.1 : -0.1),
        };
        onLayoutChange(updated);
      }
    },
    [getCanvasPos, getFlowerAtPos, onLayoutChange]
  );

  return (
    <div className="bouquet-canvas-container" ref={containerRef}>
      <h2 className="section-title">🎨 搭配画布</h2>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`bouquet-canvas ${wrappingTransition ? 'wrapping-transition' : ''}`}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: wrappingColor,
          transition: wrappingTransition
            ? 'background-color 0.3s ease'
            : 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="wrapping-selector">
        <span className="wrapping-label">包装纸：</span>
        {WRAPPING_OPTIONS.map((w) => (
          <button
            key={w.color}
            className={`wrapping-btn ${wrappingColor === w.color ? 'active' : ''}`}
            style={{
              backgroundColor: w.color,
              border:
                wrappingColor === w.color
                  ? '3px solid #D4AF37'
                  : '2px solid #ccc',
            }}
            onClick={() => onWrappingChange(w.color)}
            title={w.name}
          />
        ))}
      </div>
      <div className="canvas-hint">
        💡 拖拽移动花材 · 滚轮旋转花材
      </div>
    </div>
  );
};

export default BouquetCanvas;
