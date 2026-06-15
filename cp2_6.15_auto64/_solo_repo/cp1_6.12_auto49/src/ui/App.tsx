import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { RotateCcw, PanelLeft, PanelRight } from 'lucide-react';
import './styles.css';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import EditorPanel from './EditorPanel';
import { uploadImage, type ProcessedImage } from '../core/imageProcessor';
import type { ShapeType, BlendMode } from '../core/shapeRenderer';

interface UploadedImageData extends ProcessedImage {
  id: string;
  file: File;
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

interface CanvasView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const CANVAS_RATIO = 16 / 9;

const generateId = () => Math.random().toString(36).slice(2, 10);

const App: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImageData[]>([]);
  const [canvasImages, setCanvasImages] = useState<CanvasImageData[]>([]);
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [lightEffectsEnabled, setLightEffectsEnabled] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [canvasView, setCanvasView] = useState<CanvasView>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 540 });

  useEffect(() => {
    const updateSize = () => {
      if (!canvasContainerRef.current) return;
      const container = canvasContainerRef.current;
      const padding = 40;
      const availW = container.clientWidth - padding;
      const availH = container.clientHeight - padding;
      let w = availW;
      let h = w / CANVAS_RATIO;
      if (h > availH) {
        h = availH;
        w = h * CANVAS_RATIO;
      }
      setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (uploadedImages.length >= 12) return;
    try {
      const processed = await uploadImage(file, canvasSize);
      const newImg: UploadedImageData = {
        ...processed,
        id: generateId(),
        file
      };
      setUploadedImages((prev) => [...prev, newImg]);
    } catch (err) {
      console.error('上传图片失败:', err);
    }
  }, [uploadedImages.length, canvasSize]);

  const handleDeleteUploaded = useCallback((id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    setCanvasImages((prev) => prev.filter((ci) => ci.imageId !== id));
    setShapes((prev) => {
      const remainingCanvasIds = new Set(
        canvasImages.filter((ci) => ci.imageId !== id).map((ci) => ci.id)
      );
      return prev.filter((s) => remainingCanvasIds.has(s.canvasImageId));
    });
    if (canvasImages.find((ci) => ci.imageId === id)?.id === selectedImageId) {
      setSelectedImageId(null);
      setSelectedShapeId(null);
    }
  }, [canvasImages, selectedImageId]);

  const handleDropImage = useCallback((imageId: string, x: number, y: number) => {
    const uImg = uploadedImages.find((ui) => ui.id === imageId);
    if (!uImg) return;

    const baseSize = Math.min(canvasSize.width, canvasSize.height) * 0.4;
    const scale = Math.min(baseSize / uImg.width, baseSize / uImg.height);
    const displayW = Math.floor(uImg.width * scale);
    const displayH = Math.floor(uImg.height * scale);

    const newCanvasImg: CanvasImageData = {
      id: generateId(),
      imageId: uImg.id,
      x: Math.round(x - displayW / 2),
      y: Math.round(y - displayH / 2),
      width: displayW,
      height: displayH,
      opacity: 100,
      blendMode: 'normal',
      fadeInProgress: 0,
      hueShift: 0
    };

    setCanvasImages((prev) => [...prev, newCanvasImg]);
    setSelectedImageId(newCanvasImg.id);
    setSelectedShapeId(null);
  }, [uploadedImages, canvasSize]);

  const handleFadeInProgress = useCallback((id: string, progress: number) => {
    setCanvasImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, fadeInProgress: progress } : img))
    );
  }, []);

  const handleSelectImage = useCallback((id: string | null) => {
    setSelectedImageId(id);
    if (id === null) {
      setSelectedShapeId(null);
    }
    setMobileRightOpen(!!id);
  }, []);

  const handleSelectShape = useCallback((id: string | null) => {
    setSelectedShapeId(id);
  }, []);

  const handleImageMove = useCallback((id: string, x: number, y: number) => {
    setCanvasImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, x: Math.round(x), y: Math.round(y) } : img))
    );
  }, []);

  const handleShapeMove = useCallback((id: string, x: number, y: number) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: Math.round(x), y: Math.round(y) } : s))
    );
  }, []);

  const handleImageChange = useCallback((patch: Partial<Pick<CanvasImageData, 'opacity' | 'blendMode'>>) => {
    if (!selectedImageId) return;
    setCanvasImages((prev) =>
      prev.map((img) => {
        if (img.id !== selectedImageId) return img;
        const updated = { ...img, ...patch };
        if (patch.blendMode && patch.blendMode !== img.blendMode) {
          updated.hueShift = 1;
          setTimeout(() => {
            setCanvasImages((p2) =>
              p2.map((i2) => (i2.id === img.id ? { ...i2, hueShift: 0 } : i2))
            );
          }, 300);
        }
        return updated;
      })
    );
  }, [selectedImageId]);

  const selectedImage = useMemo(
    () => canvasImages.find((ci) => ci.id === selectedImageId) || null,
    [canvasImages, selectedImageId]
  );

  const selectedImageShapes = useMemo(
    () => shapes.filter((s) => s.canvasImageId === selectedImageId),
    [shapes, selectedImageId]
  );

  const handleAddShape = useCallback((type: ShapeType) => {
    if (!selectedImage || !selectedImageId) return;
    const newShape: ShapeData = {
      id: generateId(),
      canvasImageId: selectedImageId,
      type,
      x: Math.round(selectedImage.x + selectedImage.width / 2),
      y: Math.round(selectedImage.y + selectedImage.height / 2),
      size: 80,
      rotation: 0,
      strokeWidth: 1,
      glowColor: '#00f5ff'
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
  }, [selectedImage, selectedImageId]);

  const handleShapeChange = useCallback((
    id: string,
    patch: Partial<Pick<ShapeData, 'type' | 'size' | 'rotation' | 'strokeWidth' | 'glowColor'>>
  ) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

  const handleDeleteShape = useCallback((id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    if (selectedShapeId === id) {
      setSelectedShapeId(null);
    }
  }, [selectedShapeId]);

  const handleGenerateLightEffects = useCallback(() => {
    setLightEffectsEnabled((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm('确定要重置画布吗？所有内容将被清空。')) return;
    setCanvasImages([]);
    setShapes([]);
    setLightEffectsEnabled(false);
    setSelectedImageId(null);
    setSelectedShapeId(null);
    setCanvasView({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-title">PHOTONMOSAIC</div>
        <div className="navbar-actions">
          <button className="btn btn-danger" onClick={handleReset}>
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </nav>

      <div className="main-content">
        <Toolbar
          images={uploadedImages.map((img) => ({
            id: img.id,
            thumbnailUrl: img.thumbnailUrl,
            originalUrl: img.originalUrl
          }))}
          onUpload={handleUpload}
          onDelete={handleDeleteUploaded}
          onGenerateLightEffects={handleGenerateLightEffects}
          lightEffectsEnabled={lightEffectsEnabled}
          mobileOpen={mobileLeftOpen}
        />

        <div className="canvas-container" ref={canvasContainerRef}>
          <Canvas
            width={canvasSize.width}
            height={canvasSize.height}
            uploadedImages={uploadedImages}
            canvasImages={canvasImages}
            shapes={shapes}
            lightEffectsEnabled={lightEffectsEnabled}
            selectedImageId={selectedImageId}
            selectedShapeId={selectedShapeId}
            canvasView={canvasView}
            onCanvasViewChange={setCanvasView}
            onSelectImage={handleSelectImage}
            onSelectShape={handleSelectShape}
            onImageMove={handleImageMove}
            onShapeMove={handleShapeMove}
            onFadeInProgress={handleFadeInProgress}
            onUpdateShapePixels={() => {}}
            onDropImage={handleDropImage}
          />
        </div>

        <EditorPanel
          selectedImage={selectedImage}
          shapes={selectedImageShapes}
          selectedShapeId={selectedShapeId}
          onImageChange={handleImageChange}
          onAddShape={handleAddShape}
          onSelectShape={handleSelectShape}
          onShapeChange={handleShapeChange}
          onDeleteShape={handleDeleteShape}
          mobileOpen={mobileRightOpen}
        />
      </div>

      <button
        className="mobile-toggle-left"
        onClick={() => {
          setMobileLeftOpen((v) => !v);
          setMobileRightOpen(false);
        }}
        title="工具栏"
      >
        <PanelLeft size={20} />
      </button>

      <button
        className="mobile-toggle-right"
        onClick={() => {
          setMobileRightOpen((v) => !v);
          setMobileLeftOpen(false);
        }}
        title="编辑面板"
      >
        <PanelRight size={20} />
      </button>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}

export default App;
