import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Ball,
  Particle,
  createBall,
  updatePhysics,
  rotateBallVelocity,
  deleteBall,
  getBallAtPosition,
  COLOR_PALETTE
} from './physicsEngine';
import { initCanvas, renderScene } from './renderer';
import {
  createControlPanel,
  createTitle,
  createColorPicker,
  UIHandles
} from './uiController';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gravityRef = useRef(0.5);
  const frictionRef = useRef(0.01);
  const isPausedRef = useRef(false);
  const selectedBallIdRef = useRef<string | null>(null);
  const frameCountRef = useRef(0);
  const highlightPhaseRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const uiHandlesRef = useRef<UIHandles | null>(null);
  const titleHandlesRef = useRef<{ destroy: () => void } | null>(null);
  const colorPickerRef = useRef<{ destroy: () => void } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const [ballCount, setBallCount] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = initCanvas(canvas);
    canvasSizeRef.current = size;
  }, []);

  const addBall = useCallback((x: number, y: number, radius: number, color: string) => {
    const ball = createBall(x, y, radius, color);
    ballsRef.current.push(ball);
  }, []);

  const handleGravityChange = useCallback((value: number) => {
    gravityRef.current = value;
  }, []);

  const handleFrictionChange = useCallback((value: number) => {
    frictionRef.current = value;
  }, []);

  const handleReset = useCallback(() => {
    ballsRef.current = [];
    particlesRef.current = [];
    selectedBallIdRef.current = null;
  }, []);

  const handleTogglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  }, []);

  const handleKeyDown = useCallback((key: string) => {
    keysPressed.current.add(key);

    if (key === 'Delete' || key === 'Backspace') {
      const selectedId = selectedBallIdRef.current;
      if (selectedId) {
        const ball = ballsRef.current.find(b => b.id === selectedId);
        if (ball) {
          deleteBall(ball);
          selectedBallIdRef.current = null;
        }
      }
      return;
    }

    const selectedId = selectedBallIdRef.current;
    if (!selectedId) return;

    const ball = ballsRef.current.find(b => b.id === selectedId);
    if (!ball || ball.deleting) return;

    let angle = 0;
    const step = 3;

    if (keysPressed.current.has('ArrowUp') && keysPressed.current.has('ArrowLeft')) {
      angle = -step * 1.414;
    } else if (keysPressed.current.has('ArrowUp') && keysPressed.current.has('ArrowRight')) {
      angle = step * 1.414;
    } else if (keysPressed.current.has('ArrowDown') && keysPressed.current.has('ArrowLeft')) {
      angle = -step * 1.414 * 3;
    } else if (keysPressed.current.has('ArrowDown') && keysPressed.current.has('ArrowRight')) {
      angle = step * 1.414 * 3;
    } else if (key === 'ArrowLeft') {
      angle = -step;
    } else if (key === 'ArrowRight') {
      angle = step;
    } else if (key === 'ArrowUp') {
      angle = -step * 2;
    } else if (key === 'ArrowDown') {
      angle = step * 2;
    }

    if (angle !== 0) {
      rotateBallVelocity(ball, angle);
    }
  }, []);

  const handleKeyUp = useCallback((key: string) => {
    keysPressed.current.delete(key);
  }, []);

  const handleBallSelect = useCallback((ballId: string | null) => {
    selectedBallIdRef.current = ballId;
  }, []);

  const getBallAtPos = useCallback((x: number, y: number): { id: string } | null => {
    const ball = getBallAtPosition(ballsRef.current, x, y);
    return ball ? { id: ball.id } : null;
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedBall = getBallAtPosition(ballsRef.current, x, y);
    if (clickedBall) {
      selectedBallIdRef.current = clickedBall.id;
      return;
    }

    selectedBallIdRef.current = null;
    dragStartRef.current = { x, y };
    isDraggingRef.current = true;
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
  }, []);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragStartRef.current) {
      isDraggingRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const startPos = dragStartRef.current;
    const dx = x - startPos.x;
    const dy = y - startPos.y;
    const dragDist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(40, Math.max(10, 10 + dragDist * 0.3));

    if (colorPickerRef.current) {
      colorPickerRef.current.destroy();
      colorPickerRef.current = null;
    }

    const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    addBall(startPos.x, startPos.y, radius, randomColor);

    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [addBall]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (isDraggingRef.current && dragStartRef.current) {
      const randomColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      addBall(dragStartRef.current.x, dragStartRef.current.y, 20, randomColor);
    }
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, [addBall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleResize();
    window.addEventListener('resize', handleResize);

    const callbacks = {
      onGravityChange: handleGravityChange,
      onFrictionChange: handleFrictionChange,
      onReset: handleReset,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onBallCreate: addBall,
      onBallSelect: handleBallSelect,
      onTogglePause: handleTogglePause,
      getBallAtPosition: getBallAtPos
    };

    uiHandlesRef.current = createControlPanel(document.body, callbacks);
    titleHandlesRef.current = createTitle(document.body, callbacks);

    const animate = () => {
      frameCountRef.current++;
      highlightPhaseRef.current = (frameCountRef.current % 30) / 30;

      if (!isPausedRef.current) {
        const size = canvasSizeRef.current;
        const result = updatePhysics(
          ballsRef.current,
          particlesRef.current,
          gravityRef.current,
          frictionRef.current,
          size.width,
          size.height,
          frameCountRef.current
        );

        setBallCount(
          result.balls.filter(b => !b.deleting).length
        );
        setTotalEnergy(result.totalKineticEnergy);

        if (uiHandlesRef.current) {
          uiHandlesRef.current.updateStats(
            result.balls.filter(b => !b.deleting).length,
            result.totalKineticEnergy
          );
        }
      }

      renderScene(
        ctx,
        ballsRef.current,
        particlesRef.current,
        selectedBallIdRef.current,
        isPausedRef.current,
        canvasSizeRef.current.width,
        canvasSizeRef.current.height,
        highlightPhaseRef.current
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      if (uiHandlesRef.current) uiHandlesRef.current.destroy();
      if (titleHandlesRef.current) titleHandlesRef.current.destroy();
      if (colorPickerRef.current) colorPickerRef.current.destroy();
    };
  }, [
    handleResize,
    handleGravityChange,
    handleFrictionChange,
    handleReset,
    handleKeyDown,
    handleKeyUp,
    addBall,
    handleBallSelect,
    handleTogglePause,
    getBallAtPos
  ]);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: 'calc(100vh - 60px)',
          cursor: 'crosshair'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
      />
    </div>
  );
}

export default App;
