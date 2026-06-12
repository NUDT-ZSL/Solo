import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import {
  createShape,
  getShapePixelRegion,
  getAveragePixelColor,
  applyBlendMode,
  type ShapeType,
  type BlendMode
} from '../core/shapeRenderer';

interface UploadedImageData {
  id: string;
  originalUrl: string;
  pixelData: ImageData;
  width: number;
  height: number;
}

interface CanvasImageData {
  id: string;
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  blendMode: BlendMode;
  fadeInProgress: number;
  hueShift: number;
}

interface ShapeData {
  id: string;
  canvasImageId: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  strokeWidth: number;
  glowColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  baseColor: { r: number; g: number; b: number };
  alpha: number;
  life: number;
  maxLife: number;
  shapeId: string;
}

interface CanvasView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface CanvasProps {
  width: number;
  height: number;
  uploadedImages: UploadedImageData[];
  canvasImages: CanvasImageData[];
  shapes: ShapeData[];
  lightEffectsEnabled: boolean;
  selectedImageId: string | null;
  selectedShapeId: string | null;
  canvasView: CanvasView;
  onCanvasViewChange: (view: CanvasView) => void;
  onSelectImage: (id: string | null) => void;
  onSelectShape: (id: string | null) => void;
  onImageMove: (id: string, x: number, y: number) => void;
  onShapeMove: (id: string, x: number, y: number) => void;
  onFadeInProgress: (id: string, progress: number) => void;
  onUpdateShapePixels: (shapeId: string) => void;
  onDropImage: (imageId: string, x: number, y: number) => void;
}

const BASE_PARTICLES_PER_SHAPE = 20;
const MIN_PARTICLES_PER_SHAPE = 5;
const MAX_PARTICLES_TOTAL = 500;
const TARGET_FPS = 45;

