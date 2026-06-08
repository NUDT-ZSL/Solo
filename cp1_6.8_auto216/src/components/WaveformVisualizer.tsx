import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";

interface WaveformVisualizerProps {
  audioUrl: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  width?: number;
  height?: number;
}

export default function WaveformVisualizer({
  audioUrl,
  isPlaying,
  onPlayPause,
  width = 600,
  height = 80,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [progress, setProgress] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(width);

  const makeGradient = useCallback((ctx: CanvasRenderingContext2D, h: number) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "#b87333");
    g.addColorStop(1, "#d4a843");
    return g;
  }, []);

  const drawEmpty = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#b87333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.fillStyle = "#999";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("暂无音频", w / 2, h / 2 - 8);
  }, []);

  const drawStaticWaveform = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const buffer = audioBufferRef.current;
    if (!buffer) { drawEmpty(ctx, w, h); return; }
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);
    ctx.fillStyle = makeGradient(ctx, h);
    for (let i = 0; i < w; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) {
          if (data[idx] < min) min = data[idx];
          if (data[idx] > max) max = data[idx];
        }
      }
      const barH = Math.max((max - min) * h * 0.8, 1);
      const y = ((1 + min) / 2) * h - barH / 2 + (h * 0.1) / 2;
      ctx.fillRect(i, y, 1, barH);
    }
  }, [drawEmpty, makeGradient]);

  const drawFrequencyBars = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = makeGradient(ctx, h);
    const barCount = Math.min(bufLen, Math.floor(w / 3));
    const barW = Math.max(w / barCount - 1, 1);
    for (let i = 0; i < barCount; i++) {
      const val = data[Math.floor((i / barCount) * bufLen)] / 255;
      const barH = Math.max(val * h * 0.9, 1);
      ctx.fillRect(i * (barW + 1), h - barH, barW, barH);
    }
  }, [makeGradient]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && isPlaying) drawFrequencyBars(ctx, canvasWidth, height);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, canvasWidth, height, drawFrequencyBars]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setCanvasWidth(Math.floor(e[0].contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => { if (audio.duration) setProgress(audio.currentTime / audio.duration); });
    audio.addEventListener("ended", () => { if (isPlaying) onPlayPause(); });
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    try {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
    } catch {}
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      ctx.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl) return;
    fetch(audioUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => audioContextRef.current?.decodeAudioData(buf))
      .then((d) => { if (d) audioBufferRef.current = d; })
      .catch(() => {});
  }, [audioUrl]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play();
      if (audioContextRef.current?.state === "suspended") audioContextRef.current.resume();
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!audioUrl) drawEmpty(ctx, canvasWidth, height);
    else if (!isPlaying) drawStaticWaveform(ctx, canvasWidth, height);
  }, [audioUrl, isPlaying, canvasWidth, height, drawEmpty, drawStaticWaveform]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: canvasWidth, userSelect: "none" }}>
      <canvas ref={canvasRef} width={canvasWidth} height={height} style={{ display: "block", borderRadius: 6, background: "#1a1a2e" }} />
      <button
        onClick={onPlayPause}
        disabled={!audioUrl}
        style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)",
          color: "#d4a843", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: audioUrl ? "pointer" : "default", opacity: audioUrl ? 0.9 : 0.3, transition: "opacity 0.2s",
        }}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div style={{ width: "100%", height: 3, background: "#2a2a4a", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: "linear-gradient(90deg, #b87333, #d4a843)", borderRadius: 2, transition: "width 0.1s linear" }} />
      </div>
    </div>
  );
}
