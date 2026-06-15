import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AudioProcessor, type Segment } from './AudioProcessor';
import Timeline from './Timeline';

const TARGET_MIN_FPS = 30;
const FPS_SAMPLE_WINDOW = 500;
const WAVEFORM_DEGRADE_BARS = 16;
const WAVEFORM_FULL_BARS = 32;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [isDegraded, setIsDegraded] = useState(false);

  const processorRef = useRef<AudioProcessor | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformAnimFrameRef = useRef<number | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const isDrawingRef = useRef(false);
  const fpsLastFrameTimeRef = useRef<number>(0);
  const fpsFrameCountRef = useRef<number>(0);
  const fpsSampleStartRef = useRef<number>(0);
  const degradedRef = useRef(false);

  useEffect(() => {
    const processor = new AudioProcessor();
    processorRef.current = processor;

    processor.onWaveformUpdate((timeData, freqData) => {
      timeDataRef.current = timeData;
      freqDataRef.current = freqData;
    });

    processor.onSegmentsUpdate((segs) => {
      setSegments([...segs]);
    });

    processor.onPlaybackProgress((time) => {
      setCurrentPlaybackTime(time);
      const activeSeg = processor.findSegmentAtTime(time);
      if (activeSeg) {
        setActiveSegmentId((prev) => (prev === activeSeg.id ? prev : activeSeg.id));
      }
    });

    processor.onPlaybackEnd(() => {
      setActiveSegmentId(null);
    });

    return () => {
      processor.destroy();
      if (waveformAnimFrameRef.current !== null) {
        cancelAnimationFrame(waveformAnimFrameRef.current);
      }
    };
  }, []);

  const measureFps = useCallback((now: number) => {
    fpsFrameCountRef.current++;
    if (fpsSampleStartRef.current === 0) {
      fpsSampleStartRef.current = now;
    }
    const elapsed = now - fpsSampleStartRef.current;
    if (elapsed >= FPS_SAMPLE_WINDOW) {
      const currentFps = (fpsFrameCountRef.current * 1000) / elapsed;
      setFps(Math.round(currentFps));

      if (currentFps < TARGET_MIN_FPS && !degradedRef.current) {
        degradedRef.current = true;
        setIsDegraded(true);
      } else if (currentFps >= TARGET_MIN_FPS + 5 && degradedRef.current) {
        degradedRef.current = false;
        setIsDegraded(false);
      }

      fpsFrameCountRef.current = 0;
      fpsSampleStartRef.current = now;
    }
  }, []);

  const drawWaveform = useCallback(() => {
    if (!isRecording) return;

    const now = performance.now();
    measureFps(now);

    const canvas = waveformCanvasRef.current;
    if (!canvas) {
      waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const degraded = degradedRef.current;
    const dpr = degraded ? Math.min(window.devicePixelRatio || 1, 1) : window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, w, h);

    const data = timeDataRef.current;
    const freqData = freqDataRef.current;
    const centerY = h / 2;

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    if (!data || data.length === 0) {
      waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    if (degraded) {
      const samplesPerBar = 4;
      const skip = Math.max(1, Math.floor(data.length / (samplesPerBar * 60)));
      ctx.strokeStyle = '#4FC3F7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sliceWidth = w / (data.length / skip);
      for (let i = 0, drawn = 0; i < data.length; i += skip, drawn++) {
        const x = drawn * sliceWidth;
        const v = data[i];
        const y = centerY + v * (h * 0.38);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (freqData && freqData.length >= WAVEFORM_DEGRADE_BARS) {
        const barWidth = w / WAVEFORM_DEGRADE_BARS - 2;
        for (let i = 0; i < WAVEFORM_DEGRADE_BARS; i++) {
          const freqIndex = Math.floor((i / WAVEFORM_DEGRADE_BARS) * freqData.length);
          const value = freqData[freqIndex] / 255;
          const barHeight = value * h * 0.18;
          const x = i * (barWidth + 2) + 1;
          const y = h - barHeight - 2;
          ctx.fillStyle = `rgba(79, 195, 247, ${0.3 + value * 0.3})`;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    } else {
      if (freqData && freqData.length > 0) {
        const avgFreq = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        const intensity = Math.min(1, avgFreq / 128);
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `rgba(79, 195, 247, ${0.3 + intensity * 0.5})`);
        gradient.addColorStop(0.5, `rgba(100, 210, 255, ${0.5 + intensity * 0.3})`);
        gradient.addColorStop(1, `rgba(79, 195, 247, ${0.3 + intensity * 0.5})`);
        ctx.strokeStyle = gradient;
      } else {
        ctx.strokeStyle = '#4FC3F7';
      }

      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceWidth = w / data.length;
      for (let i = 0; i < data.length; i++) {
        const x = i * sliceWidth;
        const v = data[i];
        const y = centerY + v * (h * 0.4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (freqData && freqData.length >= WAVEFORM_FULL_BARS) {
        const barWidth = w / WAVEFORM_FULL_BARS - 2;
        for (let i = 0; i < WAVEFORM_FULL_BARS; i++) {
          const freqIndex = Math.floor((i / WAVEFORM_FULL_BARS) * freqData.length);
          const value = freqData[freqIndex] / 255;
          const barHeight = value * h * 0.25;
          const x = i * (barWidth + 2) + 1;
          const y = h - barHeight - 2;
          ctx.fillStyle = `rgba(79, 195, 247, ${0.3 + value * 0.4})`;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    }

    waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [isRecording, measureFps]);

  useEffect(() => {
    if (isRecording && !isDrawingRef.current) {
      isDrawingRef.current = true;
      fpsFrameCountRef.current = 0;
      fpsSampleStartRef.current = 0;
      fpsLastFrameTimeRef.current = 0;
      degradedRef.current = false;
      setIsDegraded(false);
      setFps(60);
      waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
    } else if (!isRecording && isDrawingRef.current) {
      isDrawingRef.current = false;
      if (waveformAnimFrameRef.current !== null) {
        cancelAnimationFrame(waveformAnimFrameRef.current);
        waveformAnimFrameRef.current = null;
      }
    }
  }, [isRecording, drawWaveform]);

  const handleStartRecording = useCallback(async () => {
    const processor = processorRef.current;
    if (!processor) return;

    setErrorMessage(null);
    try {
      await processor.startRecording();
      setIsRecording(true);
      setActiveSegmentId(null);
      setCurrentPlaybackTime(0);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    const processor = processorRef.current;
    if (!processor) return;

    processor.stopRecording();
    setIsRecording(false);
  }, []);

  const handleSegmentClick = useCallback((id: string) => {
    const processor = processorRef.current;
    if (!processor) return;

    setActiveSegmentId(id);
    processor.playSegment(id);
  }, []);

  const handleSeekToPosition = useCallback((seconds: number) => {
    const processor = processorRef.current;
    if (!processor) return;
    processor.seekToPosition(seconds);
  }, []);

  const handleNotesChange = useCallback((id: string, notes: string) => {
    const processor = processorRef.current;
    if (!processor) return;

    processor.updateSegmentNotes(id, notes);
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, notes } : seg)),
    );
  }, []);

  const markdownContent = useMemo((): string => {
    const processor = processorRef.current;
    if (processor) return processor.generateMarkdown();

    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    let md = '# 会议纪要\n\n';
    md += `> 自动生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    md += `> 总分段数：${sorted.length}\n\n`;
    md += '---\n\n';
    for (const seg of sorted) {
      const timeStr = `${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`;
      const duration = (seg.endTime - seg.startTime).toFixed(1);
      md += `## ${timeStr}（时长：${duration}秒）\n\n`;
      if (seg.notes && seg.notes.trim().length > 0) {
        md += `${seg.notes.trim()}\n\n`;
      } else {
        md += `_（该分段未填写纪要）_\n\n`;
      }
    }
    return md;
  }, [segments]);

  const handleCopyToClipboard = useCallback(async () => {
    const start = performance.now();
    const md = markdownContent;
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = md;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    const elapsed = performance.now() - start;
    console.log(`[Export] 复制完成，耗时 ${elapsed.toFixed(1)}ms (要求≤500ms)`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [markdownContent]);

  const handleDownload = useCallback(() => {
    const start = performance.now();
    const md = markdownContent;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `会议纪要_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const elapsed = performance.now() - start;
    console.log(`[Export] 下载完成，耗时 ${elapsed.toFixed(1)}ms (要求≤500ms)`);
  }, [markdownContent]);

  const showExportButtons = segments.length > 0 && !isRecording;
  const totalDuration = processorRef.current?.totalDuration || 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1>会议录音纪要生成系统</h1>
          <p className="app-subtitle">录音 · 自动分段 · 纪要整理</p>
        </div>
      </header>

      <main className="app-main">
        {errorMessage && (
          <div className="error-banner" onClick={() => setErrorMessage(null)}>
            ⚠ {errorMessage} <span style={{ marginLeft: 8, fontSize: '0.8em', opacity: 0.7 }}>（点击关闭）</span>
          </div>
        )}

        <section className="control-section">
          <div className="recording-control">
            {!isRecording ? (
              <button
                className="btn-record start"
                onClick={handleStartRecording}
                aria-label="开始录音"
              >
                <span className="pulse-ring pulse-ring-1" />
                <span className="pulse-ring pulse-ring-2" />
                <span className="pulse-ring pulse-ring-3" />
                <span className="btn-record-inner">
                  <span className="record-icon">●</span>
                  开始录音
                </span>
              </button>
            ) : (
              <button
                className="btn-record stop"
                onClick={handleStopRecording}
                aria-label="停止录音"
              >
                <span className="btn-record-inner">
                  <span className="record-icon stop-icon">■</span>
                  停止录音
                </span>
              </button>
            )}
          </div>

          {isRecording && (
            <div className="live-waveform">
              <div className="waveform-header">
                <span className="waveform-label">实时波形</span>
                <span className="waveform-status">
                  <span className="recording-indicator">
                    <span className="recording-dot" />
                    录音中
                  </span>
                  <span className={`fps-indicator ${isDegraded ? 'degraded' : ''}`} title="帧率监控">
                    {isDegraded ? '⚡' : '●'} {fps} FPS
                  </span>
                </span>
              </div>
              <canvas ref={waveformCanvasRef} className="waveform-canvas" />
            </div>
          )}

          {!isRecording && segments.length > 0 && (
            <div className="seek-control">
              <span className="seek-label">快捷跳转：</span>
              <button className="btn-seek" onClick={() => handleSeekToPosition(0)} disabled={totalDuration === 0}>
                从头播放
              </button>
              {totalDuration >= 30 && (
                <button className="btn-seek" onClick={() => handleSeekToPosition(30)}>
                  30秒处
                </button>
              )}
              {totalDuration >= 60 && (
                <button className="btn-seek" onClick={() => handleSeekToPosition(60)}>
                  1分钟处
                </button>
              )}
              {totalDuration > 0 && (
                <span className="seek-total">总时长 {formatTime(totalDuration)}</span>
              )}
            </div>
          )}
        </section>

        <Timeline
          segments={segments}
          activeSegmentId={activeSegmentId}
          currentPlaybackTime={currentPlaybackTime}
          onSegmentClick={handleSegmentClick}
          onNotesChange={handleNotesChange}
        />

        {showExportButtons && (
          <section className="export-section">
            <div className="export-header">
              <h2>纪要导出</h2>
              <span className="export-hint">
                共 {segments.length} 个分段，
                {segments.filter((s) => s.notes.trim().length > 0).length} 个已编辑
              </span>
            </div>
            <div className="export-buttons">
              <button className="btn-export btn-primary" onClick={handleCopyToClipboard}>
                {copySuccess ? '✓ 已复制到剪贴板' : '📋 复制到剪贴板'}
              </button>
              <button className="btn-export btn-secondary" onClick={handleDownload}>
                ⬇ 下载 .md 文件
              </button>
            </div>
            <div className="export-preview">
              <details>
                <summary>预览 Markdown 格式</summary>
                <pre className="markdown-preview">{markdownContent}</pre>
              </details>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>使用 AudioWorklet + Web Audio API 实现 · 自动按 1 秒静音分段</p>
      </footer>
    </div>
  );
};

export default App;
