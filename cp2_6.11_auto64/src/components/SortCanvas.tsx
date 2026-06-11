import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useSort } from '../context/SortContext';
import { easeInOutQuad } from '../utils/sortSimulator';

interface BarPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  index: number;
}

const COLORS = {
  default: '#4a90e2',
  compare: '#ffd700',
  swap: '#ff8c00',
  sorted: '#4caf50',
  bgGradientStart: '#16213e',
  bgGradientEnd: '#0f3460',
  grid: 'rgba(255, 255, 255, 0.05)',
};

const SWAP_DURATION = 300;
const FRAME_INTERVAL = 1000 / 60;

export const SortCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const playStartTimeRef = useRef<number>(0);
  
  const {
    currentArray,
    steps,
    currentStepIndex,
    isPlaying,
    speed,
    isComplete,
    stepForward,
    setIsPlaying,
  } = useSort();

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [swapProgress, setSwapProgress] = useState(1);
  const [isSwapping, setIsSwapping] = useState(false);
  const [prevStepIndex, setPrevStepIndex] = useState(0);

  const currentStep = steps[currentStepIndex];
  const prevStep = steps[Math.max(0, prevStepIndex)];

  const displayArray = useMemo(() => {
    if (!currentStep) return currentArray;
    return currentStep.array;
  }, [currentStep, currentArray]);

  const sortedIndices = useMemo(() => {
    const indices = new Set<number>();
    if (!currentStep) return indices;
    const sortedCount = currentStep.sortedCount;
    for (let i = currentArray.length - sortedCount; i < currentArray.length; i++) {
      if (i >= 0) indices.add(i);
    }
    return indices;
  }, [currentStep, currentArray.length]);

  const highlightType = useMemo(() => {
    if (!currentStep) return null;
    return currentStep.type;
  }, [currentStep]);

  const highlightIndices = useMemo(() => {
    if (!currentStep) return [];
    return currentStep.indices;
  }, [currentStep]);

  const resizeCanvas = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(rect.width, 400);
    const height = Math.max(rect.height, 400);
    
    setDimensions({ width, height });
    
    const canvas = canvasRef.current;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    offscreenCanvasRef.current.width = width * dpr;
    offscreenCanvasRef.current.height = height * dpr;
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  const calculateBarPositions = useCallback((
    arr: number[],
    w: number,
    h: number
  ): BarPosition[] => {
    if (arr.length === 0) return [];
    
    const padding = 40;
    const topPadding = 60;
    const bottomPadding = 80;
    const availableWidth = w - padding * 2;
    const availableHeight = h - topPadding - bottomPadding;
    const gap = Math.max(2, Math.min(6, availableWidth / arr.length * 0.15));
    const barWidth = (availableWidth - gap * (arr.length - 1)) / arr.length;
    
    const maxValue = Math.max(...arr, 1);
    
    return arr.map((value, index) => {
      const barHeight = (value / maxValue) * availableHeight;
      const x = padding + index * (barWidth + gap);
      const y = topPadding + availableHeight - barHeight;
      
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        value,
        index,
      };
    });
  }, []);

  const getBarColor = useCallback((
    index: number,
    positions: BarPosition[]
  ): { main: string; glow: string } => {
    if (sortedIndices.has(index)) {
      return { main: COLORS.sorted, glow: 'rgba(76, 175, 80, 0.5)' };
    }
    
    if (highlightIndices.includes(index)) {
      if (highlightType === 'swap' || (highlightType === 'compare' && isSwapping)) {
        return { main: COLORS.swap, glow: 'rgba(255, 140, 0, 0.6)' };
      }
      if (highlightType === 'compare') {
        return { main: COLORS.compare, glow: 'rgba(255, 215, 0, 0.6)' };
      }
    }
    
    return { main: COLORS.default, glow: 'rgba(74, 144, 226, 0.4)' };
  }, [sortedIndices, highlightIndices, highlightType, isSwapping]);

  const drawBar = useCallback((
    ctx: CanvasRenderingContext2D,
    pos: BarPosition,
    color: { main: string; glow: string },
    isHighlighted: boolean,
    pulseOffset: number = 0
  ) => {
    const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + pos.height);
    gradient.addColorStop(0, color.main);
    gradient.addColorStop(1, adjustBrightness(color.main, -30));
    
    if (isHighlighted) {
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 15 + pulseOffset * 10;
    }
    
    const radius = Math.min(4, pos.width / 2);
    ctx.fillStyle = gradient;
    roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    if (pos.height > 25) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${Math.min(12, pos.width * 0.6)}px 'Roboto Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(pos.value), pos.x + pos.width / 2, pos.y + pos.height / 2);
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `10px 'Roboto Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`[${pos.index}]`, pos.x + pos.width / 2, pos.y + pos.height + 18);
  }, []);

  const draw = useCallback((progress: number = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, COLORS.bgGradientStart);
    bgGradient.addColorStop(1, COLORS.bgGradientEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    drawGrid(ctx, width, height);
    
    const titleFont = "600 18px 'Orbitron', sans-serif";
    ctx.font = titleFont;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText('排序可视化舞台', width / 2, 32);
    
    if (displayArray.length === 0) return;
    
    const positions = calculateBarPositions(displayArray, width, height);
    
    let displayPositions = positions;
    if (isSwapping && highlightIndices.length === 2 && prevStep) {
      const [i1, i2] = highlightIndices;
      const prevPositions = calculateBarPositions(prevStep.array, width, height);
      displayPositions = positions.map((p, idx) => {
        if (idx === i1 || idx === i2) {
          const targetPos = idx === i1 ? prevPositions[i2] : prevPositions[i1];
          const startPos = idx === i1 ? prevPositions[i1] : prevPositions[i2];
          const easedProgress = easeInOutQuad(progress);
          return {
            ...p,
            x: startPos.x + (p.x - targetPos.x + (targetPos.x - startPos.x)) * easedProgress,
          };
        }
        return p;
      });
    }
    
    const pulsePhase = (Date.now() % 2000) / 2000;
    const pulseOffset = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5;
    
    displayPositions.forEach((pos, index) => {
      const color = getBarColor(index, positions);
      const isHighlighted = highlightIndices.includes(index) || sortedIndices.has(index);
      drawBar(ctx, pos, color, isHighlighted, isHighlighted ? pulseOffset : 0);
    });
    
    if (currentStep) {
      const stepInfo = `步骤 ${currentStepIndex + 1} / ${steps.length} | ${getOperationText(currentStep.type)}`;
      ctx.font = "500 13px 'Roboto Mono', monospace";
      ctx.fillStyle = '#a0a0a0';
      ctx.textAlign = 'center';
      ctx.fillText(stepInfo, width / 2, height - 20);
    }
  }, [dimensions, displayArray, steps, currentStepIndex, currentStep, isSwapping,
      highlightIndices, sortedIndices, prevStep, drawGrid, calculateBarPositions,
      getBarColor, drawBar]);

  useEffect(() => {
    let localProgress = swapProgress;
    
    if (currentStepIndex !== prevStepIndex) {
      const wasSwap = prevStep && prevStep.type === 'swap';
      if (wasSwap && highlightIndices.length === 2) {
        setIsSwapping(true);
        localProgress = 0;
        setSwapProgress(0);
        
        const startTime = performance.now();
        const animateSwap = () => {
          const elapsed = performance.now() - startTime;
          const adjustedDuration = SWAP_DURATION / speed;
          const p = Math.min(elapsed / adjustedDuration, 1);
          localProgress = p;
          setSwapProgress(p);
          draw(p);
          
          if (p < 1) {
            requestAnimationFrame(animateSwap);
          } else {
            setIsSwapping(false);
            setPrevStepIndex(currentStepIndex);
          }
        };
        requestAnimationFrame(animateSwap);
      } else {
        setPrevStepIndex(currentStepIndex);
        draw(1);
      }
    } else {
      draw(localProgress);
    }
  }, [currentStepIndex, prevStepIndex, draw, speed, highlightIndices, prevStep, swapProgress]);

  useEffect(() => {
    if (!isPlaying || isSwapping) return;
    
    const baseInterval = 400;
    const interval = baseInterval / speed;
    
    playStartTimeRef.current = performance.now();
    let lastStepTime = performance.now();
    
    const playLoop = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= FRAME_INTERVAL) {
        lastFrameTimeRef.current = timestamp;
        draw(1);
      }
      
      if (timestamp - lastStepTime >= interval) {
        lastStepTime = timestamp;
        
        if (currentStepIndex >= steps.length - 1) {
          setIsPlaying(false);
          return;
        }
        
        stepForward();
      }
      
      animationFrameRef.current = requestAnimationFrame(playLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(playLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isSwapping, speed, currentStepIndex, steps.length, stepForward, setIsPlaying, draw]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    if (!isPlaying) {
      draw(1);
    }
  }, [draw, isPlaying, dimensions]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 500,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        background: 'linear-gradient(135deg, #16213e, #0f3460)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {isComplete && (
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
            color: 'white',
            padding: '10px 28px',
            borderRadius: 24,
            fontWeight: 600,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
            boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          ✓ 排序完成！
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
}

function getOperationText(type: string): string {
  switch (type) {
    case 'compare':
      return '🔍 比较操作';
    case 'swap':
      return '🔄 交换操作';
    case 'sorted':
      return '✅ 标记已排序';
    default:
      return type;
  }
}
