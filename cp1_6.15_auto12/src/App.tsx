import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AudioProcessor, type Segment } from './AudioProcessor';
import Timeline from './Timeline';

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

  const processorRef = useRef<AudioProcessor | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformAnimFrameRef = useRef<number | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const isDrawingRef = useRef(false);

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
    });

    return () => {
      processor.destroy();
      if (waveformAnimFrameRef.current !== null) {
        cancelAnimationFrame(waveformAnimFrameRef.current);
      }
    };
  }, []);

  const drawWaveform = useCallback(() => {
    if (!isRecording) return;

    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const data = timeDataRef.current;
    if (!data || data.length === 0) {
      waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, w, h);

    const sliceWidth = w / data.length;
    const centerY = h / 2;

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    const freqData = freqDataRef.current;
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

    for (let i = 0; i < data.length; i++) {
      const x = i * sliceWidth;
      const v = data[i];
      const y = centerY + v * (h * 0.4);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    const barCount = 32;
    if (freqData && freqData.length >= barCount) {
      const barWidth = w / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const freqIndex = Math.floor((i / barCount) * freqData.length);
        const value = freqData[freqIndex] / 255;
        const barHeight = value * h * 0.25;
        const x = i * (barWidth + 2) + 1;
        const y = h - barHeight - 2;

        ctx.fillStyle = `rgba(79, 195, 247, ${0.3 + value * 0.4})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    waveformAnimFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && !isDrawingRef.current) {
      isDrawingRef.current = true;
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

  const handleNotesChange = useCallback((id: string, notes: string) => {
    const processor = processorRef.current;
    if (!processor) return;

    processor.updateSegmentNotes(id, notes);
    setSegments((prev) =>
      prev.map((seg) => (seg.id === id ? { ...seg, notes } : seg)),
    );
  }, []);

  const markdownContent = useMemo((): string => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    let md = '# 会议纪要\n\n';
    for (const seg of sorted) {
      md += `${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}\n\n`;
      md += seg.notes ? `${seg.notes}\n\n` : '（未填写纪要）\n\n';
    }
    return md;
  }, [segments]);

  const handleCopyToClipboard = useCallback(async () => {
    const md = markdownContent;
    try {
      await navigator.clipboard.writeText(md);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = md;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [markdownContent]);

  const handleDownload = useCallback(() => {
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
  }, [markdownContent]);

  const showExportButtons = segments.length > 0 && !isRecording;

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
            {errorMessage}
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
                <span className="recording-indicator">
                  <span className="recording-dot" />
                  录音中...
                </span>
              </div>
              <canvas ref={waveformCanvasRef} className="waveform-canvas" />
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
              <button
                className="btn-export btn-primary"
                onClick={handleCopyToClipboard}
              >
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
        <p>使用 Web Audio API 实现 · 自动按静音分段</p>
      </footer>
    </div>
  );
};

export default App;
