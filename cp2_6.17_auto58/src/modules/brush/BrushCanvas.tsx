import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { BrushEngine, Stroke, StrokeSegment, Point, BrushConfig } from './BrushEngine';

export interface BrushCanvasProps {
  width: number;
  height: number;
  poetryText?: string;
  mode: 'tracing' | 'free';
  onCompletedCharacters?: Set<number>;
  brushConfig?: Partial<BrushConfig>;
}

export interface BrushCanvasHandle {
  undo: () => void;
  clear: () => void;
  getStrokes: () => Stroke[];
  getCanvas: () => HTMLCanvasElement | null;
  exportToSVG: (options: ExportOptions) => string;
  getCompletedCharacters: () => Set<number>;
}

export interface ExportOptions {
  scrollStyle: 'plain' | 'vintage' | 'red';
  showSeal: boolean;
  sealText: string;
}

interface CharacterPosition {
  index: number;
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const BrushCanvas = forwardRef<BrushCanvasHandle, BrushCanvasProps>(({
  width,
  height,
  poetryText = '',
  mode,
  brushConfig,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BrushEngine>(new BrushEngine());
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const rawPointsRef = useRef<Point[]>([]);
  const completedCharsRef = useRef<Set<number>>(new Set());
  const characterPositionsRef = useRef<CharacterPosition[]>([]);
  const rafRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (brushConfig) {
      engineRef.current.setConfig(brushConfig);
    }
  }, [brushConfig]);

  const drawPaperBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.2
    );
    gradient.addColorStop(0, '#f5f0e8');
    gradient.addColorStop(1, '#e8dcc8');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }, [width, height]);

  const drawPoetryText = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!poetryText || mode !== 'tracing') {
      characterPositionsRef.current = [];
      return;
    }

    const chars = poetryText.replace(/[\n\s]/g, '').split('');
    const charsPerColumn = Math.ceil(chars.length / 2);
    const columns = Math.ceil(chars.length / charsPerColumn);
    const fontSize = Math.min(56, Math.floor(height / (charsPerColumn + 2)));
    const columnGap = fontSize * 1.4;
    const charGap = fontSize * 1.2;

    const totalWidth = columns * columnGap;
    const totalHeight = charsPerColumn * charGap;
    const startX = (width + totalWidth) / 2 - columnGap / 2;
    const startY = (height - totalHeight) / 2 + fontSize / 2;

    characterPositionsRef.current = [];

    ctx.font = `${fontSize}px "Noto Serif SC", "SimSun", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    chars.forEach((char, index) => {
      const col = Math.floor(index / charsPerColumn);
      const row = index % charsPerColumn;
      const x = startX - col * columnGap;
      const y = startY + row * charGap;

      const isCompleted = completedCharsRef.current.has(index);

      characterPositionsRef.current.push({
        index,
        char,
        x,
        y,
        width: fontSize * 0.9,
        height: fontSize * 0.9,
      });

      if (isCompleted) {
        ctx.fillStyle = 'rgba(107, 142, 35, 0.4)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      }

      ctx.fillText(char, x, y);
    });
  }, [poetryText, mode, width, height]);

  const drawStrokeSegment = useCallback((ctx: CanvasRenderingContext2D, segment: StrokeSegment) => {
    const { x, y, width, opacity } = segment;

    engineRef.current.simulateInkSpread(ctx, segment);

    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.arc(x, y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }, []);

  const drawAllStrokes = useCallback((ctx: CanvasRenderingContext2D) => {
    strokesRef.current.forEach(stroke => {
      if (stroke.segments.length < 2) {
        stroke.segments.forEach(seg => drawStrokeSegment(ctx, seg));
        return;
      }

      for (let i = 0; i < stroke.segments.length - 1; i++) {
        const p1 = stroke.segments[i];
        const p2 = stroke.segments[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.ceil(dist / 1.5));

        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const x = p1.x + dx * t;
          const y = p1.y + dy * t;
          const width = p1.width + (p2.width - p1.width) * t;
          const opacity = p1.opacity + (p2.opacity - p1.opacity) * t;

          drawStrokeSegment(ctx, { x, y, width, opacity });
        }
      }
    });
  }, [drawStrokeSegment]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    drawPaperBackground(ctx);
    drawPoetryText(ctx);
    drawAllStrokes(ctx);
  }, [width, height, drawPaperBackground, drawPoetryText, drawAllStrokes]);

  useEffect(() => {
    render();
  }, [render, poetryText, mode]);

  const checkCharacterCompletion = useCallback((lastPoint: { x: number; y: number }) => {
    if (mode !== 'tracing') return;

    characterPositionsRef.current.forEach(charPos => {
      if (completedCharsRef.current.has(charPos.index)) return;

      const dx = lastPoint.x - charPos.x;
      const dy = lastPoint.y - charPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < charPos.width * 0.7) {
        completedCharsRef.current.add(charPos.index);
      }
    });
  }, [mode]);

  const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number, pressure: number;

    if (e instanceof TouchEvent) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      pressure = (touch as any).force || 0.5;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
      pressure = (e as any).pressure || 0.7;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      pressure,
      timestamp: performance.now(),
    };
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const point = getCanvasPoint(e);
    rawPointsRef.current = [point];
    engineRef.current.startStroke(point);
  }, [getCanvasPoint]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    rawPointsRef.current.push(point);

    const segments = engineRef.current.continueStroke(point);

    if (segments.length > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        if (segments.length === 1) {
          drawStrokeSegment(ctx, segments[0]);
        } else {
          const p1 = segments[0];
          const p2 = segments[1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.ceil(dist / 1.5));

          for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            drawStrokeSegment(ctx, {
              x: p1.x + dx * t,
              y: p1.y + dy * t,
              width: p1.width + (p2.width - p1.width) * t,
              opacity: p1.opacity + (p2.opacity - p1.opacity) * t,
            });
          }
        }
      }
    }
  }, [getCanvasPoint, drawStrokeSegment]);

  const handleMouseUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const point = getCanvasPoint(e);
    rawPointsRef.current.push(point);

    const interpolated = engineRef.current.interpolateBezier(rawPointsRef.current, 8);
    const stroke = engineRef.current.endStroke(point);

    if (interpolated.length > 1) {
      stroke.segments = interpolated;
    }

    strokesRef.current.push(stroke);
    rawPointsRef.current = [];

    checkCharacterCompletion(point);
    render();
    forceUpdate(n => n + 1);
  }, [getCanvasPoint, checkCharacterCompletion, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);

      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (strokesRef.current.length > 0) {
        strokesRef.current.pop();
        render();
        forceUpdate(n => n + 1);
      }
    },
    clear: () => {
      strokesRef.current = [];
      completedCharsRef.current = new Set();
      render();
      forceUpdate(n => n + 1);
    },
    getStrokes: () => strokesRef.current,
    getCanvas: () => canvasRef.current,
    getCompletedCharacters: () => new Set(completedCharsRef.current),
    exportToSVG: (options: ExportOptions) => {
      const { scrollStyle, showSeal, sealText } = options;

      let bgGradient = '';
      let borderColor = 'transparent';
      let borderWidth = 0;

      switch (scrollStyle) {
        case 'vintage':
          bgGradient = `
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f5e6c8"/>
                <stop offset="100%" stop-color="#e8d4a8"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
          `;
          break;
        case 'red':
          bgGradient = `
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f8e8e0"/>
                <stop offset="100%" stop-color="#f0d0c0"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
          `;
          borderColor = '#c62828';
          borderWidth = 3;
          break;
        case 'plain':
        default:
          bgGradient = `
            <defs>
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#faf8f5"/>
                <stop offset="100%" stop-color="#f0ebe3"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)"/>
          `;
      }

      let poetryPaths = '';
      if (poetryText && mode === 'tracing') {
        const chars = poetryText.replace(/[\n\s]/g, '').split('');
        const charsPerColumn = Math.ceil(chars.length / 2);
        const columns = Math.ceil(chars.length / charsPerColumn);
        const fontSize = Math.min(56, Math.floor(height / (charsPerColumn + 2)));
        const columnGap = fontSize * 1.4;
        const charGap = fontSize * 1.2;
        const totalWidth = columns * columnGap;
        const totalHeight = charsPerColumn * charGap;
        const startX = (width + totalWidth) / 2 - columnGap / 2;
        const startY = (height - totalHeight) / 2 + fontSize / 2;

        poetryPaths = `
          <defs>
            <style>
              .poetry-char { font-family: "Noto Serif SC", "SimSun", serif; font-size: ${fontSize}px; text-anchor: middle; dominant-baseline: middle; }
            </style>
          </defs>
        `;

        chars.forEach((char, index) => {
          const col = Math.floor(index / charsPerColumn);
          const row = index % charsPerColumn;
          const x = startX - col * columnGap;
          const y = startY + row * charGap;
          const isCompleted = completedCharsRef.current.has(index);
          const color = isCompleted ? 'rgba(107, 142, 35, 0.4)' : 'rgba(0, 0, 0, 0.2)';
          poetryPaths += `<text class="poetry-char" x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${color}">${char}</text>`;
        });
      }

      let strokePaths = '';
      strokesRef.current.forEach(stroke => {
        if (stroke.segments.length < 2) return;

        for (let i = 0; i < stroke.segments.length - 1; i++) {
          const p1 = stroke.segments[i];
          const p2 = stroke.segments[i + 1];
          const avgWidth = ((p1.width + p2.width) / 2).toFixed(1);
          const avgOpacity = ((p1.opacity + p2.opacity) / 2).toFixed(2);
          strokePaths += `
            <line
              x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}"
              x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"
              stroke="rgba(0,0,0,${avgOpacity})"
              stroke-width="${avgWidth}"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          `;
        }
      });

      let sealElement = '';
      if (showSeal) {
        const sealSize = 30;
        const sealX = width - sealSize - 20;
        const sealY = height - sealSize - 20;
        const sealChar = sealText ? sealText.charAt(0) : '印';
        sealElement = `
          <circle cx="${sealX + sealSize / 2}" cy="${sealY + sealSize / 2}" r="${sealSize / 2}" fill="#c62828" opacity="0.9"/>
          <text
            x="${sealX + sealSize / 2}" y="${sealY + sealSize / 2}"
            text-anchor="middle" dominant-baseline="middle"
            fill="white"
            font-family="'Noto Serif SC', serif"
            font-size="16"
            font-weight="bold"
          >${sealChar}</text>
        `;
      }

      const borderRect = borderWidth > 0
        ? `<rect x="${borderWidth}" y="${borderWidth}" width="${width - borderWidth * 2}" height="${height - borderWidth * 2}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}" stroke-dasharray="8,4"/>`
        : '';

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${bgGradient}
  ${borderRect}
  ${poetryPaths}
  ${strokePaths}
  ${sealElement}
</svg>`;
    },
  }), [render, poetryText, mode, width, height]);

  return (
    <div className="canvas-wrapper" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="paper-canvas"
        style={{ width, height }}
      />
    </div>
  );
});

BrushCanvas.displayName = 'BrushCanvas';

export default BrushCanvas;
