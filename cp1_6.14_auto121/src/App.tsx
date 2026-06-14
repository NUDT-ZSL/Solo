import React, { useReducer, useRef, useEffect, useCallback } from 'react';
import { ImageProcessor } from './ImageProcessor';
import type { DenoiseParams } from './denoise';

interface AppState {
  file: File | null;
  originalImageData: ImageData | null;
  processedImageData: ImageData | null;
  thumbnailUrl: string;
  intensity: number;
  enhanceEdges: boolean;
  zoom: number;
  isDragging: boolean;
  isProcessing: boolean;
}

type Action =
  | { type: 'SET_FILE'; payload: { file: File; imageData: ImageData; thumbnail: string } }
  | { type: 'SET_INTENSITY'; payload: number }
  | { type: 'TOGGLE_ENHANCE_EDGES' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_PROCESSED'; payload: ImageData }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'RESET_FILE' };

const initialState: AppState = {
  file: null,
  originalImageData: null,
  processedImageData: null,
  thumbnailUrl: '',
  intensity: 2,
  enhanceEdges: true,
  zoom: 1,
  isDragging: false,
  isProcessing: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload.file,
        originalImageData: action.payload.imageData,
        processedImageData: action.payload.imageData,
        thumbnailUrl: action.payload.thumbnail,
      };
    case 'SET_INTENSITY':
      return { ...state, intensity: action.payload };
    case 'TOGGLE_ENHANCE_EDGES':
      return { ...state, enhanceEdges: !state.enhanceEdges };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_PROCESSED':
      return { ...state, processedImageData: action.payload, isProcessing: false };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'RESET_FILE':
      return {
        ...state,
        file: null,
        originalImageData: null,
        processedImageData: null,
        thumbnailUrl: '',
      };
    default:
      return state;
  }
}

const intensityLabels = ['低', '较低', '中', '较高', '高'];

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const processorRef = useRef<ImageProcessor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    processorRef.current = new ImageProcessor();
  }, []);

  useEffect(() => {
    if (!state.processedImageData || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = state.processedImageData;
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(state.processedImageData, 0, 0);
  }, [state.processedImageData]);

  const processImage = useCallback(() => {
    if (!processorRef.current || !state.originalImageData) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    dispatch({ type: 'SET_PROCESSING', payload: true });

    debounceRef.current = window.setTimeout(() => {
      const params: DenoiseParams = {
        intensity: state.intensity,
        enhanceEdges: state.enhanceEdges,
      };
      const result = processorRef.current!.process(state.originalImageData!, params);
      dispatch({ type: 'SET_PROCESSED', payload: result });
    }, 200);
  }, [state.originalImageData, state.intensity, state.enhanceEdges]);

  useEffect(() => {
    if (state.originalImageData) {
      processImage();
    }
  }, [processImage, state.originalImageData]);

  const handleFile = useCallback(async (file: File) => {
    if (!processorRef.current) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('请上传 PNG 或 JPG 格式的图片');
      return;
    }

    try {
      const imageData = await processorRef.current.fileToImageData(file);
      const thumbnail = URL.createObjectURL(file);
      dispatch({ type: 'SET_FILE', payload: { file, imageData, thumbnail } });
    } catch (error) {
      console.error('Failed to load image:', error);
      alert('图片加载失败，请重试');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAGGING', payload: false });

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAGGING', payload: true });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAGGING', payload: false });
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleIntensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_INTENSITY', payload: Number(e.target.value) });
  }, []);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_ZOOM', payload: Number(e.target.value) });
  }, []);

  const handleToggleEnhance = useCallback(() => {
    dispatch({ type: 'TOGGLE_ENHANCE_EDGES' });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!processorRef.current || !state.processedImageData || !state.file) return;

    try {
      const blob = await processorRef.current.imageDataToBlob(state.processedImageData);
      const filename = processorRef.current.generateFileName();
      processorRef.current.downloadImage(blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    }
  }, [state.processedImageData, state.file]);

  const handleReset = useCallback(() => {
    if (state.thumbnailUrl) {
      URL.revokeObjectURL(state.thumbnailUrl);
    }
    dispatch({ type: 'RESET_FILE' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [state.thumbnailUrl]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="header">
          <span className="header-icon">✨</span>
          <h1 className="header-title">PixelCleaner</h1>
        </div>

        <div className="panel-card">
          <h2 className="panel-title">上传图片</h2>

          {!state.file ? (
            <div
              className={`upload-area ${state.isDragging ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
            >
              <span className="upload-icon">📤</span>
              <span className="upload-text">拖拽图片到此处，或点击上传</span>
              <span className="upload-hint">支持 PNG / JPG 格式</span>
            </div>
          ) : (
            <div className="thumbnail-container">
              <img
                src={state.thumbnailUrl}
                alt="缩略图"
                className="thumbnail"
              />
              <div className="thumbnail-info">
                <span className="thumbnail-name">{state.file.name}</span>
                <span className="thumbnail-size">
                  {formatFileSize(state.file.size)} · {state.originalImageData?.width} × {state.originalImageData?.height}
                </span>
                <button className="btn btn-secondary change-btn" onClick={handleReset}>
                  更换图片
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>

        <div className="panel-card">
          <h2 className="panel-title">去噪强度</h2>
          <div className="slider-group">
            <div className="slider-label">
              <span>强度等级</span>
              <span className="slider-value">{intensityLabels[state.intensity]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={state.intensity}
              onChange={handleIntensityChange}
              disabled={!state.file}
            />
            <div className="intensity-label">
              <span>弱</span>
              <span>强</span>
            </div>
            <div className="level-indicators">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`level-dot ${state.intensity >= level ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="toggle-group">
            <span className="toggle-label">保持锐度（边缘增强）</span>
            <div
              className={`toggle-switch ${state.enhanceEdges ? 'active' : ''}`}
              onClick={handleToggleEnhance}
            />
          </div>
        </div>
      </div>

      <div className="right-panel">
        <div className="panel-card">
          <h2 className="panel-title">预览</h2>
          <div className="preview-container">
            <div className="preview-canvas-wrapper">
              {state.processedImageData ? (
                <canvas
                  ref={previewCanvasRef}
                  className="preview-canvas"
                  style={{
                    transform: `scale(${state.zoom})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="preview-placeholder">
                  上传图片后<br />这里将显示处理效果
                </div>
              )}
            </div>

            <div className="slider-group" style={{ width: '100%' }}>
              <div className="slider-label">
                <span>缩放</span>
                <span className="slider-value">{state.zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={state.zoom}
                onChange={handleZoomChange}
                disabled={!state.file}
              />
            </div>
          </div>
        </div>

        <button
          className="btn btn-large download-btn"
          onClick={handleDownload}
          disabled={!state.processedImageData || state.isProcessing}
        >
          {state.isProcessing ? '处理中...' : '⬇ 下载处理后的图片'}
        </button>
      </div>
    </div>
  );
}
