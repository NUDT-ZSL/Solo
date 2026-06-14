import React, { useRef, useEffect, useState, useCallback } from 'react';
import { detectRegions, analyzeRegion, type CSSRegion } from '../modules/imageAnalyzer';

interface CanvasViewProps {
  imageSrc: string | null;
  onImageLoaded?: (imageDataUrl: string) => void;
  onRegionsDetected?: (regions: CSSRegion[]) => void;
  onManualSelection?: (region: CSSRegion) => void;
  onRegionClick?: (region: CSSRegion, position: { x: number; y: number }) => void;
  selectedRegionId?: string | null;
}

interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface Selection {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_SMOOTH = 0.1;

const CanvasView: React.FC<CanvasViewProps> = ({
  imageSrc,
  onImageLoaded,
  onRegionsDetected,
  onManualSelection,
  onRegionClick,
  selectedRegionId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const imageDataUrlRef = useRef<string>('');

  const [regions, setRegions] = useState<CSSRegion[]>([]);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const targetTransformRef = useRef<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const currentTransformRef = useRef<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const rafPendingRef = useRef(false);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const t = currentTransformRef.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    if (!img) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(t.offsetX + cw / 2, t.offsetY + ch / 2);
    ctx.scale(t.scale, t.scale);
    ctx.translate(-img.width / 2, -img.height / 2);

    ctx.drawImage(img, 0, 0);

    for (const region of regions) {
      const isSelected = region.id === selectedRegionId;
      ctx.save();
      const dashLen = Math.max(3, 8 / t.scale);
      const gapLen = Math.max(2, 6 / t.scale);
      ctx.lineWidth = Math.max(1, 4 / t.scale);
      ctx.setLineDash([dashLen, gapLen]);
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#3b82f6';
      const r = Math.max(1, 8 / t.scale);

      ctx.beginPath();
      const x = region.x;
      const y = region.y;
      const w = region.width;
      const h = region.height;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (selection) {
      ctx.save();
      const sx = Math.min(selection.startX, selection.curX);
      const sy = Math.min(selection.startY, selection.curY);
      const sw = Math.abs(selection.curX - selection.startX);
      const sh = Math.abs(selection.curY - selection.startY);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.lineWidth = Math.max(1, 2 / t.scale);
      ctx.setLineDash([Math.max(2, 6 / t.scale), Math.max(2, 4 / t.scale)]);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.restore();
    }

    ctx.restore();
  }, [regions, selection, selectedRegionId]);

  const scheduleRender = useCallback(() => {
    dirtyRef.current = true;
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;

    const tick = (now: number) => {
      rafPendingRef.current = false;

      const elapsed = now - lastFrameTimeRef.current;
      const minInterval = 1000 / 60;

      if (elapsed < minInterval) {
        rafPendingRef.current = true;
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastFrameTimeRef.current = now;

      const target = targetTransformRef.current;
      const current = currentTransformRef.current;
      const lerpFactor = 1 - Math.pow(0.001, elapsed / 1000);

      let changed = false;
      const newT = { ...current };
      for (const k of Object.keys(target) as (keyof Transform)[]) {
        const diff = target[k] - current[k];
        if (Math.abs(diff) > 0.001) {
          newT[k] = current[k] + diff * lerpFactor;
          changed = true;
        } else {
          newT[k] = target[k];
        }
      }

      if (changed || dirtyRef.current) {
        currentTransformRef.current = newT;
        if (
          Math.abs(newT.scale - transform.scale) > 0.01 ||
          Math.abs(newT.offsetX - transform.offsetX) > 0.5 ||
          Math.abs(newT.offsetY - transform.offsetY) > 0.5
        ) {
          setTransform(newT);
        }
        renderCanvas();
        dirtyRef.current = false;

        if (changed) {
          rafPendingRef.current = true;
          animFrameRef.current = requestAnimationFrame(tick);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [renderCanvas, transform]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender, regions, selection, selectedRegionId]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => scheduleRender();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scheduleRender]);

  const getImageCoord = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2 - targetTransformRef.current.offsetX;
    const cy = clientY - rect.top - rect.height / 2 - targetTransformRef.current.offsetY;

    const x = cx / targetTransformRef.current.scale + img.width / 2;
    const y = cy / targetTransformRef.current.scale + img.height / 2;

    return { x: Math.max(0, Math.min(img.width, x)), y: Math.max(0, Math.min(img.height, y)) };
  }, []);

  const setTargetScale = useCallback((newScale: number, centerClientX?: number, centerClientY?: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    const img = imgRef.current;
    const canvas = canvasRef.current;

    if (img && canvas && centerClientX !== undefined && centerClientY !== undefined) {
      const rect = canvas.getBoundingClientRect();
      const prevScale = targetTransformRef.current.scale;

      const beforeX = (centerClientX - rect.left - rect.width / 2 - targetTransformRef.current.offsetX) / prevScale;
      const beforeY = (centerClientY - rect.top - rect.height / 2 - targetTransformRef.current.offsetY) / prevScale;

      const afterX = beforeX * clamped;
      const afterY = beforeY * clamped;

      targetTransformRef.current = {
        scale: clamped,
        offsetX: centerClientX - rect.left - rect.width / 2 - afterX,
        offsetY: centerClientY - rect.top - rect.height / 2 - afterY,
      };
    } else {
      targetTransformRef.current = {
        ...targetTransformRef.current,
        scale: clamped,
      };
    }
    scheduleRender();
  }, [scheduleRender]);

  const loadImage = useCallback((src: string) => {
    setIsAnalyzing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');
      let dataUrl = '';
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        dataUrl = offCanvas.toDataURL('image/png');
        imageDataUrlRef.current = dataUrl;
        try {
          imageDataRef.current = offCtx.getImageData(0, 0, img.width, img.height);
        } catch (e) {
          console.error('Failed to get image data:', e);
        }
      }

      const container = containerRef.current;
      if (container && img) {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const fitScale = Math.min(
          (cw - 80) / img.width,
          (ch - 80) / img.height,
          1
        );
        targetTransformRef.current = { scale: fitScale, offsetX: 0, offsetY: 0 };
        currentTransformRef.current = { scale: fitScale, offsetX: 0, offsetY: 0 };
        setTransform({ scale: fitScale, offsetX: 0, offsetY: 0 });
        scheduleRender();
      }

      if (onImageLoaded && dataUrl) {
        onImageLoaded(dataUrl);
      }

      if (imageDataRef.current) {
        requestIdleCallback?.(() => {
          const detected = detectRegions(imageDataRef.current!);
          setRegions(detected);
          if (onRegionsDetected) onRegionsDetected(detected);
          setIsAnalyzing(false);
        }, { timeout: 100 }) || setTimeout(() => {
          const detected = detectRegions(imageDataRef.current!);
          setRegions(detected);
          if (onRegionsDetected) onRegionsDetected(detected);
          setIsAnalyzing(false);
        }, 60);
      } else {
        setIsAnalyzing(false);
      }
    };
    img.onerror = () => {
      setIsAnalyzing(false);
      console.error('Failed to load image');
    };
    img.src = src;
  }, [onImageLoaded, onRegionsDetected, scheduleRender]);

  useEffect(() => {
    if (imageSrc) {
      loadImage(imageSrc);
    } else {
      imgRef.current = null;
      imageDataRef.current = null;
      imageDataUrlRef.current = '';
      setRegions([]);
      targetTransformRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
      currentTransformRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
      scheduleRender();
    }
  }, [imageSrc, loadImage, scheduleRender]);

  useEffect(() => {
    if (onRegionsDetected && regions.length > 0) onRegionsDetected(regions);
  }, [regions, onRegionsDetected]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTargetScale(
      targetTransformRef.current.scale * delta,
      e.clientX,
      e.clientY
    );
  }, [setTargetScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return;

    if (e.button === 1 || e.shiftKey || e.button === 2) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: targetTransformRef.current.offsetX,
        ty: targetTransformRef.current.offsetY,
      };
      return;
    }

    const coord = getImageCoord(e.clientX, e.clientY);

    for (const region of regions) {
      if (
        coord.x >= region.x &&
        coord.x <= region.x + region.width &&
        coord.y >= region.y &&
        coord.y <= region.y + region.height
      ) {
        if (onRegionClick) onRegionClick(region, { x: e.clientX, y: e.clientY });
        return;
      }
    }

    setIsSelecting(true);
    setSelection({
      startX: coord.x,
      startY: coord.y,
      curX: coord.x,
      curY: coord.y,
    });
  }, [regions, getImageCoord, onRegionClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      targetTransformRef.current = {
        ...targetTransformRef.current,
        offsetX: panStartRef.current.tx + dx,
        offsetY: panStartRef.current.ty + dy,
      };
      scheduleRender();
    } else if (isSelecting && selection) {
      const coord = getImageCoord(e.clientX, e.clientY);
      setSelection({
        ...selection,
        curX: coord.x,
        curY: coord.y,
      });
    }
  }, [isPanning, isSelecting, selection, getImageCoord, scheduleRender]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    } else if (isSelecting && selection && imageDataRef.current) {
      const sx = Math.min(selection.startX, selection.curX);
      const sy = Math.min(selection.startY, selection.curY);
      const sw = Math.abs(selection.curX - selection.startX);
      const sh = Math.abs(selection.curY - selection.startY);

      if (sw > 10 && sh > 10) {
        const region = analyzeRegion(imageDataRef.current, sx, sy, sw, sh);
        setRegions((prev) => [...prev, region]);
        if (onManualSelection) onManualSelection(region);
        if (onRegionClick) onRegionClick(region, { x: e.clientX, y: e.clientY });
      }
      setIsSelecting(false);
      setSelection(null);
    }
  }, [isPanning, isSelecting, selection, onManualSelection, onRegionClick]);

  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
  }, [isPanning]);

  const handleReset = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const fitScale = Math.min(
      (container.clientWidth - 80) / img.width,
      (container.clientHeight - 80) / img.height,
      1
    );
    targetTransformRef.current = { scale: fitScale, offsetX: 0, offsetY: 0 };
    scheduleRender();
  }, [scheduleRender]);

  const handleRestoreState = useCallback((dataUrl: string, restoredRegions: CSSRegion[]) => {
    setIsAnalyzing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        imageDataUrlRef.current = dataUrl;
        try {
          imageDataRef.current = offCtx.getImageData(0, 0, img.width, img.height);
        } catch (e) {
          console.error(e);
        }
      }

      const container = containerRef.current;
      if (container) {
        const fitScale = Math.min(
          (container.clientWidth - 80) / img.width,
          (container.clientHeight - 80) / img.height,
          1
        );
        targetTransformRef.current = { scale: fitScale, offsetX: 0, offsetY: 0 };
        currentTransformRef.current = { scale: fitScale, offsetX: 0, offsetY: 0 };
        setTransform({ scale: fitScale, offsetX: 0, offsetY: 0 });
        scheduleRender();
      }

      setRegions(restoredRegions);
      if (onRegionsDetected) onRegionsDetected(restoredRegions);
      setIsAnalyzing(false);
    };
    img.src = dataUrl;
  }, [onRegionsDetected, scheduleRender]);

  useEffect(() => {
    (window as any).__cssnapperResetCanvas = handleReset;
    (window as any).__cssnapperRestoreCanvas = handleRestoreState;
  }, [handleReset, handleRestoreState]);

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('contextmenu', preventDefault);
      return () => canvas.removeEventListener('contextmenu', preventDefault);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--color-bg-primary)',
        cursor: imgRef.current ? (isPanning ? 'grabbing' : (isSelecting ? 'crosshair' : 'default')) : 'default',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {isAnalyzing && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            animation: 'popupIn var(--transition-slow)',
          }}
        >
          正在分析图像...
        </div>
      )}

      {!imageSrc && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📷</div>
          <div style={{ fontSize: 16 }}>点击顶部「导入截图」按钮开始</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>
            支持 PNG、JPG 格式（最大 2MB）
          </div>
        </div>
      )}

      {imageSrc && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--color-bg-secondary)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            boxShadow: 'var(--shadow-md)',
            animation: 'popupIn var(--transition-slow)',
          }}
        >
          <span>缩放: {Math.round(transform.scale * 100)}%</span>
          <span style={{ color: 'var(--color-bg-hover)' }}>|</span>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent-blue-light)',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
              transition: 'all var(--transition-base)',
            }}
            className="action-btn"
          >
            重置
          </button>
          <span style={{ color: 'var(--color-bg-hover)' }}>|</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>滚轮缩放 · Shift/中键拖动平移 · 拖拽框选</span>
        </div>
      )}
    </div>
  );
};

export default CanvasView;
