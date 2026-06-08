import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ShapeData, TargetShape, Particle, NORDIC_COLORS } from './types';
import { snapToGrid, generateGridLines, DEFAULT_GRID_CONFIG } from './GridSnap';
import { createExplosionParticles, updateParticles } from './particles';

interface CanvasProps {
  shapes: ShapeData[];
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  targetShapes: TargetShape[];
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  onProgressChange: (progress: number) => void;
  onComplete: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function renderShapeSVG(type: ShapeData['type'], width: number, height: number, color: string) {
  switch (type) {
    case 'circle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} fill={color} />
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <rect x={0} y={0} width={width} height={height} fill={color} rx={4} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polygon points={`${width / 2},0 ${width},${height} 0,${height}`} fill={color} />
        </svg>
      );
    case 'hexagon': {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2;
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polygon points={points} fill={color} />
        </svg>
      );
    }
  }
}

function renderTargetOutlineSVG(type: TargetShape['type'], width: number, height: number) {
  switch (type) {
    case 'circle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2 - 1} />
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <rect x={1} y={1} width={width - 2} height={height - 2} rx={4} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polygon points={`${width / 2},2 ${width - 2},${height - 2} 2,${height - 2}`} />
        </svg>
      );
    case 'hexagon': {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2 - 2;
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      }).join(' ');
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <polygon points={points} />
        </svg>
      );
    }
  }
}

const Canvas: React.FC<CanvasProps> = ({
  shapes,
  setShapes,
  targetShapes,
  selectedShapeId,
  setSelectedShapeId,
  onProgressChange,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snappingId, setSnappingId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showGlow, setShowGlow] = useState(false);
  const animationRef = useRef<number>();
  const gridLines = generateGridLines(CANVAS_WIDTH, CANVAS_HEIGHT);

  const calculateProgress = useCallback(() => {
    if (targetShapes.length === 0) return 0;

    let matchedCount = 0;
    const usedShapes = new Set<string>();

    for (const target of targetShapes) {
      const posTol = target.tolerance?.position ?? 20;
      const rotTol = target.tolerance?.rotation ?? 15;
      const colorMatch = target.tolerance?.color ?? true;

      for (const shape of shapes) {
        if (usedShapes.has(shape.id)) continue;
        if (shape.type !== target.type) continue;

        const dist = Math.sqrt(
          Math.pow(shape.x - target.x, 2) + Math.pow(shape.y - target.y, 2)
        );
        const sizeMatch =
          Math.abs(shape.width - target.width) <= 15 &&
          Math.abs(shape.height - target.height) <= 15;
        const rotDiff = Math.abs(((shape.rotation - target.rotation + 540) % 360) - 180);
        const rotationOk = rotDiff <= rotTol || rotDiff >= 360 - rotTol;
        const colorOk = !colorMatch || shape.color.toLowerCase() === target.color.toLowerCase();

        if (dist <= posTol && sizeMatch && rotationOk && colorOk) {
          usedShapes.add(shape.id);
          matchedCount++;
          break;
        }
      }
    }

    return Math.round((matchedCount / targetShapes.length) * 100);
  }, [shapes, targetShapes]);

  useEffect(() => {
    const progress = calculateProgress();
    onProgressChange(progress);

    if (progress >= 95) {
      setShowGlow(true);
      onComplete();
      setTimeout(() => setShowGlow(false), 1500);

      const newParticles = createExplosionParticles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 80);
      setParticles((prev) => [...prev, ...newParticles]);
    }
  }, [shapes, calculateProgress, onProgressChange, onComplete]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles((prev) => updateParticles(prev));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [particles.length > 0]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, shape: ShapeData) => {
      e.stopPropagation();
      setSelectedShapeId(shape.id);
      setDraggingId(shape.id);

      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDragOffset({
        x: coords.x - shape.x,
        y: coords.y - shape.y,
      });
    },
    [setSelectedShapeId, getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;

      const coords = getCanvasCoords(e.clientX, e.clientY);
      const newX = Math.max(30, Math.min(CANVAS_WIDTH - 30, coords.x - dragOffset.x));
      const newY = Math.max(30, Math.min(CANVAS_HEIGHT - 30, coords.y - dragOffset.y));

      setShapes((prev) =>
        prev.map((s) =>
          s.id === draggingId ? { ...s, x: newX, y: newY } : s
        )
      );
    },
    [draggingId, dragOffset, getCanvasCoords, setShapes]
  );

  const handleMouseUp = useCallback(() => {
    if (!draggingId) return;

    const shape = shapes.find((s) => s.id === draggingId);
    if (shape) {
      const snapped = snapToGrid(shape.x, shape.y, DEFAULT_GRID_CONFIG);
      if (snapped.snapped) {
        setShapes((prev) =>
          prev.map((s) =>
            s.id === draggingId ? { ...s, x: snapped.x, y: snapped.y } : s
          )
        );
        setSnappingId(draggingId);
        setTimeout(() => setSnappingId(null), 200);
      }
    }

    setDraggingId(null);
  }, [draggingId, shapes, setShapes]);

  const handleCanvasClick = useCallback(() => {
    setSelectedShapeId(null);
  }, [setSelectedShapeId]);

  return (
    <div
      ref={canvasRef}
      className={`canvas-container${showGlow ? ' glow-active' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <div className="canvas-grid">
        {gridLines.vertical.map((x) => (
          <div
            key={`v-${x}`}
            className="grid-line vertical"
            style={{ left: x }}
          />
        ))}
        {gridLines.horizontal.map((y) => (
          <div
            key={`h-${y}`}
            className="grid-line horizontal"
            style={{ top: y }}
          />
        ))}
      </div>

      {targetShapes.map((target, idx) => (
        <div
          key={`target-${idx}`}
          className="target-outline"
          style={{
            left: target.x - target.width / 2,
            top: target.y - target.height / 2,
            width: target.width,
            height: target.height,
            transform: `rotate(${target.rotation}deg)`,
          }}
        >
          {renderTargetOutlineSVG(target.type, target.width, target.height)}
        </div>
      ))}

      {shapes.map((shape) => (
        <div
          key={shape.id}
          className={`shape-element${selectedShapeId === shape.id ? ' selected' : ''}${
            draggingId === shape.id ? ' dragging' : ''
          }${snappingId === shape.id ? ' snap-animate' : ''}`}
          style={{
            left: shape.x - shape.width / 2,
            top: shape.y - shape.height / 2,
            width: shape.width,
            height: shape.height,
            transform: `rotate(${shape.rotation}deg)`,
          }}
          onMouseDown={(e) => handleMouseDown(e, shape)}
        >
          {renderShapeSVG(shape.type, shape.width, shape.height, shape.color)}
        </div>
      ))}

      <div className="particle-canvas">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
