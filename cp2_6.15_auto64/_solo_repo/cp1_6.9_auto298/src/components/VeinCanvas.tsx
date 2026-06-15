import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import { veinProcessor } from '@/VeinProcessor';
import type { VeinData, Tag } from '@/types';
import { createTag } from '@/services/api';

interface Props {
  imageUrl: string;
  veinData: VeinData | null;
  tags: Tag[];
  onImageLoaded?: (img: HTMLImageElement) => void;
  readOnly?: boolean;
}

export const VeinCanvas: React.FC<Props> = ({ imageUrl, veinData, tags, onImageLoaded, readOnly }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const rafRef = useRef<number | null>(null);

  const {
    pendingTag,
    setPendingTag,
    addTag,
    addToast,
    setIsProcessing,
    triggerVeinFlash,
    highlightTagId,
    justSavedTagId,
    currentVeinData,
  } = useAppStore();

  const loadImage = useCallback(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
      fitToContainer(img.naturalWidth, img.naturalHeight);
      onImageLoaded?.(img);
    };
    img.src = imageUrl;
  }, [imageUrl, onImageLoaded]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const fitToContainer = (iw: number, ih: number) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth - 40;
    const ch = el.clientHeight - 40;
    const s = Math.min(cw / iw, ch / ih, 1);
    const ox = (el.clientWidth - iw * s) / 2;
    const oy = (el.clientHeight - ih * s) / 2;
    setScale(s);
    setOffset({ x: ox, y: oy });
  };

  const screenToImage = (sx: number, sy: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = sx - rect.left - offset.x;
    const cy = sy - rect.top - offset.y;
    return { x: cx / scale, y: cy / scale };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readOnly || !currentVeinData || !imgLoaded || isDraggingRef.current) return;
    const { x, y } = screenToImage(e.clientX, e.clientY);
    if (x < 0 || y < 0 || x >= imgSize.w || y >= imgSize.h) return;
    const nearest = veinProcessor.findNearestNode(currentVeinData, x, y, Math.max(20, 40 / scale));
    const nodeIndex = nearest ? nearest.index : -1;
    const px = nearest ? currentVeinData.nodes[nearest.index].x : Math.round(x);
    const py = nearest ? currentVeinData.nodes[nearest.index].y : Math.round(y);
    setPendingTag({ nodeIndex, x: px, y: py });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const newScale = Math.min(8, Math.max(0.1, scale * factor));
    const k = newScale / scale;
    setOffset({
      x: mx - (mx - offset.x) * k,
      y: my - (my - offset.y) * k,
    });
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 2 && !e.shiftKey) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.ox + dx,
      y: dragStartRef.current.oy + dy,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (highlightTagId) {
      const t = tags.find((x) => x.id === highlightTagId);
      if (t && imgSize.w && imgSize.h) {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        const targetScale = Math.min(cw / imgSize.w, ch / imgSize.h, 1) * 1.4;
        setScale(targetScale);
        setOffset({
          x: cw / 2 - t.x * targetScale,
          y: ch / 2 - t.y * targetScale,
        });
      }
    }
  }, [highlightTagId, tags, imgSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => {
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const el = containerRef.current;
      if (!el) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (imgLoaded && imgRef.current) {
        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);
        ctx.drawImage(imgRef.current, 0, 0);
        ctx.restore();

        if (currentVeinData && currentVeinData.nodes.length) {
          ctx.save();
          ctx.translate(offset.x, offset.y);
          ctx.scale(scale, scale);
          ctx.strokeStyle = 'hsla(270, 60%, 80%, 0.75)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          for (const [a, b] of currentVeinData.edges) {
            const na = currentVeinData.nodes[a];
            const nb = currentVeinData.nodes[b];
            if (!na || !nb) continue;
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        const now = Date.now();
        for (const tag of tags) {
          ctx.save();
          ctx.translate(offset.x + tag.x * scale, offset.y + tag.y * scale);
          const isHighlight = tag.id === highlightTagId;
          const isJustSaved = tag.id === justSavedTagId;
          const t = (now % 800) / 800;
          const breathe = 0.85 + 0.3 * Math.abs(Math.sin(t * Math.PI * 2));
          const radius = 6 * (isHighlight ? 1.2 : 1);

          if (isJustSaved) {
            const progress = Math.min(1, (now - (parseInt(tag.id.split('_').pop() || '0') || now)) / 500);
            const ringR = 6 + progress * 24;
            ctx.strokeStyle = `rgba(255, 215, 0, ${1 - progress})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (isHighlight) {
            const blink = 0.3 + 0.7 * Math.abs(Math.sin(now / 120));
            ctx.strokeStyle = `rgba(255,255,255,${blink})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = `rgba(255, 215, 0, ${breathe})`;
          ctx.shadowColor = 'rgba(255, 200, 0, 0.8)';
          ctx.shadowBlur = isHighlight ? 14 : 6;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (pendingTag && !readOnly) {
          ctx.save();
          ctx.translate(offset.x + pendingTag.x * scale, offset.y + pendingTag.y * scale);
          ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
          ctx.shadowColor = 'rgba(255,200,0,0.9)';
          ctx.shadowBlur = 10;
          const tp = (now % 800) / 800;
          const r = 6 * (0.7 + 0.4 * Math.abs(Math.sin(tp * Math.PI * 2)));
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'hsla(40, 10%, 75%, 0.5)';
        ctx.font = '600 18px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('请上传一片树叶，开启叶脉时光之旅', W / 2, H / 2);
        ctx.font = '400 14px "Noto Sans SC", sans-serif';
        ctx.fillStyle = 'hsla(40, 10%, 75%, 0.35)';
        ctx.fillText('点击右上角上传按钮 · 支持 JPG / PNG · 最大 5MB', W / 2, H / 2 + 36);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    imgLoaded,
    scale,
    offset,
    currentVeinData,
    tags,
    pendingTag,
    highlightTagId,
    justSavedTagId,
    imgSize,
    readOnly,
  ]);

  useEffect(() => {
    if (imgLoaded && veinData && currentVeinData === null) {
      triggerVeinFlash();
    }
  }, [imgLoaded, veinData, currentVeinData, triggerVeinFlash]);

  const confirmPending = async (note: string, date: string, plantName: string) => {
    if (!pendingTag || !currentVeinData) return;
    try {
      setIsProcessing(true);
      const saved = await createTag({
        veinDataId: currentVeinData.id,
        nodeIndex: pendingTag.nodeIndex,
        x: pendingTag.x,
        y: pendingTag.y,
        note,
        date,
        plantName,
      });
      addTag(saved);
      useAppStore.getState().setJustSavedTagId(saved.id);
      addToast({ type: 'success', message: '标记已保存' });
      setPendingTag(null);
    } catch (e: any) {
      addToast({ type: 'error', message: e.message || '保存失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    (window as any).__veinCanvasConfirm = confirmPending;
  });

  const exportCanvas = async (): Promise<string | null> => {
    if (!imgLoaded || !imgRef.current) return null;
    const W = imgSize.w;
    const H = imgSize.h;
    const exp = document.createElement('canvas');
    exp.width = W;
    exp.height = H;
    const ctx = exp.getContext('2d')!;
    ctx.drawImage(imgRef.current, 0, 0);

    if (currentVeinData && currentVeinData.nodes.length) {
      ctx.strokeStyle = 'hsla(270, 60%, 80%, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const [a, b] of currentVeinData.edges) {
        const na = currentVeinData.nodes[a];
        const nb = currentVeinData.nodes[b];
        if (!na || !nb) continue;
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
      }
      ctx.stroke();
    }

    for (const tag of tags) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.shadowColor = 'rgba(255,200,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(tag.x, tag.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    const today = new Date().toISOString().slice(0, 10);
    const watermark = `叶脉时光 · ${today}`;
    ctx.font = '500 20px "Noto Serif SC", serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const metrics = ctx.measureText(watermark);
    const pad = 20;
    const tw = metrics.width + pad * 2;
    const th = 38;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W - tw - pad, H - th - pad, tw, th);
    ctx.fillStyle = '#fff8e7';
    ctx.fillText(watermark, W - pad * 2, H - pad - 8);

    return exp.toDataURL('image/png');
  };

  useEffect(() => {
    (window as any).__exportVeinCanvas = exportCanvas;
  });

  const showFlash = useAppStore((s) => s.showVeinFlash);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {showFlash && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 10 }}
        >
          <div
            className="animate-flash rounded-full"
            style={{
              width: 200,
              height: 200,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 40%, transparent 70%)',
            }}
          />
        </div>
      )}
    </div>
  );
};
