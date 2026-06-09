import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Frame, Stroke, ExportConfig } from './types';

interface AnimateProps {
  frames: Frame[];
  config: ExportConfig;
  onConfigChange: (config: ExportConfig) => void;
  onComplete: (blob: Blob, type: string) => void;
  onCancel: () => void;
}

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 3000;

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = stroke.opacity;
  
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = stroke.size * 1.5;
  }

  ctx.beginPath();
  const pts = stroke.points;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
  }
  ctx.stroke();
  ctx.restore();
};

const renderFrameToCanvas = (frame: Frame, width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
  const offsetX = (width - CANVAS_WIDTH * scale) / 2;
  const offsetY = (height - CANVAS_HEIGHT * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const sortedLayers = [...frame.layers].sort((a, b) => a.order - b.order);
  sortedLayers.filter(l => l.visible).forEach(layer => {
    layer.strokes.forEach(stroke => drawStroke(ctx, stroke));
  });

  ctx.restore();
  return canvas;
};

const Animate: React.FC<AnimateProps> = ({
  frames,
  config,
  onConfigChange,
  onComplete,
  onCancel
}) => {
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [statusText, setStatusText] = useState('准备导出');
  const abortRef = useRef(false);

  const getResolution = (res: '720p' | '1080p') => {
    return res === '720p' ? { width: 1280, height: 720 } : { width: 1920, height: 1080 };
  };

  const exportAsGif = useCallback(async () => {
    setIsExporting(true);
    abortRef.current = false;
    const { width, height } = getResolution(config.resolution);
    const delay = Math.round(1000 / config.fps);

    try {
      setStatusText('正在加载编码器...');
      setProgress(5);

      const GIF: any = (window as any).GIF || await import('gif.js').then(m => m.default || m);
      
      if (typeof GIF === 'function') {
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width,
          height,
          workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
        });

        const totalFrames = frames.length;
        for (let i = 0; i < totalFrames; i++) {
          if (abortRef.current) return;
          setStatusText(`渲染帧 ${i + 1}/${totalFrames}`);
          setProgress(10 + Math.floor((i / totalFrames) * 60));
          
          const canvas = renderFrameToCanvas(frames[i], width, height);
          gif.addFrame(canvas, { delay, copy: true });
        }

        setStatusText('编码 GIF...');
        setProgress(75);

        gif.on('progress', (p: number) => {
          setProgress(75 + Math.floor(p * 20));
        });

        gif.on('finished', (blob: Blob) => {
          setProgress(100);
          setStatusText('完成！');
          setTimeout(() => onComplete(blob, 'gif'), 500);
        });

        gif.render();
      } else {
        throw new Error('GIF 编码器不可用');
      }
    } catch (e) {
      console.error('GIF export failed:', e);
      setStatusText('GIF 导出失败，尝试降级方案...');
      
      try {
        const canvas = renderFrameToCanvas(frames[0], width, height);
        canvas.toBlob((blob) => {
          if (blob) onComplete(blob, 'gif');
        }, 'image/png');
      } catch (e2) {
        setStatusText('导出失败');
        setIsExporting(false);
      }
    }
  }, [frames, config, onComplete]);

  const exportAsMp4 = useCallback(async () => {
    setIsExporting(true);
    abortRef.current = false;
    const { width, height } = getResolution(config.resolution);

    try {
      setStatusText('正在准备导出...');
      setProgress(5);

      const MediaRecorder = (window as any).MediaRecorder;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');

      let stream: MediaStream;
      try {
        stream = (canvas as any).captureStream(config.fps);
      } catch (e) {
        throw new Error('浏览器不支持视频录制');
      }

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder && MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('浏览器不支持视频编码');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: config.resolution === '1080p' ? 8000000 : 5000000
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        setProgress(100);
        setStatusText('完成！');
        setTimeout(() => onComplete(blob, 'mp4'), 500);
      };

      recorder.start();
      setStatusText('录制视频...');
      setProgress(20);

      const totalFrames = frames.length;
      const frameDuration = 1000 / config.fps;

      for (let i = 0; i < totalFrames; i++) {
        if (abortRef.current) {
          recorder.stop();
          return;
        }
        
        const frameCanvas = renderFrameToCanvas(frames[i], width, height);
        ctx.drawImage(frameCanvas, 0, 0);
        
        setProgress(20 + Math.floor((i / totalFrames) * 70));
        setStatusText(`录制帧 ${i + 1}/${totalFrames}`);
        
        await new Promise(resolve => setTimeout(resolve, frameDuration));
      }

      setProgress(95);
      setStatusText('最终处理...');
      await new Promise(resolve => setTimeout(resolve, 500));
      recorder.stop();

    } catch (e) {
      console.error('MP4 export failed:', e);
      setStatusText('视频导出失败，请尝试 GIF 格式');
      setIsExporting(false);
    }
  }, [frames, config, onComplete]);

  const handleStart = () => {
    if (config.type === 'gif') {
      exportAsGif();
    } else {
      exportAsMp4();
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    onCancel();
  };

  const fpsOptions = [8, 12, 15, 24, 30];

  return (
    <div className="export-overlay" onClick={isExporting ? undefined : onCancel}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-title">
          {isExporting ? '正在导出动画' : '导出设置'}
        </div>
        <div className="export-subtitle">
          {isExporting ? statusText : `共 ${frames.length} 帧，选择导出格式和参数`}
        </div>

        {!isExporting ? (
          <div className="export-options">
            <div>
              <div className="panel-section-title" style={{ marginBottom: '8px' }}>格式</div>
              <div className="export-option-row">
                <button
                  className={`export-option-btn ${config.type === 'gif' ? 'active' : ''}`}
                  onClick={() => onConfigChange({ ...config, type: 'gif' })}
                >
                  GIF
                </button>
                <button
                  className={`export-option-btn ${config.type === 'mp4' ? 'active' : ''}`}
                  onClick={() => onConfigChange({ ...config, type: 'mp4' })}
                >
                  MP4 (WebM)
                </button>
              </div>
            </div>

            <div>
              <div className="panel-section-title" style={{ marginBottom: '8px' }}>帧率 (FPS)</div>
              <div className="export-option-row">
                {fpsOptions.map(fps => (
                  <button
                    key={fps}
                    className={`export-option-btn ${config.fps === fps ? 'active' : ''}`}
                    onClick={() => onConfigChange({ ...config, fps })}
                  >
                    {fps}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="panel-section-title" style={{ marginBottom: '8px' }}>分辨率</div>
              <div className="export-option-row">
                <button
                  className={`export-option-btn ${config.resolution === '720p' ? 'active' : ''}`}
                  onClick={() => onConfigChange({ ...config, resolution: '720p' })}
                >
                  720p
                </button>
                <button
                  className={`export-option-btn ${config.resolution === '1080p' ? 'active' : ''}`}
                  onClick={() => onConfigChange({ ...config, resolution: '1080p' })}
                >
                  1080p
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="export-progress-container">
            <div className="export-progress-bar">
              <div
                className="export-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="export-progress-info">
              <span className="export-percentage">{progress}%</span>
              <div className="export-spinner" />
            </div>
          </div>
        )}

        <div className="btn-group">
          {!isExporting ? (
            <>
              <button className="btn-secondary" onClick={onCancel}>
                取消
              </button>
              <button className="btn-primary" onClick={handleStart}>
                开始导出
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={handleCancel}>
              取消导出
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Animate;
