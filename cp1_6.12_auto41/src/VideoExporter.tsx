import React, { useCallback, useRef } from 'react';
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

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={exportVideo}
        disabled={isDisabled}
      >
        {exportProgress.status === 'processing' ? '导出中...' : '导出 WebM 视频'}
      </button>

      <canvas
        ref={canvasRef}
        style={{ display: 'none', position: 'fixed', left: '-9999px', top: '-9999px' }}
      />

      {exportProgress.status === 'processing' && (
        <div className="export-modal">
          <div className="export-content">
            <h3>正在导出视频</h3>
            <div className="export-progress">
              <div className="export-percent">{exportProgress.progress}%</div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${exportProgress.progress}%` }}
                />
              </div>
            </div>
            <p className="export-message">{exportProgress.message}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              请勿关闭页面，视频合成中...
            </p>
          </div>
        </div>
      )}

      {exportProgress.status === 'completed' && (
        <div className="export-modal">
          <div className="export-content">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h3>导出成功！</h3>
            <p className="export-message">{exportProgress.message}</p>
          </div>
        </div>
      )}

      {exportProgress.status === 'error' && (
        <div className="export-modal">
          <div className="export-content">
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
            <h3>导出失败</h3>
            <p className="export-message">{exportProgress.message}</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
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
