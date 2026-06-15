import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Point, DrawingPath } from '../shared/types';

interface WhiteboardProps {
  brushColor: string;
  brushSize: number;
  currentUserId: string | null;
  roomId: string | null;
  drawings: DrawingPath[];
  onDrawStart: (x: number, y: number, color: string, size: number) => void;
  onDrawMove: (x: number, y: number) => void;
  onDrawEnd: () => void;
  offset: { x: number; y: number };
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  brushColor,
  brushSize,
  currentUserId,
  roomId,
  drawings,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  offset,
  setOffset,
  scale,
  setScale,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<Point | null>(null);
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const activeRemotePathsRef = useRef<Map<string, DrawingPath>>(new Map());
  const [, forceRender] = useState(0);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (screenX - rect.left - offset.x) / scale;
      const y = (screenY - rect.top - offset.y) / scale;
      return { x, y };
    },
    [offset, scale]
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1C1C1E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const gridSize = 40;
    const gridColor = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const startX = Math.floor(-offset.x / scale / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-offset.y / scale / gridSize) * gridSize - gridSize;
    const endX = startX + (canvas.width / dpr) / scale + gridSize * 2;
    const endY = startY + (canvas.height / dpr) / scale + gridSize * 2;
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    const drawPath = (path: DrawingPath) => {
      if (path.points.length < 1) return;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    };

    drawings.forEach(drawPath);
    activeRemotePathsRef.current.forEach(drawPath);

    ctx.restore();
  }, [drawings, offset, scale]);

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!roomId || !currentUserId) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }
    if (e.button !== 0) return;
    const world = screenToWorld(e.clientX, e.clientY);
    isDrawingRef.current = true;
    onDrawStart(world.x, world.y, brushColor, brushSize);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current && lastPanPointRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      velocityRef.current = { x: dx, y: dy };
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!isDrawingRef.current || !roomId) return;
    const world = screenToWorld(e.clientX, e.clientY);
    onDrawMove(world.x, world.y);
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanPointRef.current = null;
      const vx = velocityRef.current.x;
      const vy = velocityRef.current.y;
      if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return;
      let cvx = vx;
      let cvy = vy;
      const startTime = performance.now();
      const duration = 300;
      const animate = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= duration) {
          rafIdRef.current = null;
          return;
        }
        const t = 1 - elapsed / duration;
        setOffset((prev) => ({
          x: prev.x + cvx * t * 0.15,
          y: prev.y + cvy * t * 0.15,
        }));
        rafIdRef.current = requestAnimationFrame(animate);
      };
      rafIdRef.current = requestAnimationFrame(animate);
      return;
    }
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onDrawEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((prev) => {
      const next = Math.min(3, Math.max(0.5, prev + delta));
      const canvas = canvasRef.current;
      if (!canvas) return next;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setOffset((prevOff) => ({
        x: mx - (mx - prevOff.x) * (next / prev),
        y: my - (my - prevOff.y) * (next / prev),
      }));
      return next;
    });
  };

  const handleRemoteDrawStart = useCallback(
    (data: { pathId: string; userId: string; x: number; y: number; color: string; size: number }) => {
      if (data.userId === currentUserId) return;
      activeRemotePathsRef.current.set(data.pathId, {
        id: data.pathId,
        userId: data.userId,
        color: data.color,
        size: data.size,
        points: [{ x: data.x, y: data.y }],
      });
      render();
    },
    [currentUserId, render]
  );

  const handleRemoteDrawMove = useCallback(
    (data: { pathId: string; userId: string; x: number; y: number }) => {
      if (data.userId === currentUserId) return;
      const path = activeRemotePathsRef.current.get(data.pathId);
      if (path) {
        path.points.push({ x: data.x, y: data.y });
        render();
      }
    },
    [currentUserId, render]
  );

  const handleRemoteDrawEnd = useCallback(
    (data: { pathId: string; userId: string }) => {
      if (data.userId === currentUserId) return;
      activeRemotePathsRef.current.delete(data.pathId);
      render();
    },
    [currentUserId, render]
  );

  useEffect(() => {
    const win = window as unknown as {
      __remoteDrawStart?: (d: any) => void;
      __remoteDrawMove?: (d: any) => void;
      __remoteDrawEnd?: (d: any) => void;
    };
    win.__remoteDrawStart = handleRemoteDrawStart;
    win.__remoteDrawMove = handleRemoteDrawMove;
    win.__remoteDrawEnd = handleRemoteDrawEnd;
    return () => {
      delete win.__remoteDrawStart;
      delete win.__remoteDrawMove;
      delete win.__remoteDrawEnd;
    };
  }, [handleRemoteDrawStart, handleRemoteDrawMove, handleRemoteDrawEnd]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, cursor: isPanningRef.current ? 'grabbing' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default Whiteboard;
