import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Chapter {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  colorIndex: number;
}

interface WaveformPlayerProps {
  audioUrl: string;
  duration: number;
  chapters: Chapter[];
  onTimeUpdate: (time: number) => void;
  onSeek: (time: number) => void;
  onChapterClick: (chapter: Chapter) => void;
  onAddChapter: (startTime: number, endTime: number) => void;
  highlightedSegment: { start: number; end: number } | null;
}

const START_COLOR = { r: 0x42, g: 0xa5, b: 0xf5 };
const END_COLOR = { r: 0x7e, g: 0x57, b: 0xc2 };
const WAVEFORM_MIN = 0;
const WAVEFORM_MAX = 300;

function lerpColor(t: number): string {
  const r = Math.round(START_COLOR.r + (END_COLOR.r - START_COLOR.r) * t);
  const g = Math.round(START_COLOR.g + (END_COLOR.g - START_COLOR.g) * t);
  const b = Math.round(START_COLOR.b + (END_COLOR.b - START_COLOR.b) * t);
  return `rgb(${r},${g},${b})`;
}

function getChapterColor(index: number): string {
  const hue = (index * 47 + 200) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  duration,
  chapters,
  onTimeUpdate,
  onSeek,
  onChapterClick,
  onAddChapter,
  highlightedSegment,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      source.connect(analyser);
      analyser.connect(ctx.destination);

      fetch(audioUrl)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((buffer) => {
          const rawData = buffer.getChannelData(0);
          const samples = 500;
          const blockSize = Math.floor(rawData.length / samples);
          const filtered = new Float32Array(samples);
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[i * blockSize + j]);
            }
            filtered[i] = sum / blockSize;
          }
          setAudioData(filtered);
        })
        .catch(() => {
          const fake = new Float32Array(500);
          for (let i = 0; i < 500; i++) {
            fake[i] = Math.random() * 0.5 + 0.1;
          }
          setAudioData(fake);
        });
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    return () => audio.removeEventListener('loadedmetadata', handleLoaded);
  }, [audioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barWidth = w / audioData.length;
    const mid = h / 2;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < audioData.length; i++) {
      const t = i / audioData.length;
      const barH = ((audioData[i] - WAVEFORM_MIN) / (WAVEFORM_MAX - WAVEFORM_MIN)) * (h * 0.4);
      const clampedH = Math.max(2, barH);
      const x = i * barWidth;
      ctx.fillStyle = lerpColor(t);
      ctx.fillRect(x, mid - clampedH, barWidth - 1, clampedH * 2);
    }

    if (highlightedSegment) {
      const startPct = highlightedSegment.start / (duration || 1);
      const endPct = highlightedSegment.end / (duration || 1);
      ctx.strokeStyle = '#ff7043';
      ctx.lineWidth = 2;
      ctx.strokeRect(startPct * w, 0, (endPct - startPct) * w, h);
    }

    if (selection) {
      const startPct = selection.start / (duration || 1);
      const endPct = selection.end / (duration || 1);
      ctx.fillStyle = 'rgba(66,165,245,0.2)';
      ctx.fillRect(startPct * w, 0, (endPct - startPct) * w, h);
    }

    const pct = currentTime / (duration || 1);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pct * w, 0);
    ctx.lineTo(pct * w, h);
    ctx.stroke();
  }, [audioData, currentTime, duration, selection, highlightedSegment]);

  useEffect(() => {
    const animate = () => {
      drawWaveform();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate(audio.currentTime);
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;
    setIsDragging(true);
    dragStartRef.current = time;
    setSelection({ start: time, end: time });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = Math.max(0, Math.min(duration, pct * duration));
    setSelection((prev) => (prev ? { ...prev, end: time } : null));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selection && Math.abs(selection.end - selection.start) > 1) return;
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
    onSeek(time);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleGenerateChapter = () => {
    if (!selection) return;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    if (end - start < 0.5) return;
    onAddChapter(start, end);
    setSelection(null);
  };

  const formatTimeStr = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 8,
            minHeight: 36,
          }}
        >
          {chapters.map((ch) => (
            <div
              key={ch.id}
              onClick={() => onChapterClick(ch)}
              style={{
                maxWidth: 200,
                height: 36,
                background: '#e3f2fd',
                color: '#1565c0',
                borderRadius: 18,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  'translateY(0)';
              }}
            >
              {ch.title}
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: 120,
            borderRadius: 8,
            cursor: 'crosshair',
            background: '#1a1a2e',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={handleCanvasClick}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <button
          onClick={togglePlay}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: '#42a5f5',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 13, color: '#aaa' }}>
          {formatTimeStr(currentTime)} / {formatTimeStr(duration)}
        </span>
        {selection && Math.abs(selection.end - selection.start) > 0.5 && (
          <button
            onClick={handleGenerateChapter}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#7e57c2',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            生成章节
          </button>
        )}
      </div>
    </div>
  );
};

export default WaveformPlayer;
