import React, { useCallback, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useLyricsStore } from './store/useLyricsStore';
import { generateTimestamp } from './utils/time';
import { LyricLine } from './types';

const FPS = 30;
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

let ffmpegInstance: FFmpeg | null = null;

async function loadFFmpeg(onProgress: (message: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  onProgress('正在加载 FFmpeg 核心...');
  
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  time: number,
  lines: LyricLine[]
): void {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_HEIGHT);
  gradient.addColorStop(0, '#0d1117');
  gradient.addColorStop(1, '#161b22');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  for (const line of lines) {
    const { startTime, endTime, style } = line;
    const duration = style.animationDuration;

    if (time < startTime - duration || time >= endTime) continue;

    let opacity = 1;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    if (time < startTime) {
      const progress = (time - (startTime - duration)) / duration;
      switch (style.enterAnimation) {
        case 'fadeIn':
          opacity = progress;
          break;
        case 'slideLeft':
          opacity = progress;
          offsetX = -100 * (1 - progress);
          break;
        case 'riseUp':
          opacity = progress;
          offsetY = 50 * (1 - progress);
          break;
        case 'zoomIn':
          opacity = progress;
          scale = 0.5 + 0.5 * progress;
          break;
      }
    } else if (time >= endTime - duration) {
      const progress = (time - (endTime - duration)) / duration;
      switch (style.exitAnimation) {
        case 'fadeOut':
          opacity = 1 - progress;
          break;
        case 'slideRight':
          opacity = 1 - progress;
          offsetX = 100 * progress;
          break;
        case 'zoomOut':
          opacity = 1 - progress;
          scale = 1 - 0.5 * progress;
          break;
      }
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `600 ${style.fontSize * 2}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    const x = VIDEO_WIDTH / 2 + offsetX * 2;
    const y = VIDEO_HEIGHT / 2 + offsetY * 2;

    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText(line.text, 0, 0);
    ctx.restore();
    break;
  }
}

interface VideoExporterProps {
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export const VideoExporter: React.FC<VideoExporterProps> = ({
  onExportStart,
  onExportComplete,
}) => {
  const lyricsData = useLyricsStore((state) => state.lyricsData);
  const exportProgress = useLyricsStore((state) => state.exportProgress);
  const setExportProgress = useLyricsStore((state) => state.setExportProgress);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayProgressRef = useRef({
    current: 0,
    target: 0,
    rafId: null as number | null,
    lastFrameTime: 0,
    frameCount: 0,
    avgFrameTime: 16,
  });

  const exportVideo = useCallback(async () => {
    if (!lyricsData || lyricsData.lines.length === 0) {
      alert('请先上传歌词文件');
      return;
    }

    onExportStart?.();
    setExportProgress({ status: 'processing', progress: 0, message: '准备导出...' });

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const ffmpeg = await loadFFmpeg((msg) => {
        setExportProgress({ message: msg });
      });

      const totalFrames = Math.ceil(lyricsData.totalDuration * FPS);
      const frameFiles: string[] = [];

      for (let i = 0; i < totalFrames; i++) {
        const time = i / FPS;
        renderFrameToCanvas(ctx, time, lyricsData.lines);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        const fileName = `frame_${i.toString().padStart(6, '0')}.png`;
        await ffmpeg.writeFile(fileName, await fetchFile(blob));
        frameFiles.push(fileName);

        const progress = Math.round(((i + 1) / totalFrames) * 70);
        setExportProgress({
          progress,
          message: `渲染帧 ${i + 1}/${totalFrames} (${progress}%)`,
        });
      }

      setExportProgress({ progress: 75, message: '正在合成视频...' });

      await ffmpeg.exec([
        '-framerate',
        FPS.toString(),
        '-i',
        'frame_%06d.png',
        '-c:v',
        'libvpx-vp9',
        '-b:v',
        '2M',
        '-crf',
        '30',
        '-y',
        'output.webm',
      ]);

      setExportProgress({ progress: 95, message: '正在生成下载文件...' });

      const data = await ffmpeg.readFile('output.webm');
      const videoBlob = new Blob([data], { type: 'video/webm' });
      const url = URL.createObjectURL(videoBlob);

      const songName = lyricsData.metadata.title || 'lyrics';
      const timestamp = generateTimestamp();
      const fileName = `${songName}_${timestamp}.webm`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      for (const file of frameFiles) {
        try {
          await ffmpeg.deleteFile(file);
        } catch (e) {
          console.error('删除帧文件失败:', e);
        }
      }
      try {
        await ffmpeg.deleteFile('output.webm');
      } catch (e) {
        console.error('删除输出文件失败:', e);
      }

      setExportProgress({
        status: 'completed',
        progress: 100,
        message: `导出完成！文件已下载: ${fileName}`,
      });

      setTimeout(() => {
        setExportProgress({ status: 'idle', progress: 0 });
        onExportComplete?.();
      }, 3000);
    } catch (error) {
      console.error('导出视频失败:', error);
      setExportProgress({
        status: 'error',
        progress: 0,
        message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }, [lyricsData, setExportProgress, onExportStart, onExportComplete]);

  const isDisabled =
    !lyricsData ||
    lyricsData.lines.length === 0 ||
    exportProgress.status === 'processing';

  const [displayProgress, setDisplayProgress] = useState(0);

  React.useEffect(() => {
    const state = displayProgressRef.current;

    const animate = (timestamp: number) => {
      if (state.lastFrameTime === 0) {
        state.lastFrameTime = timestamp;
      }
      
      const deltaTime = timestamp - state.lastFrameTime;
      state.lastFrameTime = timestamp;
      
      state.frameCount++;
      state.avgFrameTime = state.avgFrameTime * 0.9 + deltaTime * 0.1;
      
      const diff = state.target - state.current;
      const baseSpeed = 0.15;
      const speedFactor = Math.min(3, Math.max(0.5, 16 / state.avgFrameTime));
      const speed = baseSpeed * speedFactor;
      
      if (Math.abs(diff) > 0.01) {
        state.current += diff * speed;
        if (Math.abs(diff) < 0.1) {
          state.current = state.target;
        }
      }
      
      setDisplayProgress(Math.min(100, Math.round(state.current * 10) / 10));
      
      if (Math.abs(state.target - state.current) > 0.001 || state.target < 99.9) {
        state.rafId = requestAnimationFrame(animate);
      } else {
        state.rafId = null;
      }
    };

    if (exportProgress.status === 'processing') {
      state.target = exportProgress.progress;
      
      if (!state.rafId) {
        state.lastFrameTime = 0;
        state.rafId = requestAnimationFrame(animate);
      }
    } else if (exportProgress.status === 'completed') {
      state.target = 100;
      if (!state.rafId) {
        state.lastFrameTime = 0;
        state.rafId = requestAnimationFrame(animate);
      }
    } else if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.current = 0;
      state.target = 0;
      state.lastFrameTime = 0;
      state.frameCount = 0;
      state.avgFrameTime = 16;
      setDisplayProgress(0);
    }

    return () => {
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    };
  }, [exportProgress.status, exportProgress.progress]);

  const buttonText = exportProgress.status === 'processing'
    ? `导出中 ${displayProgress}%...`
    : exportProgress.status === 'completed'
    ? `导出完成 ${displayProgress}%`
    : '导出 WebM 视频';

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={exportVideo}
        disabled={isDisabled}
        style={{
          position: 'relative',
          overflow: 'hidden',
          minWidth: '160px',
        }}
      >
        {exportProgress.status === 'processing' || exportProgress.status === 'completed' ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${displayProgress}%`,
              backgroundColor: exportProgress.status === 'completed' 
                ? 'rgba(76, 175, 80, 0.4)' 
                : 'rgba(255,255,255,0.2)',
              transition: 'background-color 0.3s ease',
            }}
          />
        ) : null}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {buttonText}
        </span>
      </button>

      <canvas
        ref={canvasRef}
        style={{ display: 'none', position: 'fixed', left: '-9999px', top: '-9999px' }}
      />

      {exportProgress.status === 'processing' && (
        <div className="export-modal">
          <div className="export-content">
            <h3>🎬 正在导出视频</h3>
            <div className="export-progress">
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: 'var(--accent-color)',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                  textShadow: '0 0 20px var(--accent-glow)',
                }}
              >
                {displayProgress.toFixed(1)}%
              </div>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${displayProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-color), #ff6b8a, var(--accent-color))',
                    backgroundSize: '200% 100%',
                    animation: 'progressStripes 1s linear infinite',
                    transition: 'width 0.1s linear',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '30px',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                      animation: 'progressShine 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                }}
              >
                <span>{exportProgress.progress}% (实际)</span>
                <span>{displayProgress.toFixed(1)}% (显示)</span>
              </div>
            </div>
            <p
              className="export-message"
              style={{
                marginTop: '20px',
                fontSize: '14px',
                padding: '12px',
                backgroundColor: 'rgba(233,69,96,0.1)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--accent-color)',
              }}
            >
              {exportProgress.message || '正在处理...'}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color)',
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
              <span>请勿关闭页面，视频合成中...</span>
            </div>
          </div>
        </div>
      )}

      {exportProgress.status === 'completed' && (
        <div className="export-modal">
          <div className="export-content">
            <div
              style={{
                fontSize: '80px',
                marginBottom: '12px',
                animation: 'zoomIn 0.5s ease-out',
              }}
            >
              ✅
            </div>
            <h3 style={{ color: '#4ade80', marginBottom: '12px' }}>导出成功！</h3>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(74,222,128,0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#4ade80',
                  borderRadius: '4px',
                }}
              />
            </div>
            <p
              className="export-message"
              style={{
                fontSize: '14px',
                padding: '12px',
                backgroundColor: 'rgba(74,222,128,0.1)',
                borderRadius: '8px',
                borderLeft: '3px solid #4ade80',
              }}
            >
              {exportProgress.message}
            </p>
          </div>
        </div>
      )}

      {exportProgress.status === 'error' && (
        <div className="export-modal">
          <div className="export-content">
            <div
              style={{
                fontSize: '80px',
                marginBottom: '12px',
                animation: 'shake 0.5s ease-out',
              }}
            >
              ❌
            </div>
            <h3 style={{ color: '#f87171', marginBottom: '12px' }}>导出失败</h3>
            <p
              className="export-message"
              style={{
                fontSize: '14px',
                padding: '12px',
                backgroundColor: 'rgba(248,113,113,0.1)',
                borderRadius: '8px',
                borderLeft: '3px solid #f87171',
                marginBottom: '20px',
              }}
            >
              {exportProgress.message}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setExportProgress({ status: 'idle', progress: 0 })}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
};
