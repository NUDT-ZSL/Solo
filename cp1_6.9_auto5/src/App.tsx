import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LayerData, Transform, AnimationConfig, LayerType } from './types';
import {
  generateId,
  createDefaultAnimation,
  createDefaultTransform,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';
import { renderLayerToCanvas, hitTest, exportToPNG, type HandleType, type HitResult } from './compositor';
import LayerPanel from './LayerPanel';
import './styles.css';

const PREVIEW_W = 1000;
const PREVIEW_H = 562;

const App: React.FC = () => {
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(performance.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const interactionRef = useRef<{
    mode: 'none' | 'move' | 'rotate' | 'scale';
    handle: HandleType | null;
    layerId: string | null;
    startMouseX: number;
    startMouseY: number;
    startTransform: Transform | null;
  }>({
    mode: 'none',
    handle: null,
    layerId: null,
    startMouseX: 0,
    startMouseY: 0,
    startTransform: null,
  });

  const drawingRef = useRef<{
    isDrawing: boolean;
    points: { x: number; y: number }[];
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
  }>({
    isDrawing: false,
    points: [],
    canvas: null,
    ctx: null,
  });

  const preloadImage = useCallback((id: string, src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        runtimeImagesRef.current.set(id, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const delta = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;
    timeRef.current += delta;

    frameCountRef.current++;
    if (now - fpsTimerRef.current >= 1000) {
      setFps(Math.round(frameCountRef.current * 1000 / (now - fpsTimerRef.current)));
      frameCountRef.current = 0;
      fpsTimerRef.current = now;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderLayerToCanvas(ctx, layers, runtimeImagesRef.current, timeRef.current, {
      selectedId,
      showHandles: !drawMode,
      hoveredHandle,
    });
    ctx.restore();

    if (drawMode && drawingRef.current.isDrawing && drawingRef.current.canvas) {
      ctx.drawImage(drawingRef.current.canvas, 0, 0, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }, [layers, selectedId, drawMode, hoveredHandle]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderFrame]);

  const addLayerFromImage = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert('图片大小不能超过 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      const id = generateId();
      try {
        const img = await preloadImage(id, src);
        const layer: LayerData = {
          id,
          type: 'image',
          src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          transform: createDefaultTransform(PREVIEW_W, PREVIEW_H, img.naturalWidth, img.naturalHeight),
          blendMode: 'normal',
          opacity: 1,
          animation: createDefaultAnimation(),
        };
        setLayers((prev) => [...prev, layer]);
        setSelectedId(id);
        setDrawMode(false);
      } catch (err) {
        console.error('图片加载失败', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addLayerFromImage(file);
    e.target.value = '';
  };

  const updateLayer = (id: string, patch: Partial<LayerData>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const updateLayerTransform = (id: string, transform: Partial<Transform>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, transform: { ...l.transform, ...transform } } : l))
    );
  };

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    runtimeImagesRef.current.delete(id);
    if (selectedId === id) setSelectedId(null);
  };

  const reorderLayers = (fromIdx: number, toIdx: number) => {
    setLayers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const resetAll = () => {
    if (layers.length === 0) return;
    if (confirm('确定要清除所有图层吗？')) {
      setLayers([]);
      setSelectedId(null);
      runtimeImagesRef.current.clear();
    }
  };

  const doExport = () => {
    const dataUrl = exportToPNG(layers, runtimeImagesRef.current);
    const a = document.createElement('a');
    a.download = `活态拼贴-${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  };

  const canvasToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (drawMode) {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      if (!drawingRef.current.canvas) {
        drawingRef.current.canvas = document.createElement('canvas');
        drawingRef.current.canvas.width = PREVIEW_W;
        drawingRef.current.canvas.height = PREVIEW_H;
        drawingRef.current.ctx = drawingRef.current.canvas.getContext('2d');
      }
      const dctx = drawingRef.current.ctx!;
      dctx.strokeStyle = '#ffffff';
      dctx.lineWidth = 3;
      dctx.lineCap = 'round';
      dctx.lineJoin = 'round';
      dctx.beginPath();
      dctx.moveTo(x, y);
      drawingRef.current.isDrawing = true;
      drawingRef.current.points = [{ x, y }];
      return;
    }

    const { x, y } = canvasToWorld(e.clientX, e.clientY);
    const hit: HitResult = hitTest(layers, runtimeImagesRef.current, timeRef.current, x, y);

    if (!hit) {
      setSelectedId(null);
      return;
    }

    setSelectedId(hit.layerId);

    if (hit.type === 'handle') {
      const layer = layers.find((l) => l.id === hit.layerId);
      if (!layer) return;

      let mode: 'move' | 'rotate' | 'scale' = 'move';
      if (hit.handle === 'rotate') mode = 'rotate';
      else if (hit.handle === 'move') mode = 'move';
      else mode = 'scale';

      interactionRef.current = {
        mode,
        handle: hit.handle,
        layerId: hit.layerId,
        startMouseX: x,
        startMouseY: y,
        startTransform: { ...layer.transform },
      };
    } else {
      const layer = layers.find((l) => l.id === hit.layerId);
      if (!layer) return;
      interactionRef.current = {
        mode: 'move',
        handle: 'move',
        layerId: hit.layerId,
        startMouseX: x,
        startMouseY: y,
        startTransform: { ...layer.transform },
      };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = canvasToWorld(e.clientX, e.clientY);

    if (drawMode) {
      if (drawingRef.current.isDrawing && drawingRef.current.ctx) {
        const dctx = drawingRef.current.ctx;
        const pts = drawingRef.current.points;
        pts.push({ x, y });
        dctx.lineTo(x, y);
        dctx.stroke();
      }
      return;
    }

    const ia = interactionRef.current;
    if (ia.mode !== 'none' && ia.layerId && ia.startTransform) {
      const dx = x - ia.startMouseX;
      const dy = y - ia.startMouseY;
      const t = ia.startTransform;

      if (ia.mode === 'move') {
        updateLayerTransform(ia.layerId, {
          x: t.x + dx,
          y: t.y + dy,
        });
      } else if (ia.mode === 'rotate') {
        const angle = Math.atan2(ia.startMouseY - t.y, ia.startMouseX - t.x);
        const newAngle = Math.atan2(y - t.y, x - t.x);
        const deltaDeg = ((newAngle - angle) * 180) / Math.PI;
        let rot = t.rotation + deltaDeg;
        while (rot < 0) rot += 360;
        while (rot >= 360) rot -= 360;
        updateLayerTransform(ia.layerId, { rotation: Math.round(rot) });
      } else if (ia.mode === 'scale') {
        const handle = ia.handle;
        let scaleFactor = 1;
        if (handle === 'br') {
          const origDist = Math.sqrt(
            (ia.startMouseX - t.x) ** 2 + (ia.startMouseY - t.y) ** 2
          );
          const newDist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
          scaleFactor = origDist > 0 ? newDist / origDist : 1;
        } else if (handle === 'tl') {
          const origDist = Math.sqrt(
            (ia.startMouseX - t.x) ** 2 + (ia.startMouseY - t.y) ** 2
          );
          const newDist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
          scaleFactor = origDist > 0 ? newDist / origDist : 1;
        } else if (handle === 'tr') {
          const origDist = Math.sqrt(
            (ia.startMouseX - t.x) ** 2 + (ia.startMouseY - t.y) ** 2
          );
          const newDist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
          scaleFactor = origDist > 0 ? newDist / origDist : 1;
        } else if (handle === 'bl') {
          const origDist = Math.sqrt(
            (ia.startMouseX - t.x) ** 2 + (ia.startMouseY - t.y) ** 2
          );
          const newDist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
          scaleFactor = origDist > 0 ? newDist / origDist : 1;
        }
        const newScale = Math.max(0.1, Math.min(3, t.scale * scaleFactor));
        updateLayerTransform(ia.layerId, { scale: Math.round(newScale * 10) / 10 });
      }
    } else {
      const hit = hitTest(layers, runtimeImagesRef.current, timeRef.current, x, y);
      if (hit && hit.type === 'handle') {
        setHoveredHandle(hit.handle);
        let cursor = 'default';
        if (hit.handle === 'rotate') cursor = 'grab';
        else if (hit.handle === 'tl' || hit.handle === 'br') cursor = 'nwse-resize';
        else if (hit.handle === 'tr' || hit.handle === 'bl') cursor = 'nesw-resize';
        canvas.style.cursor = cursor;
      } else if (hit && hit.type === 'layer') {
        setHoveredHandle(null);
        canvas.style.cursor = 'move';
      } else {
        setHoveredHandle(null);
        canvas.style.cursor = 'default';
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (drawMode && drawingRef.current.isDrawing) {
      drawingRef.current.isDrawing = false;
      if (drawingRef.current.canvas && drawingRef.current.points.length > 2) {
        const src = drawingRef.current.canvas.toDataURL('image/png');
        const id = generateId();
        preloadImage(id, src).then((img) => {
          const layer: LayerData = {
            id,
            type: 'draw',
            src,
            width: drawingRef.current.canvas!.width,
            height: drawingRef.current.canvas!.height,
            transform: createDefaultTransform(
              PREVIEW_W,
              PREVIEW_H,
              drawingRef.current.canvas!.width,
              drawingRef.current.canvas!.height
            ),
            blendMode: 'normal',
            opacity: 1,
            animation: createDefaultAnimation(),
          };
          setLayers((prev) => [...prev, layer]);
          setSelectedId(id);
        });
      }
      drawingRef.current.points = [];
      if (drawingRef.current.ctx) {
        drawingRef.current.ctx.clearRect(
          0,
          0,
          drawingRef.current.canvas!.width,
          drawingRef.current.canvas!.height
        );
      }
      return;
    }

    interactionRef.current = {
      mode: 'none',
      handle: null,
      layerId: null,
      startMouseX: 0,
      startMouseY: 0,
      startTransform: null,
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      addLayerFromImage(file);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">活态拼贴 <span className="title-accent">· 图层工坊</span></h1>
        </div>
        <div className="header-tools">
          <button
            className={`tool-btn primary ${drawMode ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="btn-icon">＋</span>
            添加图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            className={`tool-btn ${drawMode ? 'warning active' : ''}`}
            onClick={() => setDrawMode((v) => !v)}
          >
            <span className="btn-icon">✎</span>
            {drawMode ? '退出手绘' : '手绘模式'}
          </button>
          <div className="tool-divider" />
          <button className="tool-btn success" onClick={doExport} disabled={layers.length === 0}>
            <span className="btn-icon">↓</span>
            导出 PNG
          </button>
          <button className="tool-btn danger" onClick={resetAll} disabled={layers.length === 0}>
            <span className="btn-icon">↺</span>
            重置
          </button>
          <div className="fps-badge" title="帧率">{fps} FPS</div>
        </div>
      </header>

      <main className="app-body">
        <section
          className="canvas-area"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="canvas-wrap">
            <canvas
              ref={canvasRef}
              width={PREVIEW_W}
              height={PREVIEW_H}
              className="main-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            {layers.length === 0 && (
              <div className="canvas-hint">
                <div className="hint-inner">
                  <div className="hint-icon">🎨</div>
                  <h3>开始你的拼贴创作</h3>
                  <p>点击「添加图片」上传或直接拖拽图片到此处</p>
                  <p className="hint-sub">也可以切换「手绘模式」自由绘制</p>
                </div>
              </div>
            )}
          </div>
          <div className="canvas-caption">
            <span>画布尺寸：1920 × 1080（导出分辨率）</span>
            {drawMode && <span className="draw-tag">✎ 手绘模式已开启</span>}
          </div>
        </section>

        <aside className="panel-area">
          <LayerPanel
            layers={layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateLayer={updateLayer}
            onDeleteLayer={deleteLayer}
            onReorder={reorderLayers}
          />
        </aside>
      </main>
    </div>
  );
};

export default App;
