import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VineEngine, VineBranch, VineNode } from './VineEngine';
import { BloomManager } from './BloomManager';
import { ControlPanel } from './ControlPanel';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new VineEngine());
  const bloomRef = useRef(new BloomManager());
  const animFrameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [growthSpeed, setGrowthSpeed] = useState(1.0);
  const [flowerDensity, setFlowerDensity] = useState(0.5);
  const [vineCount, setVineCount] = useState(0);
  const [flowerCount, setFlowerCount] = useState(0);

  const interactionRef = useRef({
    isDragging: false,
    dragPath: [] as { x: number; y: number }[],
    currentVineId: -1,
    hasMoved: false,
    startX: 0,
    startY: 0,
  });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.6, 0, w * 0.5, h * 0.6, Math.max(w, h) * 0.8);
    grad.addColorStop(0, '#0a1f0a');
    grad.addColorStop(0.5, '#061206');
    grad.addColorStop(1, '#020802');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const handleInteractionStart = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    const bloom = bloomRef.current;
    const inter = interactionRef.current;

    inter.isDragging = true;
    inter.hasMoved = false;
    inter.startX = x;
    inter.startY = y;
    inter.dragPath = [{ x, y }];

    bloom.addRipple(x, y, 'rgba(144,238,144,0.5)');

    const existingVine = engine.findMainVineAt(x, y, 25);
    if (existingVine) {
      inter.currentVineId = existingVine.id;
    } else {
      inter.currentVineId = -1;
    }
  }, []);

  const handleInteractionMove = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    const inter = interactionRef.current;
    if (!inter.isDragging) return;

    const dx = x - inter.startX;
    const dy = y - inter.startY;
    if (dx * dx + dy * dy > 25) {
      inter.hasMoved = true;
    }

    inter.dragPath.push({ x, y });

    if (inter.currentVineId >= 0 && inter.hasMoved) {
      const lastTwo = inter.dragPath.slice(-2);
      engine.appendPath(inter.currentVineId, lastTwo);
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    const engine = engineRef.current;
    const inter = interactionRef.current;

    if (inter.isDragging && !inter.hasMoved && inter.currentVineId < 0) {
      const seed = engine.plantSeed(inter.startX, inter.startY);
      if (seed) {
        setVineCount(engine.getVineCount());
      }
    } else if (inter.isDragging && inter.hasMoved && inter.currentVineId < 0) {
      const seed = engine.plantSeed(inter.startX, inter.startY);
      if (seed) {
        engine.sproutSeed(seed, inter.dragPath);
        setVineCount(engine.getVineCount());
      }
    }

    inter.isDragging = false;
    inter.dragPath = [];
    inter.currentVineId = -1;
  }, []);

  const handlePlantNew = useCallback(() => {
    const engine = engineRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = w * 0.2 + Math.random() * w * 0.6;
    const y = h * 0.5 + Math.random() * h * 0.3;
    const seed = engine.plantSeed(x, y);
    if (seed) {
      setVineCount(engine.getVineCount());
    }
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const bloom = bloomRef.current;

    engine.setCallbacks(
      (branch: VineBranch) => {},
      (branch: VineBranch, node: VineNode) => {
        if (bloom.shouldCreateBud()) {
          bloom.createBud(node.x + (Math.random() - 0.5) * 6, node.y + (Math.random() - 0.5) * 6);
          setFlowerCount(bloom.getFlowerCount());
        }
      }
    );
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    engine.setGrowthSpeed(growthSpeed);
  }, [growthSpeed]);

  useEffect(() => {
    const bloom = bloomRef.current;
    bloom.setFlowerDensity(flowerDensity);
  }, [flowerDensity]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      handleInteractionStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      handleInteractionMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleInteractionEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      handleInteractionStart(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      handleInteractionMove(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleInteractionEnd();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [resizeCanvas, handleInteractionStart, handleInteractionMove, handleInteractionEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      const engine = engineRef.current;
      const bloom = bloomRef.current;

      engine.update(dt, timestamp);
      bloom.update(dt, timestamp);

      ctx.save();
      drawBackground(ctx);
      engine.draw(ctx, timestamp);
      bloom.draw(ctx, timestamp);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawBackground]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />
      <ControlPanel
        growthSpeed={growthSpeed}
        flowerDensity={flowerDensity}
        onSpeedChange={setGrowthSpeed}
        onDensityChange={setFlowerDensity}
        onPlantNew={handlePlantNew}
        vineCount={vineCount}
        flowerCount={flowerCount}
      />
    </>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

export default App;
