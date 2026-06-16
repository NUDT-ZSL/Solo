import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point } from '../game/SpellMatcher';

interface DrawingCanvasProps {
  onDrawingComplete: (points: Point[]) => void;
  onDrawingStart?: () => void;
  speedMultiplier?: number;
  disabled?: boolean;
  height?: number;
  showInvalid?: boolean;
}

const MAX_POINTS = 100;
const FADE_DURATION = 500;
const INVALID_MESSAGE_DURATION = 500;

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onDrawingComplete,
  onDrawingStart,
  speedMultiplier = 1,
  disabled = false,
  height = 250,
  showInvalid = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const pathRef = useRef<Point[]>([]);
  const fadeStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const addPoint = useCallback((point: Point) => {
    const path = pathRef.current;
    
    if (path.length >= MAX_POINTS) {
      const step = Math.ceil(path.length / MAX_POINTS);
      const sampled: Point[] = [];
      for (let i = 0; i < path.length; i += step) {
        sampled.push(path[i]);
      }
      pathRef.current = sampled;
    }
    
    pathRef.current.push(point);
    lastPointRef.current = point;
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: Point[], opacity: number = 1) => {
    if (path.length < 2) return;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 5;
    
    for (let i = 0; i < path.length; i += 3) {
      ctx.beginPath();
      ctx.arc(path[i].x, path[i].y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2C1B4D');
    gradient.addColorStop(1, '#1A0E2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height);
    
    const path = pathRef.current;
    
    if (fadeStartTimeRef.current !== null) {
      const elapsed = Date.now() - fadeStartTimeRef.current;
      const progress = Math.min(1, elapsed / FADE_DURATION);
      const opacity = 1 - progress;
      
      if (opacity > 0) {
        drawPath(ctx, path, opacity);
        animationFrameRef.current = requestAnimationFrame(render);
      } else {
        fadeStartTimeRef.current = null;
        pathRef.current = [];
      }
    } else if (path.length > 0) {
      drawPath(ctx, path, 1);
      
      if (isDrawing) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    }
  }, [drawBackground, drawPath, isDrawing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      render();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [height, render]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    const point = getCanvasPoint(e);
    if (!point) return;
    
    setIsDrawing(true);
    pathRef.current = [point];
    lastPointRef.current = point;
    fadeStartTimeRef.current = null;
    
    if (onDrawingStart) {
      onDrawingStart();
    }
    
    render();
  }, [disabled, getCanvasPoint, onDrawingStart, render]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    
    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;
    
    const dx = point.x - lastPointRef.current.x;
    const dy = point.y - lastPointRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 3 / speedMultiplier) {
      addPoint(point);
    }
  }, [isDrawing, disabled, getCanvasPoint, speedMultiplier, addPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (pathRef.current.length > 2) {
      fadeStartTimeRef.current = Date.now();
      onDrawingComplete([...pathRef.current]);
      render();
    } else {
      pathRef.current = [];
      render();
    }
  }, [isDrawing, onDrawingComplete, render]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="drawing-canvas-container"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'crosshair',
        opacity: disabled ? 0.5 : 1
      }}
      onMouseEnter={() => !disabled && setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      
      {isHovering && !isDrawing && !disabled && (
        <div 
          className="canvas-hint"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '16px',
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          绘制咒语
        </div>
      )}
      
      {showInvalid && (
        <div 
          className="invalid-message"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#E74C3C',
            fontSize: '20px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(231, 76, 60, 0.8)',
            pointerEvents: 'none',
            animation: 'invalidFade 0.5s ease-out forwards'
          }}
        >
          咒语无效
        </div>
      )}
      
      <style>{`
        @keyframes invalidFade {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default DrawingCanvas;
