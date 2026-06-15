import React, { useState, useRef, useCallback, useEffect } from 'react';
import CoverCanvas, { CoverCanvasHandle } from './CoverCanvas';
import Celebration from './Celebration';
import { formatFileSize, exportCanvasAsPNG } from './utils';
import './App.css';

const CELEBRATION_THRESHOLD = 0.8;
const DEFAULT_BRUSH_RADIUS = 30;

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [brushRadius, setBrushRadius] = useState(DEFAULT_BRUSH_RADIUS);
  const [eraseProgress, setEraseProgress] = useState(0);
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<CoverCanvasHandle>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setUploadProgress(0);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
      setUploadProgress(100);
      setCelebrationTriggered(false);
      setShowResult(false);
      setEraseProgress(0);
    };

    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleProgressChange = useCallback((progress: number) => {
    setEraseProgress(progress);
    if (progress >= CELEBRATION_THRESHOLD && !celebrationTriggered) {
      setCelebrationTriggered(true);
      setCelebrationActive(true);
      setShowResult(true);
    }
  }, [celebrationTriggered]);

  const handleClearAll = useCallback(() => {
    canvasRef.current?.clearAll();
  }, []);

  const handleReset = useCallback(() => {
    canvasRef.current?.reset();
    setCelebrationTriggered(false);
    setShowResult(false);
    setCelebrationActive(false);
  }, []);

  const handleViewOriginal = useCallback(() => {
    canvasRef.current?.clearAll();
  }, []);

  const handleExport = useCallback(() => {
    const canvases = canvasRef.current?.getCanvases();
    if (canvases?.bg && canvases?.cover) {
      exportCanvasAsPNG(canvases.bg, canvases.cover);
    }
  }, []);

  useEffect(() => {
    if (celebrationActive) {
      const timer = setTimeout(() => {
        setCelebrationActive(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [celebrationActive]);

  if (!imageSrc) {
    return (
      <div className="app">
        <div className="upload-page">
          <h1 className="app-title">秘密刮刮乐</h1>
          <p className="app-subtitle">上传图片，刮开惊喜</p>

          <div
            className={`upload-area ${isDragging ? 'upload-area--dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            {fileName && uploadProgress > 0 ? (
              <img
                src={imageSrc || ''}
                alt="预览"
                className="upload-area__thumbnail"
                style={{ opacity: uploadProgress / 100 }}
              />
            ) : (
              <>
                <div className="upload-area__icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ffb347" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="upload-area__text">点击或拖拽图片到此处</p>
                <p className="upload-area__hint">支持 JPG、PNG、GIF 格式</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="upload-area__input"
              onChange={handleInputChange}
            />
          </div>

          {fileName && (
            <div className="upload-info">
              <div className="upload-info__file">
                <span className="upload-info__name">{fileName}</span>
                <span className="upload-info__size">{formatFileSize(fileSize)}</span>
              </div>
              <div className="upload-progress">
                <div
                  className="upload-progress__bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="scratch-page">
        <div className="control-panel">
          <h2 className="panel-title">刮刮乐设置</h2>

          <div className="control-group">
            <label className="control-label">
              笔刷半径: {brushRadius}px
            </label>
            <input
              type="range"
              min="10"
              max="80"
              value={brushRadius}
              onChange={(e) => setBrushRadius(Number(e.target.value))}
              className="slider"
            />
          </div>

          <button
            className="btn btn--danger"
            onClick={handleClearAll}
          >
            清除全部
          </button>

          <button
            className="btn btn--success"
            onClick={handleReset}
          >
            还原
          </button>
        </div>

        <div className="canvas-wrapper">
          <div className="progress-ring-top-right">
            <div className="progress-ring">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#333"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="#ffb347"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - eraseProgress)}
                  transform="rotate(-90 24 24)"
                  style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                />
              </svg>
              <span className="progress-ring__text">
                {Math.round(eraseProgress * 100)}%
              </span>
            </div>
          </div>

          <CoverCanvas
            ref={canvasRef}
            imageSrc={imageSrc}
            brushRadius={brushRadius}
            onProgressChange={handleProgressChange}
          />

          <Celebration active={celebrationActive} duration={2000} />

          {showResult && (
            <div className="result-card">
              <h3 className="result-card__title">🎉 恭喜你!</h3>
              <p className="result-card__message">
                你已成功揭开秘密！<br />
                愿这份惊喜带给你快乐~
              </p>
              <div className="result-card__actions">
                <button className="btn btn--primary" onClick={handleViewOriginal}>
                  查看原图
                </button>
                <button className="btn btn--outline" onClick={handleExport}>
                  导出结果
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
