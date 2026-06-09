import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { SVG } from '@svgdotjs/svg.js';
import type { PathData, Point, BorderConfig } from '../utils/stampProcessor';
import {
  CANVAS_SIZE,
  pointsToPathD,
  generateBorderSVG,
  fitPathsToBorder,
  getBorderInnerBounds,
} from '../utils/stampProcessor';

export interface StampCanvasHandle {
  clearCanvas: () => void;
}

interface StampCanvasProps {
  paths: PathData[];
  onPathsChange: (paths: PathData[]) => void;
  strokeColor: string;
  strokeWidth: number;
  border: BorderConfig;
  textSVG: string;
}

interface DrawingState {
  isDrawing: boolean;
  currentPath: Point[];
  lastPoint: Point | null;
  currentSVGPath: ReturnType<typeof SVG.prototype.path> | null;
}

const StampCanvas = forwardRef<StampCanvasHandle, StampCanvasProps>((props, ref) => {
  const { paths, onPathsChange, strokeColor, strokeWidth, border, textSVG } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRootRef = useRef<ReturnType<typeof SVG> | null>(null);
  const pathsGroupRef = useRef<ReturnType<typeof SVG.prototype.group> | null>(null);
  const borderGroupRef = useRef<ReturnType<typeof SVG.prototype.group> | null>(null);
  const textGroupRef = useRef<ReturnType<typeof SVG.prototype.group> | null>(null);
  const drawingRef = useRef<DrawingState>({
    isDrawing: false,
    currentPath: [],
    lastPoint: null,
    currentSVGPath: null,
  });
  const rafIdRef = useRef<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      onPathsChange([]);
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const svg = SVG()
      .addTo(containerRef.current)
      .size(CANVAS_SIZE, CANVAS_SIZE)
      .viewbox(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svgRootRef.current = svg;

    svg.rect(CANVAS_SIZE, CANVAS_SIZE)
      .fill('#FFFFFF')
      .stroke({ color: '#D4C4A8', width: 1 });

    borderGroupRef.current = svg.group().attr('id', 'border-group');
    pathsGroupRef.current = svg.group().attr('id', 'paths-group');
    textGroupRef.current = svg.group().attr('id', 'text-group');

    return () => {
      svg.clear();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!borderGroupRef.current) return;
    borderGroupRef.current.clear();
    borderGroupRef.current.svg(generateBorderSVG(border));
  }, [border]);

  useEffect(() => {
    if (!textGroupRef.current) return;
    textGroupRef.current.clear();
    if (textSVG) {
      textGroupRef.current.svg(textSVG);
    }
  }, [textSVG]);

  useEffect(() => {
    if (!pathsGroupRef.current) return;
    const group = pathsGroupRef.current;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      group.clear();
      const fittedPaths = fitPathsToBorder(paths, border);
      for (const pathData of fittedPaths) {
        const d = pointsToPathD(pathData.points);
        if (d) {
          group
            .path(d)
            .fill('none')
            .stroke({
              color: pathData.color,
              width: pathData.strokeWidth,
              linecap: 'round',
              linejoin: 'round',
            });
        }
      }
      rafIdRef.current = null;
    });
  }, [paths, border]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const bounds = getBorderInnerBounds(border);
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
    return { x: clampedX, y: clampedY };
  }, [border]);

  const startDrawing = useCallback((point: Point) => {
    const drawing = drawingRef.current;
    drawing.isDrawing = true;
    drawing.currentPath = [point];
    drawing.lastPoint = point;

    if (pathsGroupRef.current) {
      drawing.currentSVGPath = pathsGroupRef.current
        .path(pointsToPathD([point]))
        .fill('none')
        .stroke({
          color: strokeColor,
          width: strokeWidth,
          linecap: 'round',
          linejoin: 'round',
        });
    }
    setIsProcessing(true);
  }, [strokeColor, strokeWidth]);

  const continueDrawing = useCallback((point: Point) => {
    const drawing = drawingRef.current;
    if (!drawing.isDrawing || !drawing.currentSVGPath) return;

    drawing.currentPath.push(point);
    drawing.lastPoint = point;

    requestAnimationFrame(() => {
      if (drawing.currentSVGPath && drawing.currentPath.length > 0) {
        drawing.currentSVGPath.plot(pointsToPathD(drawing.currentPath));
      }
    });
  }, []);

  const endDrawing = useCallback(() => {
    const drawing = drawingRef.current;
    if (!drawing.isDrawing) return;

    drawing.isDrawing = false;
    if (drawing.currentPath.length > 1) {
      const newPath: PathData = {
        points: [...drawing.currentPath],
        color: strokeColor,
        strokeWidth,
      };
      onPathsChange([...paths, newPath]);
    }

    drawing.currentPath = [];
    drawing.lastPoint = null;
    drawing.currentSVGPath = null;
    setIsProcessing(false);
  }, [paths, strokeColor, strokeWidth, onPathsChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) startDrawing(point);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawingRef.current.isDrawing) return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) continueDrawing(point);
    };

    const handleMouseUp = () => {
      endDrawing();
    };

    const handleMouseLeave = () => {
      if (drawingRef.current.isDrawing) endDrawing();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const point = getCanvasPoint(touch.clientX, touch.clientY);
        if (point) startDrawing(point);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!drawingRef.current.isDrawing) return;
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const point = getCanvasPoint(touch.clientX, touch.clientY);
        if (point) continueDrawing(point);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDrawing();
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getCanvasPoint, startDrawing, continueDrawing, endDrawing]);

  return (
    <div style={styles.canvasWrapper}>
      <div
        ref={containerRef}
        style={{
          ...styles.canvas,
          cursor: isProcessing ? 'crosshair' : 'crosshair',
        }}
      />
    </div>
  );
});

StampCanvas.displayName = 'StampCanvas';

const styles: { [key: string]: React.CSSProperties } = {
  canvasWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    background: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
  },
  canvas: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: '1 / 1',
    touchAction: 'none',
    borderRadius: 8,
    overflow: 'hidden',
    userSelect: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
};

export default StampCanvas;