const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  uploadedImages,
  canvasImages,
  shapes,
  lightEffectsEnabled,
  selectedImageId,
  selectedShapeId,
  canvasView,
  onCanvasViewChange,
  onSelectImage,
  onSelectShape,
  onImageMove,
  onShapeMove,
  onFadeInProgress,
  onDropImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const isDraggingRef = useRef<{
    type: 'pan' | 'image' | 'shape' | null;
    startX: number;
    startY: number;
    id: string | null;
    origX: number;
    origY: number;
    origOffsetX: number;
    origOffsetY: number;
  }>({ type: null, startX: 0, startY: 0, id: null, origX: 0, origY: 0, origOffsetX: 0, origOffsetY: 0 });

  const fpsStateRef = useRef({
    lastFrameTime: 0,
    frameCount: 0,
    fps: 60,
    fpsUpdateTime: 0,
    particleMultiplier: 1.0
  });

  const particleSpawnTimerRef = useRef<Map<string, number>>(new Map());
  const lastTimestampRef = useRef<number>(0);
  const viewRef = useRef(canvasView);
  viewRef.current = canvasView;

  useEffect(() => {
    uploadedImages.forEach((img) => {
      if (!loadedImagesRef.current.has(img.id)) {
        const htmlImg = new Image();
        htmlImg.src = img.originalUrl;
        loadedImagesRef.current.set(img.id, htmlImg);
      }
    });
  }, [uploadedImages]);

  const computeTargetParticleCount = useCallback((imageCount: number, shapeCount: number) => {
    if (shapeCount === 0) return 0;
    const perShape = imageCount > 6 || shapeCount > 20
      ? Math.max(MIN_PARTICLES_PER_SHAPE, Math.floor(BASE_PARTICLES_PER_SHAPE * 0.5))
      : BASE_PARTICLES_PER_SHAPE;
    return Math.min(MAX_PARTICLES_TOTAL, perShape * shapeCount);
  }, []);

  const spawnParticlesForShape = useCallback((shape: ShapeData, avgColor: { r: number; g: number; b: number }, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 50;
      const r = shape.size / 2;
      const startR = Math.random() * r * 0.6;
      newParticles.push({
        x: shape.x + Math.cos(angle) * startR,
        y: shape.y + Math.sin(angle) * startR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseSize: 2 + Math.random() * 4,
        size: 2 + Math.random() * 4,
        baseColor: avgColor,
        alpha: 0.9,
        life: 0,
        maxLife: 1200 + Math.random() * 600,
        shapeId: shape.id
      });
    }
    return newParticles;
  }, []);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const cx = ((sx - rect.left) - v.offsetX) / v.scale;
    const cy = ((sy - rect.top) - v.offsetY) / v.scale;
    return { x: cx, y: cy };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = (timestamp: number) => {
      if (!running) return;

      const state = fpsStateRef.current;
      const dt = state.lastFrameTime ? Math.min(timestamp - state.lastFrameTime, 60) : 16;
      state.lastFrameTime = timestamp;

      state.frameCount++;
      if (timestamp - state.fpsUpdateTime >= 500) {
        state.fps = Math.round((state.frameCount * 1000) / (timestamp - state.fpsUpdateTime));
        state.frameCount = 0;
        state.fpsUpdateTime = timestamp;

        if (state.fps < TARGET_FPS && state.particleMultiplier > 0.3) {
          state.particleMultiplier = Math.max(0.3, state.particleMultiplier - 0.1);
        } else if (state.fps >= 58 && state.particleMultiplier < 1.0) {
          state.particleMultiplier = Math.min(1.0, state.particleMultiplier + 0.05);
        }
      }

      canvasImages.forEach((img) => {
        if (img.fadeInProgress < 1) {
          const newProgress = Math.min(1, img.fadeInProgress + dt / 200);
          onFadeInProgress(img.id, newProgress);
        }
      });

      const targetTotal = computeTargetParticleCount(canvasImages.length, shapes.length);
      const adjustedTarget = Math.floor(targetTotal * state.particleMultiplier);

      if (lightEffectsEnabled && shapes.length > 0 && adjustedTarget > 0) {
        const perShapeTarget = Math.max(1, Math.floor(adjustedTarget / shapes.length));
        const spawnInterval = shapes.length * 1000 / (adjustedTarget * 0.6);

        shapes.forEach((shape) => {
          const current = particleSpawnTimerRef.current.get(shape.id) || 0;
          const newTimer = current + dt;
          if (newTimer >= spawnInterval) {
            particleSpawnTimerRef.current.set(shape.id, newTimer - spawnInterval);
            const cImg = canvasImages.find((ci) => ci.id === shape.canvasImageId);
            const uImg = cImg ? uploadedImages.find((ui) => ui.id === cImg.imageId) : null;
            if (uImg && cImg) {
              const fillColors = getShapePixelRegion(
                shape.type, shape.size, shape.rotation, shape.x, shape.y,
                uImg.pixelData, cImg.x, cImg.y, cImg.width, cImg.height
              );
              const avgColor = getAveragePixelColor(fillColors);
              const newParticles = spawnParticlesForShape(shape, avgColor, 1);
              particlesRef.current.push(...newParticles);
            }
          } else {
            particleSpawnTimerRef.current.set(shape.id, newTimer);
          }
        });

        if (particlesRef.current.length > adjustedTarget) {
          const excess = particlesRef.current.length - adjustedTarget;
          particlesRef.current.splice(0, excess);
        }
      } else if (!lightEffectsEnabled) {
        if (particlesRef.current.length > 0) {
          particlesRef.current = [];
        }
        particleSpawnTimerRef.current.clear();
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life += dt;
        if (p.life >= p.maxLife) return false;
        const t = p.life / p.maxLife;
        p.x += (p.vx * dt) / 1000;
        p.y += (p.vy * dt) / 1000;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.size = p.baseSize * (1 - t * 0.8);
        p.alpha = 0.9 * (1 - t);
        return true;
      });

      ctx.save();
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.translate(canvasView.offsetX, canvasView.offsetY);
      ctx.scale(canvasView.scale, canvasView.scale);

      const bgColor = { r: 26, g: 26, b: 46 };

      canvasImages.forEach((cImg) => {
        const srcImg = loadedImagesRef.current.get(cImg.imageId);
        if (!srcImg || !srcImg.complete) return;

        ctx.save();
        const alpha = (cImg.opacity / 100) * cImg.fadeInProgress;

        if (cImg.blendMode === 'normal') {
          ctx.globalAlpha = alpha;
          ctx.drawImage(srcImg, cImg.x, cImg.y, cImg.width, cImg.height);
        } else {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = cImg.width;
          tempCanvas.height = cImg.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(srcImg, 0, 0, cImg.width, cImg.height);
          const imgData = tempCtx.getImageData(0, 0, cImg.width, cImg.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const srcR = data[i];
            const srcG = data[i + 1];
            const srcB = data[i + 2];
            const result = applyBlendMode(bgColor, { r: srcR, g: srcG, b: srcB }, cImg.blendMode, 100);
            data[i] = result.r;
            data[i + 1] = result.g;
            data[i + 2] = result.b;
            data[i + 3] = Math.round(255 * alpha);
          }

          tempCtx.putImageData(imgData, 0, 0);
          ctx.drawImage(tempCanvas, cImg.x, cImg.y, cImg.width, cImg.height);
        }

        if (cImg.hueShift && cImg.hueShift > 0) {
          ctx.globalCompositeOperation = 'hue';
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillStyle = `hsl(${cImg.hueShift * 60}, 100%, 50%)`;
          ctx.fillRect(cImg.x, cImg.y, cImg.width, cImg.height);
        }

        ctx.restore();

        if (selectedImageId === cImg.id) {
          ctx.save();
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth = 2 / canvasView.scale;
          ctx.setLineDash([6 / canvasView.scale, 4 / canvasView.scale]);
          ctx.shadowColor = '#00f5ff';
          ctx.shadowBlur = 10;
          ctx.strokeRect(cImg.x - 4, cImg.y - 4, cImg.width + 8, cImg.height + 8);
          ctx.restore();
        }
      });

      shapes.forEach((shape) => {
        const cImg = canvasImages.find((ci) => ci.id === shape.canvasImageId);
        if (!cImg) return;
        const uImg = uploadedImages.find((ui) => ui.id === cImg.imageId);
        if (!uImg) return;

        const fillColors = getShapePixelRegion(
          shape.type, shape.size, shape.rotation, shape.x, shape.y,
          uImg.pixelData, cImg.x, cImg.y, cImg.width, cImg.height
        );
        const avgColor = getAveragePixelColor(fillColors);
        const { path } = createShape(shape.type, shape.size, shape.rotation, shape.x, shape.y);

        ctx.save();
        const gradient = ctx.createRadialGradient(
          shape.x, shape.y, 0,
          shape.x, shape.y, shape.size / 2
        );
        gradient.addColorStop(0, `rgba(${Math.min(255, avgColor.r + 40)}, ${Math.min(255, avgColor.g + 40)}, ${Math.min(255, avgColor.b + 40)}, 0.95)`);
        gradient.addColorStop(1, `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, 0.85)`);
        ctx.fillStyle = gradient;
        ctx.shadowColor = shape.glowColor;
        ctx.shadowBlur = 20;
        ctx.fill(path);
        ctx.restore();

        ctx.save();
        ctx.shadowColor = shape.glowColor;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = shape.glowColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.stroke(path);
        ctx.restore();

        if (selectedShapeId === shape.id) {
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / canvasView.scale;
          ctx.setLineDash([4 / canvasView.scale, 3 / canvasView.scale]);
          ctx.strokeRect(
            shape.x - shape.size / 2 - 6,
            shape.y - shape.size / 2 - 6,
            shape.size + 12,
            shape.size + 12
          );
          ctx.restore();
        }
      });

      if (lightEffectsEnabled) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        particlesRef.current.forEach((p) => {
          const t = 1 - p.life / p.maxLife;
          const cr = Math.round(p.baseColor.r + (255 - p.baseColor.r) * (1 - t));
          const cg = Math.round(p.baseColor.g + (255 - p.baseColor.g) * (1 - t));
          const cb = Math.round(p.baseColor.b + (255 - p.baseColor.b) * (1 - t));

          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
          gradient.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, ${p.alpha * 0.7})`);
          gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    width, height, uploadedImages, canvasImages, shapes,
    lightEffectsEnabled, selectedImageId, selectedShapeId,
    canvasView, spawnParticlesForShape, onFadeInProgress,
    computeTargetParticleCount
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.5, Math.min(3, canvasView.scale * delta));

    const ratio = newScale / canvasView.scale;
    const newOffsetX = mx - (mx - canvasView.offsetX) * ratio;
    const newOffsetY = my - (my - canvasView.offsetY) * ratio;

    onCanvasViewChange({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);

    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const dx = pos.x - s.x;
      const dy = pos.y - s.y;
      if (Math.abs(dx) <= s.size / 2 + 5 && Math.abs(dy) <= s.size / 2 + 5) {
        isDraggingRef.current = {
          type: 'shape',
          startX: e.clientX,
          startY: e.clientY,
          id: s.id,
          origX: s.x,
          origY: s.y,
          origOffsetX: 0,
          origOffsetY: 0
        };
        onSelectShape(s.id);
        onSelectImage(null);
        return;
      }
    }

    for (let i = canvasImages.length - 1; i >= 0; i--) {
      const img = canvasImages[i];
      if (pos.x >= img.x && pos.x <= img.x + img.width && pos.y >= img.y && pos.y <= img.y + img.height) {
        isDraggingRef.current = {
          type: 'image',
          startX: e.clientX,
          startY: e.clientY,
          id: img.id,
          origX: img.x,
          origY: img.y,
          origOffsetX: 0,
          origOffsetY: 0
        };
        onSelectImage(img.id);
        onSelectShape(null);
        return;
      }
    }

    isDraggingRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      id: null,
      origX: 0,
      origY: 0,
      origOffsetX: canvasView.offsetX,
      origOffsetY: canvasView.offsetY
    };
    onSelectImage(null);
    onSelectShape(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = isDraggingRef.current;
    if (!drag.type) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.type === 'pan') {
      onCanvasViewChange({
        ...canvasView,
        offsetX: drag.origOffsetX + dx,
        offsetY: drag.origOffsetY + dy
      });
    } else if (drag.type === 'image' && drag.id) {
      onImageMove(drag.id, drag.origX + dx / canvasView.scale, drag.origY + dy / canvasView.scale);
    } else if (drag.type === 'shape' && drag.id) {
      onShapeMove(drag.id, drag.origX + dx / canvasView.scale, drag.origY + dy / canvasView.scale);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = { type: null, startX: 0, startY: 0, id: null, origX: 0, origY: 0, origOffsetX: 0, origOffsetY: 0 };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData('imageId');
    if (!imageId) return;
    const pos = screenToCanvas(e.clientX, e.clientY);
    onDropImage(imageId, pos.x, pos.y);
  };

  return (
    <div className="canvas-wrapper" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      />
      {canvasImages.length === 0 && (
        <div className="canvas-hint">
          <MousePointer2 size={48} className="canvas-hint-icon" />
          <div>从左侧工具栏拖拽图片到此处</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>滚轮缩放 · 拖拽平移</div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
