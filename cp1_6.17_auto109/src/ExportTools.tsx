import React, { useState, useRef, useEffect } from 'react';
import { Frame } from './types';
import GIF from 'gif.js';

interface ExportToolsProps {
  frames: Frame[];
  fps: number;
}

const ExportTools: React.FC<ExportToolsProps> = ({ frames, fps }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportType, setExportType] = useState<'gif' | 'sprite' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const exportGif = async () => {
    if (frames.length === 0 || exporting) return;
    setExporting(true);
    setExportProgress(0);
    setExportType('gif');
    setIsOpen(false);

    try {
      const firstFrame = frames[0];
      const width = firstFrame.width;
      const height = firstFrame.height;
      const delay = 1000 / fps;

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        workerScript: '/gif.worker.js',
      });

      for (let i = 0; i < frames.length; i++) {
        const img = await loadImage(frames[i].url);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        gif.addFrame(ctx, { copy: true, delay });
        setExportProgress(Math.round(((i + 1) / frames.length) * 50));
      }

      gif.on('progress', (p: number) => {
        setExportProgress(50 + Math.round(p * 50));
      });

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExporting(false);
        setExportProgress(0);
        setExportType(null);
      });

      gif.render();
    } catch (error) {
      console.error('GIF export failed:', error);
      setExporting(false);
      setExportProgress(0);
      setExportType(null);
    }
  };

  const exportSpriteSheet = async () => {
    if (frames.length === 0 || exporting) return;
    setExporting(true);
    setExportProgress(0);
    setExportType('sprite');
    setIsOpen(false);

    try {
      const firstFrame = frames[0];
      const frameWidth = firstFrame.width;
      const frameHeight = firstFrame.height;
      const gap = 2;
      const totalWidth = frameWidth * frames.length + gap * (frames.length - 1);

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d')!;

      for (let i = 0; i < frames.length; i++) {
        const img = await loadImage(frames[i].url);
        const x = i * (frameWidth + gap);
        ctx.drawImage(img, x, 0, frameWidth, frameHeight);
        if (i < frames.length - 1) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + frameWidth, 0, gap, frameHeight);
        }
        setExportProgress(Math.round(((i + 1) / frames.length) * 100));
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'spritesheet.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setExporting(false);
        setExportProgress(0);
        setExportType(null);
      }, 'image/png');
    } catch (error) {
      console.error('Sprite sheet export failed:', error);
      setExporting(false);
      setExportProgress(0);
      setExportType(null);
    }
  };

  const disabled = frames.length === 0 || exporting;

  return (
    <div className="export-tools" ref={dropdownRef}>
      <button
        className={`export-btn ${exporting ? 'exporting' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {exporting ? (
          <span className="export-btn-content">
            <span className="spinner"></span>
            <span>{exportType === 'gif' ? '导出GIF' : '导出精灵图'} {exportProgress}%</span>
          </span>
        ) : (
          '导出 ▾'
        )}
      </button>
      {isOpen && !exporting && (
        <div className="export-dropdown">
          <button className="dropdown-item" onClick={exportGif}>
            <span className="dropdown-icon">🎞️</span>
            <span className="dropdown-text">
              <span className="dropdown-title">导出为 GIF</span>
              <span className="dropdown-subtitle">循环播放，白色背景</span>
            </span>
          </button>
          <button className="dropdown-item" onClick={exportSpriteSheet}>
            <span className="dropdown-icon">📊</span>
            <span className="dropdown-text">
              <span className="dropdown-title">导出为精灵图</span>
              <span className="dropdown-subtitle">横向拼接，PNG格式</span>
            </span>
          </button>
        </div>
      )}
      {exporting && (
        <div className="export-progress-overlay">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportTools;
