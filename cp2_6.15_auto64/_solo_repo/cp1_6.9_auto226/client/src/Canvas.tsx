import React, { useRef, useEffect, useCallback, useState } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface DrawAction {
  id: string;
  userId: string;
  type: 'draw';
  points: Point[];
  color: string;
  lineWidth: number;
  isEraser: boolean;
  timestamp: number;
}

interface CanvasProps {
  userId: string;
  userColor: string;
  selectedColor: string;
  lineWidth: number;
  isEraser: boolean;
  isReplaying: boolean;
  replayActions: DrawAction[];
  onDrawAction: (action: Omit<DrawAction, 'id' | 'userId' | 'timestamp' | 'type'>) => void;
  onHoverUser: (userName: string | null) => void;
}

interface StrokePath {
  points: Point[];
  color: string;
  lineWidth: number;
  isEraser: boolean;
  userId: string;
  userName?: string;
}

const Canvas: React.FC<CanvasProps> = ({
  userId,
  userColor,
  selectedColor,
  lineWidth,
  isEraser,
  isReplaying,
  replayActions,
  onDrawAction,
  onHoverUser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const strokesRef = useRef<Map<string, StrokePath>>(new Map());
  const userNamesRef = useRef<Map<string, string>>(new Map());
  const replayIndexRef = useRef(0);
  const replayFrameRef = useRef<number | null>(null);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    redrawAll();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const drawStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    lineWidthVal: number,
    isEraserVal: boolean
  ) => {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidthVal;

    if (isEraserVal) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke.points, stroke.color, stroke.lineWidth, stroke.isEraser);
    });
  }, [drawStroke]);

  const clearCanvas = useCallback(() => {
    strokesRef.current.clear();
    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    (window as any).__clearCanvas = clearCanvas;
    return () => {
      delete (window as any).__clearCanvas;
    };
  }, [clearCanvas]);

  const addStroke = useCallback((action: DrawAction, userName?: string) => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    strokesRef.current.set(action.id, {
      points: action.points,
      color: action.color,
      lineWidth: action.lineWidth,
      isEraser: action.isEraser,
      userId: action.userId,
      userName,
    });

    drawStroke(ctx, action.points, action.color, action.lineWidth, action.isEraser);
  }, [drawStroke]);

  useEffect(() => {
    (window as any).__addStroke = addStroke;
    return () => {
      delete (window as any).__addStroke;
    };
  }, [addStroke]);

  useEffect(() => {
    (window as any).__setUserName = (uid: string, name: string) => {
      userNamesRef.current.set(uid, name);
    };
    return () => {
      delete (window as any).__setUserName;
    };
  }, []);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReplaying) return;
    const point = getCanvasPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [point];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReplaying) return;
    const point = getCanvasPoint(e);
    if (!point) return;

    checkHoveredUser(point);

    if (!isDrawingRef.current) return;

    const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
    if (lastPoint) {
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      if (dx * dx + dy * dy < 1) return;
    }

    currentPointsRef.current.push(point);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && currentPointsRef.current.length >= 2) {
      const pts = currentPointsRef.current;
      const color = isEraser ? '#FFFFFF' : selectedColor;
      drawStroke(ctx, [pts[pts.length - 2], pts[pts.length - 1]], color, lineWidth, isEraser);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 1) {
      onDrawAction({
        points: currentPointsRef.current,
        color: isEraser ? '#FFFFFF' : selectedColor,
        lineWidth,
        isEraser,
      });
    }
    currentPointsRef.current = [];
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const checkHoveredUser = (point: Point) => {
    let foundUser: string | null = null;
    strokesRef.current.forEach((stroke) => {
      if (foundUser) return;
      for (const p of stroke.points) {
        const dist = Math.sqrt((p.x - point.x) ** 2 + (p.y - point.y) ** 2);
        if (dist < stroke.lineWidth / 2 + 5) {
          foundUser = stroke.userName || userNamesRef.current.get(stroke.userId) || '匿名用户';
          break;
        }
      }
    });
    if (foundUser !== hoveredUser) {
      setHoveredUser(foundUser);
      onHoverUser(foundUser);
    }
  };

  useEffect(() => {
    if (!isReplaying) {
      replayIndexRef.current = 0;
      if (replayFrameRef.current) {
        cancelAnimationFrame(replayFrameRef.current);
        replayFrameRef.current = null;
      }
      return;
    }

    if (replayActions.length === 0) return;

    clearCanvas();
    replayIndexRef.current = 0;

    const playNext = () => {
      if (replayIndexRef.current >= replayActions.length) {
        replayFrameRef.current = null;
        return;
      }

      const action = replayActions[replayIndexRef.current];
      addStroke(action);
      replayIndexRef.current++;

      if (replayIndexRef.current < replayActions.length) {
        const current = replayActions[replayIndexRef.current - 1];
        const next = replayActions[replayIndexRef.current];
        const delay = Math.max(10, next.timestamp - current.timestamp);
        setTimeout(() => {
          replayFrameRef.current = requestAnimationFrame(playNext);
        }, delay);
      } else {
        replayFrameRef.current = null;
      }
    };

    replayFrameRef.current = requestAnimationFrame(playNext);

    return () => {
      if (replayFrameRef.current) {
        cancelAnimationFrame(replayFrameRef.current);
      }
    };
  }, [isReplaying, replayActions, clearCanvas, addStroke]);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isReplaying ? 'default' : (isEraser ? 'cell' : 'crosshair'),
          display: 'block',
          touchAction: 'none',
        }}
      />
      {hoveredUser && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 16px',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          borderRadius: '20px',
          fontSize: '13px',
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease',
        }}>
          绘制者：{hoveredUser}
        </div>
      )}
    </div>
  );
};

export default Canvas;
