import { useRef, useEffect, useCallback } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export default function Waveform({ analyser, isPlaying, currentTime, duration }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const staticBarsRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  const generateStaticBars = useCallback((count: number) => {
    const bars: number[] = [];
    for (let i = 0; i < count; i++) {
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const normalized = seed - Math.floor(seed);
      bars.push(10 + normalized * 50);
    }
    staticBarsRef.current = bars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const barCount = 60;
    generateStaticBars(barCount);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const barWidth = (w - 4) / barCount - 2;
      const gap = 2;
      const progressRatio = duration > 0 ? currentTime / duration : 0;

      let barHeights: number[];

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        barHeights = [];
        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.6));
          const value = dataArray[dataIndex] || 0;
          const normalized = value / 255;
          const minHeight = 10;
          const maxHeight = h - 10;
          barHeights.push(minHeight + normalized * (maxHeight - minHeight));
        }
      } else {
        phaseRef.current += 0.02;
        barHeights = staticBarsRef.current.map((baseHeight, i) => {
          const wave = Math.sin(phaseRef.current + i * 0.3) * 3;
          return baseHeight + wave;
        });
      }

      for (let i = 0; i < barCount; i++) {
        const x = 2 + i * (barWidth + gap);
        const barHeight = barHeights[i];
        const y = (h - barHeight) / 2;

        const barProgress = (i + 0.5) / barCount;
        const isPlayed = barProgress <= progressRatio;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (isPlayed) {
          gradient.addColorStop(0, "#a78bfa");
          gradient.addColorStop(1, "#7c3aed");
        } else {
          gradient.addColorStop(0, "rgba(167, 139, 250, 0.25)");
          gradient.addColorStop(1, "rgba(124, 58, 237, 0.25)");
        }

        ctx.fillStyle = gradient;

        const radius = Math.min(barWidth / 2, barHeight / 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      if (analyser && isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      } else if (!isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, currentTime, duration, generateStaticBars]);

  return (
    <div className="h-[100px] w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
