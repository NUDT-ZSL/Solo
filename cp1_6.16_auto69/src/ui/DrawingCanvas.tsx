import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point } from '../game/SpellMatcher';

interface DrawingCanvasProps {
  onDrawingComplete: (points: Point[]) => void;
  onDrawingStart?: () => void;
  speedMultiplier?: number;
  disabled?: boolean;
  height?: number;
  showInvalid?: boolean;
  isCooldownMode?: boolean;
  cooldownSpellName?: string;
}

const MAX_POINTS = 100;
const FADE_DURATION_NORMAL = 500;
const FADE_DURATION_COOLDOWN = 300;
const INVALID_MESSAGE_DURATION = 500;
const COOLDOWN_FLASH_INTERVAL = 150;

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onDrawingComplete,
  onDrawingStart,
  speedMultiplier = 1,
  disabled = false,
  height = 250,
  showInvalid = false,
  isCooldownMode = false,
  cooldownSpellName = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showCooldownMsg, setShowCooldownMsg] = useState(false);
  const pathRef = useRef<Point[]>([]);
  const fadeStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const cooldownModeRef = useRef(isCooldownMode);

  useEffect(() => {
    cooldownModeRef.current = isCooldownMode;
  }, [isCooldownMode]);

  useEffect(() => {
    if (isCooldownMode && isDrawing) {
      setShowCooldownMsg(true);
      const timer = setTimeout(() => setShowCooldownMsg(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isCooldownMode, isDrawing]);

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

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: Point[], opacity: number = 1, cooldown: boolean = false) => {
    if (path.length < 2) return;
    
    const flashPhase = cooldown 
      ? Math.floor(Date.now() / COOLDOWN_FLASH_INTERVAL) % 2 
      : 0;
    
    const strokeColor = cooldown 
      ? (flashPhase === 0 ? '#E74C3C' : '#FF6B6B')
      : '#00D4FF';
    const pointColor = cooldown
      ? (flashPhase === 0 ? '#FFFFFF' : '#FFCCCC')
      : '#FFFFFF';
    const shadowColor = cooldown ? '#E74C3C' : '#00D4FF';
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = cooldown ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = cooldown ? 15 : 10;
    
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = pointColor;
    ctx.shadowColor = pointColor;
    ctx.shadowBlur = cooldown ? 8 : 5;
    
    const step = cooldown ? 2 : 3;
    for (let i = 0; i < path.length; i += step) {
      const pointSize = cooldown ? (flashPhase === 0 ? 3 : 2) : 2;
      ctx.beginPath();
      ctx.arc(path[i].x, path[i].y, pointSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, cooldown: boolean) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (cooldown) {
      gradient.addColorStop(0, '#3D1B1B');
      gradient.addColorStop(1, '#2E0E0E');
    } else {
      gradient.addColorStop(0, '#2C1B4D');
      gradient.addColorStop(1, '#1A0E2E');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = cooldown ? 'rgba(231, 76, 60, 0.4)' : 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    const cooldown = cooldownModeRef.current;
    const fadeDuration = cooldown ? FADE_DURATION_COOLDOWN : FADE_DURATION_NORMAL;
    
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height, cooldown);
    
    const path = pathRef.current;
    
    if (fadeStartTimeRef.current !== null) {
      const elapsed = Date.now() - fadeStartTimeRef.current;
      const progress = Math.min(1, elapsed / fadeDuration);
      const opacity = 1 - progress;
      
      if (opacity > 0) {
        drawPath(ctx, path, opacity, cooldown);
        animationFrameRef.current = requestAnimationFrame(render);
      } else {
        fadeStartTimeRef.current = null;
        pathRef.current = [];
      }
    } else if (path.length > 0) {
      drawPath(ctx, path, 1, cooldown);
      
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
            color: isCooldownMode ? 'rgba(231, 76, 60, 0.6)' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '16px',
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          {isCooldownMode ? '绘制咒语（冷却中）' : '绘制咒语'}
        </div>
      )}
      
      {showCooldownMsg && (
        <div 
          className="cooldown-message"
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#E74C3C',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(231, 76, 60, 0.8)',
            pointerEvents: 'none',
            animation: 'cooldownFade 0.8s ease-out forwards',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}
        >
          {cooldownSpellName ? `${cooldownSpellName}冷却中` : '冷却中'}
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
        @keyframes cooldownFade {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          20% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default DrawingCanvas;
