import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  uploadAudio,
  UploadProgress,
  drawWaveform,
  validateAudioFile,
  extractAudioFeaturesLocal,
  AudioFeatures,
  getAudioDuration,
} from '../utils/audioProcessor';
import {
  ViewState,
  generateSpectrogramSVG,
  exportToPNG,
  exportToGIF,
} from '../utils/svgGenerator';

type Stage = 'upload' | 'processing' | 'spectrogram' | 'share';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const App: React.FC = () => {
  const [stage, setStage] = useState<Stage>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percent: 0 });
  const [features, setFeatures] = useState<AudioFeatures | null>(null);
  const [shareId, setShareId] = useState<string>('');
  const [uploadTime, setUploadTime] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [view, setView] = useState<ViewState>({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [exporting, setExporting] = useState<string>('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (svgContainerRef.current) {
        const rect = svgContainerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.max(600, Math.floor(rect.width)),
          height: Math.max(500, 600),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [stage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathMatch = window.location.pathname.match(/\/spectrogram\/([^/]+)/);
    const shareFromPath = pathMatch?.[1];
    const shared = shareFromPath || params.get('share');
    if (shared) {
      loadSharedSpectrogram(shared);
    }
  }, []);

  const loadSharedSpectrogram = async (id: string) => {
    try {
      const res = await fetch(`/api/spectrogram/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeatures(data.features);
          setAudioName(data.filename);
          setAudioDuration(data.duration);
          setUploadTime(data.upload_time);
          setStage('share');
        }
      }
    } catch (e) {
      console.error('Failed to load shared spectrogram', e);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError('');
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '文件验证失败');
      return;
    }

    setAudioFile(file);
    setAudioName(file.name);

    try {
      const duration = await getAudioDuration(file);
      if (duration > 120) {
        setUploadError('音频时长超过120秒限制');
        return;
      }
      setAudioDuration(duration);
    } catch {
      // ignore duration check error, let backend check it
    }

    if (waveformCanvasRef.current) {
      try {
        await drawWaveform(waveformCanvasRef.current, file, '#6cb5ff');
      } catch (e) {
        console.error('Waveform draw failed', e);
      }
    }

    setStage('processing');
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });

    try {
      let useBackend = true;
      let result: any = null;

      if (useBackend) {
        try {
          result = await uploadAudio(file, (progress) => {
            setUploadProgress(progress);
          });
        } catch (e: any) {
          console.warn('Backend upload failed, using local processing', e);
          useBackend = false;
        }
      }

      if (!useBackend || !result?.success) {
        setUploadProgress({ loaded: 50, total: 100, percent: 50 });
        const localFeatures = await extractAudioFeaturesLocal(file);
        const share_id = uuidv4();
        result = {
          success: true,
          share_id,
          filename: file.name,
          duration: localFeatures.duration,
          features: localFeatures,
          upload_time: new Date().toLocaleString('zh-CN'),
          share_url: `/spectrogram/${share_id}`,
        };
      }

      if (result && result.success) {
        setFeatures(result.features);
        setShareId(result.share_id);
        setUploadTime(result.upload_time);
        setShareUrl(result.share_url);
        setAudioDuration(result.duration || audioDuration);
        setView({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
        setStage('spectrogram');
      } else {
        throw new Error(result?.error || '处理失败');
      }
    } catch (e: any) {
      setUploadError(e.message || '上传失败');
      setStage('upload');
    }
  }, [audioDuration]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const svgContent = useMemo(() => {
    if (!features) return { html: '', width: 0, height: 0 };
    const { svg, svgWidth, svgHeight } = generateSpectrogramSVG(
      features,
      view,
      {
        width: containerSize.width,
        height: containerSize.height,
        interactive: true,
        includeLegend: true,
        title: audioName ? `声纹图谱 - ${audioName}` : '声纹图谱',
      }
    );
    return { html: svg, width: svgWidth, height: svgHeight };
  }, [features, view, containerSize, audioName]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (stage !== 'spectrogram') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    setView((v) => {
      const newScaleX = Math.max(1, Math.min(5, v.scaleX + delta));
      const newScaleY = Math.max(1, Math.min(5, v.scaleY + delta));
      return { ...v, scaleX: newScaleX, scaleY: newScaleY };
    });
  }, [stage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (stage !== 'spectrogram') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - view.offsetX, y: e.clientY - view.offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || stage !== 'spectrogram') return;
    setView((v) => {
      const plotW = containerSize.width - 140;
      const plotH = containerSize.height - 110;
      const totalW = plotW * v.scaleX;
      const totalH = plotH * v.scaleY;
      let newOffsetX = e.clientX - dragStart.x;
      let newOffsetY = e.clientY - dragStart.y;
      const maxOffsetX = 0;
      const minOffsetX = Math.min(0, plotW - totalW);
      const maxOffsetY = 0;
      const minOffsetY = Math.min(0, plotH - totalH);
      newOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
      newOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));
      return { ...v, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleExportPNG = async () => {
    const svg = svgRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svg || !features) return;
    setExporting('png');
    try {
      await new Promise((r) => setTimeout(r, 300));
      const baseName = audioName ? audioName.replace(/\.[^/.]+$/, '') : 'spectrogram';
      await exportToPNG(svg, `${baseName}.png`, 2);
    } catch (e) {
      console.error('PNG export failed', e);
    } finally {
      setExporting('');
    }
  };

  const handleExportGIF = async () => {
    if (!features) return;
    setExporting('gif');
    try {
      const baseName = audioName ? audioName.replace(/\.[^/.]+$/, '') : 'spectrogram';
      await exportToGIF(
        features,
        containerSize.width,
        containerSize.height,
        `${baseName}.gif`,
        3,
        10
      );
    } catch (e) {
      console.error('GIF export failed', e);
    } finally {
      setExporting('');
    }
  };

  const handleShare = () => {
    if (shareUrl) {
      const fullUrl = `${window.location.origin}${shareUrl}`;
      navigator.clipboard?.writeText(fullUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
    setShowShareModal(true);
    setTimeout(() => setShowShareModal(false), 3000);
  };

  const resetUpload = () => {
    setStage('upload');
    setAudioFile(null);
    setAudioName('');
    setAudioDuration(0);
    setUploadError('');
    setFeatures(null);
    setShareId('');
    setUploadTime('');
    setShareUrl('');
    setView({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (waveformCanvasRef.current) {
      const ctx = waveformCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, waveformCanvasRef.current.width, waveformCanvasRef.current.height);
    }
  };

  const scaleInfo = useMemo(() => {
    return {
      zoom: view.scaleX.toFixed(1),
      x: Math.round(-view.offsetX),
      y: Math.round(-view.offsetY),
    };
  }, [view]);

  const showUpload = stage === 'upload' || stage === 'processing';

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-bg"></div>
        <h1 className="app-title">声纹图谱</h1>
        <p className="app-subtitle">Voiceprint Spectrogram</p>
      </header>

      {showUpload && (
        <div className="upload-container">
          <div
            className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${uploadError ? 'has-error' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
              onChange={onFileInputChange}
              style={{ display: 'none' }}
            />
            <div className="upload-icon">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <path
                  fill="url(#uploadGrad)"
                  d="M32 8L18 22l4.2 4.2L30 18.4V44h4V18.4l7.8 7.8L46 22 32 8zM14 44h-4v12h48V44h-4v10H14V44z"
                />
                <defs>
                  <linearGradient id="uploadGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6c63ff" />
                    <stop offset="100%" stopColor="#00d2ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="upload-text">
              <h3>点击或拖拽音频文件到此处</h3>
              <p>支持 MP3 / WAV 格式，时长不超过 120 秒</p>
            </div>
          </div>

          {audioFile && (
            <div className="upload-preview">
              <div className="preview-info">
                <div className="preview-meta">
                  <span className="meta-name">{audioName}</span>
                  <span className="meta-duration">时长: {formatDuration(audioDuration)}</span>
                </div>
                <canvas
                  ref={waveformCanvasRef}
                  width={800}
                  height={60}
                  className="waveform-canvas"
                />
              </div>
              {stage === 'processing' && (
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress.percent}%` }} />
                  <span className="progress-text">{uploadProgress.percent}%</span>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="upload-error">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff6b6b">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{uploadError}</span>
              <button className="retry-btn" onClick={() => setUploadError('')}>重新上传</button>
            </div>
          )}
        </div>
      )}

      {stage === 'processing' && (
        <div className="processing-overlay">
          <div className="pulse-loader">
            <div className="pulse-ring pulse-ring-1" />
            <div className="pulse-ring pulse-ring-2" />
            <div className="pulse-center" />
          </div>
          <p>正在分析音频特征，请稍候...</p>
        </div>
      )}

      {(stage === 'spectrogram' || stage === 'share') && features && (
        <div className="spectrogram-wrapper">
          <div className="audio-info-card">
            <div className="audio-info">
              <h3>{audioName}</h3>
              <div className="audio-meta">
                <span>时长：{formatDuration(audioDuration)}</span>
                {uploadTime && <span>上传时间：{uploadTime}</span>}
              </div>
            </div>
            {stage === 'spectrogram' && (
              <button className="reset-btn" onClick={resetUpload}>重新上传</button>
            )}
          </div>

          <div
            ref={svgContainerRef}
            className="spectrogram-container"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: stage === 'spectrogram' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <div
              ref={svgRef}
              className="spectrogram-svg"
              dangerouslySetInnerHTML={{ __html: svgContent.html }}
            />

            {stage === 'spectrogram' && (
              <div className="view-info">
                <div>缩放: {scaleInfo.zoom}x</div>
                <div>位置: ({scaleInfo.x}, {scaleInfo.y})</div>
              </div>
            )}
          </div>

          {stage === 'spectrogram' && (
            <div className="action-buttons">
              <button
                className="action-btn export-png"
                onClick={handleExportPNG}
                disabled={exporting !== ''}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                {exporting === 'png' ? '导出中...' : '导出PNG'}
              </button>
              <button
                className="action-btn export-gif"
                onClick={handleExportGIF}
                disabled={exporting !== ''}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7 10c0 .55-.45 1-1 1h-1v1h-2v-3H9c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1h-2v1h2v3zm5 0h-3V9h-1.5v6h-1.5V8H18c.55 0 1 .45 1 1v5z"/>
                </svg>
                {exporting === 'gif' ? '生成中...' : '导出GIF'}
              </button>
              <button
                className="action-btn share-btn"
                onClick={handleShare}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2 .81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
                {shareCopied ? '已复制链接' : '分享'}
              </button>
            </div>
          )}
        </div>
      )}

      {showShareModal && (
        <div className="share-modal">
          <div className="share-modal-content">
            <h3>分享链接</h3>
            <p>复制以下链接分享给好友：</p>
            <div className="share-url-box">
              <input
                type="text"
                readOnly
                value={shareUrl ? `${window.location.origin}${shareUrl}` : ''}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  const text = shareUrl ? `${window.location.origin}${shareUrl}` : '';
                  navigator.clipboard?.writeText(text);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? '已复制' : '复制'}
              </button>
            </div>
            <p className="share-hint">对方打开链接可查看静态声纹图谱</p>
          </div>
        </div>
      )}

      {(exporting === 'png' || exporting === 'gif') && (
        <div className="exporting-overlay">
          <div className="export-spinner" />
          <p>正在{exporting === 'png' ? '生成PNG图片' : '生成GIF动画'}...</p>
        </div>
      )}

      <footer className="app-footer">
        <p>声纹图谱 - 让声音变得可见 © 2026</p>
      </footer>
    </div>
  );
};

export default App;
