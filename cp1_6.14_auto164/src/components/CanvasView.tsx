import React, { useRef, useEffect, useState, useCallback } from 'react';
import { detectRegions, analyzeRegion, generateCSSCode, type CSSRegion } from '../modules/imageAnalyzer';

interface CanvasViewProps {
  imageSrc: string | null;
  onImageLoaded?: (imageDataUrl: string) => void;
  onRegionsDetected?: (regions: CSSRegion[]) => void;
  onManualSelection?: (region: CSSRegion) => void;
  onRegionClick?: (region: CSSRegion) => void;
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
  const [regions, setRegions] = useState<CSSRegion[]>([]);
  const [transform, setTransform] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const draw = useCallback(() => {
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

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    if (!img) return;

    ctx.save();
    ctx.translate(transform.offsetX + cw / 2, transform.offsetY + ch / 2);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-img.width / 2, -img.height / 2);

    ctx.drawImage(img, 0, 0);

    for (const region of regions) {
      const isSelected = region.id === selectedRegionId;
      ctx.save();
      ctx.lineWidth = 4 / transform.scale;
      ctx.setLineDash([8 / transform.scale, 6 / transform.scale]);
      ctx.strokeStyle = isSelected ? '#fbbf24' : '#3b82f6';
      const r = 8 / transform.scale;
      
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
      ctx.lineWidth = 2 / transform.scale;
      ctx.setLineDash([6 / transform.scale, 4 / transform.scale]);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.restore();
    }

    ctx.restore();
  }, [transform, regions, selection, selectedRegionId]);

  useEffect(() => {
    const animate = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  const getImageCoord = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;

    const x = cx / transform.scale + img.width / 2 - transform.offsetX / transform.scale;
    const y = cy / transform.scale + img.height / 2 - transform.offsetY / transform.scale;

    return { x: Math.max(0, Math.min(img.width, x)), y: Math.max(0, Math.min(img.height, y)) };
  }, [transform]);

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
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        try {
          imageDataRef.current = offCtx.getImageData(0, 0, img.width, img.height);
        } catch (e) {
          console.error('Failed to get image data:', e);
        }
      }

      const container = containerRef.current;
      if (container && img) {
        const fitScale = Math.min(
          (container.clientWidth - 80) / img.width,
          (container.clientHeight - 80) / img.height,
          1
        );
        setTransform({ scale: fitScale, offsetX: 0, offsetY: 0 });
      }

      if (onImageLoaded) {
        onImageLoaded(offCanvas.toDataURL('image/png'));
      }

      if (imageDataRef.current) {
        setTimeout(() => {
          const detected = detectRegions(imageDataRef.current!);
          setRegions(detected);
          if (onRegionsDetected) onRegionsDetected(detected);
          setIsAnalyzing(false);
        }, 50);
      } else {
        setIsAnalyzing(false);
      }
    };
    img.onerror = () => {
      setIsAnalyzing(false);
      console.error('Failed to load image');
    };
    img.src = src;
  }, [onImageLoaded, onRegionsDetected]);

  useEffect(() => {
    if (imageSrc) {
      loadImage(imageSrc);
    } else {
      imgRef.current = null;
      imageDataRef.current = null;
      setRegions([]);
      setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    }
  }, [imageSrc, loadImage]);

  useEffect(() => {
    if (onRegionsDetected) onRegionsDetected(regions);
  }, [regions, onRegionsDetected]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * delta)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return;

    if (e.button === 1 || e.shiftKey || e.altKey) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.offsetX,
        ty: transform.offsetY,
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
        if (onRegionClick) onRegionClick(region);
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
  }, [transform, regions, getImageCoord, onRegionClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTransform((prev) => ({
        ...prev,
        offsetX: panStartRef.current!.tx + dx,
        offsetY: panStartRef.current!.ty + dy,
      }));
    } else if (isSelecting && selection) {
      const coord = getImageCoord(e.clientX, e.clientY);
      setSelection({
        ...selection,
        curX: coord.x,
        curY: coord.y,
      });
    }
  }, [isPanning, isSelecting, selection, getImageCoord]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
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
        if (onRegionClick) onRegionClick(region);
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
    setTransform({ scale: fitScale, offsetX: 0, offsetY: 0 });
  }, []);

  const loadFromRestore = useCallback((dataUrl: string, restoredRegions: CSSRegion[]) => {
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
        setTransform({ scale: fitScale, offsetX: 0, offsetY: 0 });
      }

      setRegions(restoredRegions);
      setIsAnalyzing(false);
    };
    img.src = dataUrl;
  }, []);

  useEffect(() => {
    (window as any).__cssnapperResetCanvas = handleReset;
    (window as any).__cssnapperRestoreCanvas = loadFromRestore;
  }, [handleReset, loadFromRestore]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0f172a',
        cursor: imgRef.current ? (isPanning ? 'grabbing' : 'crosshair') : 'default',
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
          transition: 'transform 0.1s ease',
        }}
      />
      
      {isAnalyzing && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f1f5f9',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
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
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              opacity: 0.3,
            }}
          >
            📷
          </div>
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
            background: '#1e293b',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            color: '#f1f5f9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <span>缩放: {Math.round(transform.scale * 100)}%</span>
          <span style={{ color: '#475569' }}>|</span>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
            }}
          >
            重置
          </button>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#94a3b8' }}>滚轮缩放 · Shift拖动平移 · 拖拽框选</span>
        </div>
      )}
    </div>
  );
};

export default CanvasView;
