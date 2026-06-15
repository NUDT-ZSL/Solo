import { useRef, useEffect, useCallback } from 'react';
import { useCalligraphyStore } from '@/store';
import {
  type StrokePoint,
  processStroke,
  generatePaperTexture,
  drawInkStroke,
  getStyleConfig,
  compositeForExport,
  exportToPNG,
} from '@/utils/calligraphyEngine';

interface CalligraphyCanvasProps {
  onTextureReady: (canvas: HTMLCanvasElement) => void;
  onInkCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export default function CalligraphyCanvas({ onTextureReady, onInkCanvasReady }: CalligraphyCanvasProps) {
  const textureCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const textureRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const { fontStyle, brushSize, inkDensity } = useCalligraphyStore();

  const dpr = window.devicePixelRatio || 1;

  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const textureCanvas = textureCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!textureCanvas || !inkCanvas) return;

    const inkData = inkCanvas.width > 0 && inkCanvas.height > 0
      ? inkCanvas.getContext('2d')!.getImageData(0, 0, inkCanvas.width, inkCanvas.height)
      : null;

    textureCanvas.width = width * dpr;
    textureCanvas.height = height * dpr;
    textureCanvas.style.width = `${width}px`;
    textureCanvas.style.height = `${height}px`;

    inkCanvas.width = width * dpr;
    inkCanvas.height = height * dpr;
    inkCanvas.style.width = `${width}px`;
    inkCanvas.style.height = `${height}px`;

    const textureCtx = textureCanvas.getContext('2d')!;
    const inkCtx = inkCanvas.getContext('2d')!;
    textureCtx.scale(dpr, dpr);
    inkCtx.scale(dpr, dpr);

    if (inkData) {
      inkCtx.putImageData(inkData, 0, 0);
    }

    textureRef.current = generatePaperTexture(width * dpr, height * dpr);
    const tempCtx = textureCanvas.getContext('2d')!;
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    tempCtx.drawImage(textureRef.current, 0, 0);
    tempCtx.scale(dpr, dpr);

    onTextureReady(textureRef.current);
    onInkCanvasReady(inkCanvas);
  }, [dpr, onTextureReady, onInkCanvasReady]);

  useEffect(() => {
    resizeCanvases();

    const handleResize = () => resizeCanvases();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvases]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return null;

    const rect = inkCanvas.getBoundingClientRect();
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
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startStroke = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    currentStrokeRef.current = [{
      x: point.x,
      y: point.y,
      timestamp: performance.now(),
    }];
  }, [getCanvasPoint]);

  const continueStroke = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    currentStrokeRef.current.push({
      x: point.x,
      y: point.y,
      timestamp: performance.now(),
    });

    if (currentStrokeRef.current.length < 2) return;

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const inkCanvas = inkCanvasRef.current;
      if (!inkCanvas) return;
      const ctx = inkCanvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const recentPoints = currentStrokeRef.current.slice(-20);
      const processed = processStroke(recentPoints, brushSize, inkDensity, fontStyle);

      if (processed.length >= 2) {
        const styleConfig = getStyleConfig(fontStyle);
        const lastTwo = processed.slice(-2);
        drawInkStroke(ctx, lastTwo, styleConfig);
      }
    });
  }, [getCanvasPoint, brushSize, inkDensity, fontStyle, dpr]);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;
    const ctx = inkCanvas.getContext('2d')!;

    if (currentStrokeRef.current.length >= 2) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);

      const allStrokes = currentStrokeRef.current;
      const processed = processStroke(allStrokes, brushSize, inkDensity, fontStyle);
      const styleConfig = getStyleConfig(fontStyle);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawInkStroke(ctx, processed, styleConfig);
    }

    currentStrokeRef.current = [];
  }, [brushSize, inkDensity, fontStyle, dpr]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={textureCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />
      <canvas
        ref={inkCanvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={startStroke}
        onMouseMove={continueStroke}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={startStroke}
        onTouchMove={continueStroke}
        onTouchEnd={endStroke}
      />
    </div>
  );
}
