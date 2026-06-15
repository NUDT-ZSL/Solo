import React, { useRef, useEffect, useCallback, useState } from 'react';
import SoundEngine from './SoundEngine';
import CollaborationHub, { StrokeData, DrawPoint } from './CollaborationHub';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
};

type SoundCanvasProps = {
  color: string;
  lineWidth: number;
  tool: 'brush' | 'eraser';
  soundEngine: SoundEngine;
  hub: CollaborationHub;
};

const SoundCanvas: React.FC<SoundCanvasProps> = ({ color, lineWidth, tool, soundEngine, hub }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Map<string, StrokeData>>(new Map());
  const currentStrokeRef = useRef<StrokeData | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animFrameRef = useRef<number>(0);
  const remoteStrokesRef = useRef<Map<string, { points: DrawPoint[]; color: string; lineWidth: number; tool: string }>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const generateStrokeId = useCallback(() => {
    return `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }, []);

  const addRipple = useCallback((x: number, y: number, col: string) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 0,
      maxRadius: 30 + Math.random() * 20,
      life: 1,
      maxLife: 1,
      color: col,
    });
  }, []);

  const addParticles = useCallback((x: number, y: number, col: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: col,
        size: 1 + Math.random() * 3,
      });
    }
  }, []);

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: StrokeData | { points: DrawPoint[]; color: string; lineWidth: number; tool: string }) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if ('tool' in stroke && stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 8;
      }

      ctx.lineWidth = stroke.lineWidth;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      if (stroke.points.length === 2) {
        ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
      } else {
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    },
    []
  );

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    remoteStrokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });
  }, [drawStroke]);

  const animateEffects = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ripplesRef.current = ripplesRef.current.filter((r) => {
      r.life -= 0.025;
      r.radius += 1.5;
      if (r.life <= 0) return false;

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.life * 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return true;
    });

    particlesRef.current = particlesRef.current.filter((p) => {
      p.life -= 0.02;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      if (p.life <= 0) return false;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life * 0.8;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      return true;
    });

    animFrameRef.current = requestAnimationFrame(animateEffects);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animateEffects);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animateEffects]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      setCanvasSize({ width: clientWidth, height: clientHeight });
      redrawAll();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawAll]);

  useEffect(() => {
    hub.on({
      onStrokeStart: (stroke) => {
        remoteStrokesRef.current.set(stroke.id, {
          points: [...stroke.points],
          color: stroke.color,
          lineWidth: stroke.lineWidth,
          tool: stroke.tool,
        });
        redrawAll();
      },
      onStrokeMove: (strokeId, point, col) => {
        const remote = remoteStrokesRef.current.get(strokeId);
        if (remote) {
          remote.points.push(point);
          redrawAll();
          if (remote.tool !== 'eraser') {
            addParticles(point.x, point.y, col, 1);
          }
        }
      },
      onStrokeEnd: (strokeId) => {
        const remote = remoteStrokesRef.current.get(strokeId);
        if (remote && remote.points.length > 0) {
          const last = remote.points[remote.points.length - 1];
          if (remote.tool !== 'eraser') {
            addRipple(last.x, last.y, remote.color);
          }
        }
        const remoteStroke = remoteStrokesRef.current.get(strokeId);
        if (remoteStroke) {
          strokesRef.current.set(strokeId, {
            id: strokeId,
            userId: '',
            color: remoteStroke.color,
            lineWidth: remoteStroke.lineWidth,
            points: remoteStroke.points,
            tool: remoteStroke.tool as 'brush' | 'eraser',
          });
          remoteStrokesRef.current.delete(strokeId);
        }
      },
      onClear: () => {
        strokesRef.current.clear();
        remoteStrokesRef.current.clear();
        redrawAll();
      },
      onHistory: (strokes) => {
        strokesRef.current.clear();
        strokes.forEach((s) => strokesRef.current.set(s.id, s));
        redrawAll();
      },
    });
  }, [hub, redrawAll, addRipple, addParticles]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      if (!point) return;

      const strokeId = generateStrokeId();
      const stroke: StrokeData = {
        id: strokeId,
        userId: hub.getUserId(),
        color: tool === 'eraser' ? '#000000' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        points: [point],
        tool,
      };

      currentStrokeRef.current = stroke;
      isDrawingRef.current = true;
      strokesRef.current.set(strokeId, stroke);

      if (tool !== 'eraser') {
        soundEngine.playNote(color, point.x, point.y, canvasSize.width, canvasSize.height, strokeId);
        addRipple(point.x, point.y, color);
        addParticles(point.x, point.y, color, 8);
        hub.sendStrokeStart(stroke);
      }
    },
    [color, lineWidth, tool, soundEngine, hub, canvasSize, getCanvasPoint, generateStrokeId, addRipple, addParticles]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || !currentStrokeRef.current) return;

      const point = getCanvasPoint(e);
      if (!point) return;

      currentStrokeRef.current.points.push(point);
      const strokeId = currentStrokeRef.current.id;

      if (tool !== 'eraser') {
        soundEngine.updateNote(color, point.x, point.y, canvasSize.width, canvasSize.height, strokeId);
        addParticles(point.x, point.y, color, 1);
        hub.sendStrokeMove(strokeId, point, color);
      }

      redrawAll();
    },
    [color, tool, soundEngine, hub, canvasSize, getCanvasPoint, addParticles, redrawAll]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const strokeId = currentStrokeRef.current.id;
    const points = currentStrokeRef.current.points;

    if (tool !== 'eraser' && points.length > 0) {
      const last = points[points.length - 1];
      soundEngine.stopNote(strokeId);
      addRipple(last.x, last.y, color);
      hub.sendStrokeEnd(strokeId);
    }

    isDrawingRef.current = false;
    currentStrokeRef.current = null;
  }, [tool, soundEngine, hub, color, addRipple]);

  useEffect(() => {
    const handleGlobalUp = () => handlePointerUp();
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [handlePointerUp]);

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: tool === 'eraser' ? 'crosshair' : 'crosshair',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#0a0a1a',
        boxShadow: '0 0 30px rgba(0, 200, 255, 0.1), inset 0 0 60px rgba(0, 0, 0, 0.5)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={canvasStyle}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
      />
      <canvas
        ref={overlayRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ ...canvasStyle, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default SoundCanvas;
