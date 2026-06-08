import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import { generateSamplePage, A4_ASPECT_RATIO, SAMPLE_PAGE_COUNT } from '@/utils/samplePDF';
import { drawAnnotation, isPointInAnnotation, getRelativeCoords, exportPageToPNG } from '@/utils/canvasUtils';
import type { Annotation } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface PDFViewerProps {
  wsSend: (msg: any) => void;
  onPageCanvasReady?: (canvas: HTMLCanvasElement, pageNumber: number) => void;
  readOnly?: boolean;
  annotationsOverride?: Annotation[];
  diffMode?: {
    enabled: boolean;
    diffType: 'onlyA' | 'onlyB' | null;
  };
}

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = Math.floor(PAGE_WIDTH * A4_ASPECT_RATIO);

export function PDFViewer({ wsSend, onPageCanvasReady, readOnly = false, annotationsOverride, diffMode }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [dragAnnotationId, setDragAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [numPages] = useState(SAMPLE_PAGE_COUNT);

  const annotations = useAppStore((s) => s.annotations);
  const selectedAnnotationId = useAppStore((s) => s.selectedAnnotationId);
  const currentTool = useAppStore((s) => s.currentTool);
  const currentPage = useAppStore((s) => s.currentPage);
  const scale = useAppStore((s) => s.scale);
  const offsetX = useAppStore((s) => s.offsetX);
  const offsetY = useAppStore((s) => s.offsetY);
  const setSelectedAnnotationId = useAppStore((s) => s.setSelectedAnnotationId);
  const addAnnotation = useAppStore((s) => s.addAnnotation);
  const moveAnnotation = useAppStore((s) => s.moveAnnotation);
  const deleteAnnotation = useAppStore((s) => s.deleteAnnotation);
  const setScale = useAppStore((s) => s.setScale);
  const setOffsetX = useAppStore((s) => s.setOffsetX);
  const setOffsetY = useAppStore((s) => s.setOffsetY);

  const displayAnnotations = annotationsOverride || annotations;

  const redrawOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!overlay || !container) return;

    overlay.width = container.clientWidth;
    overlay.height = container.clientHeight;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const displayW = PAGE_WIDTH * scale;
    const displayH = PAGE_HEIGHT * scale;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const pageAnnotations = displayAnnotations.filter((a) => a.pageNumber === currentPage);
    for (const ann of pageAnnotations) {
      let diffColor: string | null = null;
      if (diffMode?.enabled) {
        if (diffMode.diffType === 'onlyA') diffColor = 'rgba(239, 68, 68, 0.5)';
        else if (diffMode.diffType === 'onlyB') diffColor = 'rgba(59, 130, 246, 0.5)';
      }
      drawAnnotation(ctx, ann, PAGE_WIDTH, PAGE_HEIGHT, ann.id === selectedAnnotationId, diffColor);
    }

    if (isDrawing && drawStart && currentTool !== 'none') {
      ctx.restore();
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.5;
      if (currentTool === 'highlight') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.fillRect(
          Math.min(drawStart.x, drawStart.x + (drawStart.tmpX || 0)),
          Math.min(drawStart.y, drawStart.y + (drawStart.tmpY || 0)),
          Math.abs(drawStart.tmpX || 0),
          Math.abs(drawStart.tmpY || 0)
        );
      } else if (currentTool === 'textbox') {
        ctx.fillStyle = '#FFFACD';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        const tw = Math.max(50, Math.abs(drawStart.tmpX || 100));
        const th = Math.max(30, Math.abs(drawStart.tmpY || 50));
        ctx.fillRect(
          Math.min(drawStart.x, drawStart.x + (drawStart.tmpX || 100)),
          Math.min(drawStart.y, drawStart.y + (drawStart.tmpY || 50)),
          tw,
          th
        );
        ctx.strokeRect(
          Math.min(drawStart.x, drawStart.x + (drawStart.tmpX || 100)),
          Math.min(drawStart.y, drawStart.y + (drawStart.tmpY || 50)),
          tw,
          th
        );
      }
    }

    ctx.restore();
  }, [displayAnnotations, selectedAnnotationId, currentTool, currentPage, scale, offsetX, offsetY, isDrawing, drawStart, diffMode]);

  useEffect(() => {
    const canvas = pageCanvasRef.current;
    if (canvas) {
      canvas.width = PAGE_WIDTH;
      canvas.height = PAGE_HEIGHT;
      generateSamplePage(canvas, currentPage);
      if (onPageCanvasReady) onPageCanvasReady(canvas, currentPage);
    }
  }, [currentPage, onPageCanvasReady]);

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  useEffect(() => {
    const handleResize = () => redrawOverlay();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawOverlay]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(scale + delta);
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return getRelativeCoords(clientX, clientY, rect, PAGE_WIDTH, PAGE_HEIGHT, offsetX, offsetY, scale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
      return;
    }

    if (currentTool === 'none') {
      const pageAnns = displayAnnotations.filter((a) => a.pageNumber === currentPage);
      for (let i = pageAnns.length - 1; i >= 0; i--) {
        if (isPointInAnnotation(coords.canvasX, coords.canvasY, pageAnns[i], PAGE_WIDTH * scale, PAGE_HEIGHT * scale)) {
          setSelectedAnnotationId(pageAnns[i].id);
          setIsDragging(true);
          setDragAnnotationId(pageAnns[i].id);
          setDragOffset({
            dx: coords.canvasX - pageAnns[i].x * PAGE_WIDTH * scale,
            dy: coords.canvasY - pageAnns[i].y * PAGE_HEIGHT * scale,
          });
          return;
        }
      }
      setSelectedAnnotationId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
      return;
    }

    if (currentTool === 'highlight' || currentTool === 'textbox') {
      if (coords.canvasX < 0 || coords.canvasX > PAGE_WIDTH * scale ||
          coords.canvasY < 0 || coords.canvasY > PAGE_HEIGHT * scale) return;
      setIsDrawing(true);
      setDrawStart({
        x: coords.canvasX / scale,
        y: coords.canvasY / scale,
        tmpX: 0,
        tmpY: 0,
      } as any);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly) return;

    if (isPanning && panStart) {
      setOffsetX(e.clientX - panStart.x);
      setOffsetY(e.clientY - panStart.y);
      return;
    }

    if (isDragging && dragAnnotationId) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;
      const newCanvasX = coords.canvasX - dragOffset.dx;
      const newCanvasY = coords.canvasY - dragOffset.dy;
      const newX = Math.max(0, Math.min(1, newCanvasX / (PAGE_WIDTH * scale)));
      const newY = Math.max(0, Math.min(1, newCanvasY / (PAGE_HEIGHT * scale)));
      moveAnnotation(dragAnnotationId, newX, newY);
      wsSend({ type: 'move', payload: { id: dragAnnotationId, x: newX, y: newY } });
      return;
    }

    if (isDrawing && drawStart) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (!coords) return;
      setDrawStart({
        ...drawStart,
        tmpX: (coords.canvasX / scale) - drawStart.x,
        tmpY: (coords.canvasY / scale) - drawStart.y,
      } as any);
      redrawOverlay();
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }

    if (isDragging) {
      setIsDragging(false);
      setDragAnnotationId(null);
    }

    if (isDrawing && drawStart) {
      const tmpX = (drawStart as any).tmpX || 0;
      const tmpY = (drawStart as any).tmpY || 0;
      if (Math.abs(tmpX) > 0.02 || Math.abs(tmpY) > 0.02) {
        const absX = Math.min(drawStart.x, drawStart.x + tmpX) / PAGE_WIDTH;
        const absY = Math.min(drawStart.y, drawStart.y + tmpY) / PAGE_HEIGHT;
        const absW = Math.abs(tmpX) / PAGE_WIDTH;
        const absH = Math.abs(tmpY) / PAGE_HEIGHT;

        let text: string | undefined;
        if (currentTool === 'textbox') {
          text = prompt('请输入文本框内容:', '批注文本');
          if (text === null) {
            setIsDrawing(false);
            setDrawStart(null);
            redrawOverlay();
            return;
          }
        }

        const annotation: Annotation = {
          id: uuidv4(),
          type: currentTool,
          pageNumber: currentPage,
          x: Math.max(0, absX),
          y: Math.max(0, absY),
          width: Math.min(1 - absX, absW),
          height: Math.min(1 - absY, absH),
          text,
          createdAt: Date.now(),
          username: 'User',
        };
        addAnnotation(annotation);
        wsSend({ type: 'add', payload: { annotation } });
      }
      setIsDrawing(false);
      setDrawStart(null);
      redrawOverlay();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (e.key === 'Delete' && selectedAnnotationId) {
        deleteAnnotation(selectedAnnotationId);
        wsSend({ type: 'delete', payload: { id: selectedAnnotationId } });
      }
      if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
        setIsDrawing(false);
        setDrawStart(null);
        setIsDragging(false);
        setDragAnnotationId(null);
        redrawOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, deleteAnnotation, wsSend, readOnly, redrawOverlay]);

  return (
    <div
      ref={containerRef}
      className="pdf-viewer"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={pageCanvasRef}
        className="pdf-canvas"
        style={{
          width: `${PAGE_WIDTH * scale}px`,
          height: `${PAGE_HEIGHT * scale}px`,
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        className="overlay-canvas"
        style={{
          cursor: currentTool === 'none' ? (isDragging ? 'grabbing' : 'default') : 'crosshair',
        }}
      />
      <div className="page-info">
        第 {currentPage} / {numPages} 页 · {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

export function getExportCanvas(pageNumber: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  generateSamplePage(canvas, pageNumber);
  return canvas;
}

export { PAGE_WIDTH, PAGE_HEIGHT };
