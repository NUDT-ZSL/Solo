import { useEffect, useRef, useState, useCallback } from 'react';
import type { Region } from '../imageProcessor/types';
import { ColorFiller } from '../imageProcessor/colorFiller';
import { parseLineArt, findRegionAtPoint } from '../imageProcessor/lineArtParser';

interface CanvasAreaProps {
  onRegionsChange: (regions: Region[]) => void;
  onSelectedRegionChange: (region: Region | null) => void;
  selectedRegionId: number | null;
  onImageLoaded: () => void;
  isImageLoaded: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onFillerReady: (filler: ColorFiller | null) => void;
}

const CANVAS_SIZE = 512;

export default function CanvasArea({
  onRegionsChange,
  onSelectedRegionChange,
  selectedRegionId,
  onImageLoaded,
  isImageLoaded,
  isLoading,
  setIsLoading,
  onFillerReady,
}: CanvasAreaProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const parseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorFillerRef = useRef<ColorFiller | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    return () => {
      if (colorFillerRef.current) {
        colorFillerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (colorFillerRef.current && isImageLoaded) {
      colorFillerRef.current.highlightRegion(selectedRegionId);
    }
  }, [selectedRegionId, isImageLoaded]);

  const processImage = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/png')) {
        alert('请上传PNG格式的图片');
        return;
      }

      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = CANVAS_SIZE;
          offscreenCanvas.height = CANVAS_SIZE;
          const offCtx = offscreenCanvas.getContext('2d', {
            willReadFrequently: true,
          });
          if (!offCtx) return;

          offCtx.fillStyle = '#ffffff';
          offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

          const scale = Math.min(
            CANVAS_SIZE / img.width,
            CANVAS_SIZE / img.height,
          );
          const x = (CANVAS_SIZE - img.width * scale) / 2;
          const y = (CANVAS_SIZE - img.height * scale) / 2;
          offCtx.drawImage(img, x, y, img.width * scale, img.height * scale);

          parseCanvasRef.current = offscreenCanvas;

          setTimeout(() => {
            try {
              const result = parseLineArt(offscreenCanvas);
              const canvas = displayCanvasRef.current;
              if (!canvas) return;

              canvas.width = result.width;
              canvas.height = result.height;

              if (colorFillerRef.current) {
                colorFillerRef.current.destroy();
              }

              const filler = new ColorFiller(canvas);
              filler.setOnColorChange((regions) => {
                onRegionsChange(regions);
              });
              filler.initialize(
                result.imageData,
                result.regions,
                result.width,
                result.height,
              );
              colorFillerRef.current = filler;
              onFillerReady(filler);
              onRegionsChange(result.regions);
              onImageLoaded();
            } catch (err) {
              console.error('解析线稿失败:', err);
              alert('解析线稿失败，请尝试其他图片');
            } finally {
              setIsLoading(false);
            }
          }, 50);
        };
        img.onerror = () => {
          setIsLoading(false);
          alert('加载图片失败');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    [onFillerReady, onImageLoaded, onRegionsChange, setIsLoading],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageLoaded || !colorFillerRef.current) return;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const regions = colorFillerRef.current.getRegions();
    const region = findRegionAtPoint(regions, x, y);
    onSelectedRegionChange(region);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="canvas-wrapper">
      <div className="app-header">
        <div className="app-title">LineArt Color Studio</div>
        <div className="app-subtitle">线稿智能上色</div>
      </div>

      <canvas
        ref={displayCanvasRef}
        onClick={handleCanvasClick}
        style={{ display: isImageLoaded ? 'block' : 'none' }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {!isImageLoaded && !isLoading && (
        <div
          className={`canvas-upload-overlay ${isDragging ? 'dragging' : ''}`}
          onClick={handleUploadClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <svg
            className="upload-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="upload-text">点击或拖拽上传PNG线稿</div>
          <div className="upload-hint">
            建议尺寸 512×512 像素，纯白背景黑色线条
          </div>
        </div>
      )}

      {isLoading && (
        <div className="canvas-loading">
          <div className="spinner" />
          <div className="loading-text">正在解析线稿...</div>
        </div>
      )}
    </div>
  );
}
