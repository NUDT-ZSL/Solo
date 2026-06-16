import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TimeSliderProps {
  currentTime: number;
  onTimeChange: (time: number) => void;
  historyData: number[];
  predictionData: number[];
}

export default function TimeSlider({
  currentTime,
  onTimeChange,
  historyData,
  predictionData,
}: TimeSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const throttledTimeChange = useCallback(
    (time: number) => {
      pendingTimeRef.current = time;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (pendingTimeRef.current !== null) {
            onTimeChange(pendingTimeRef.current);
          }
          rafIdRef.current = null;
        });
      }
    },
    [onTimeChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const chartHeight = height - 20;
    const chartTop = 10;

    const allData = [...historyData, ...predictionData];
    const maxVal = Math.max(...allData) * 1.1;
    const minVal = Math.min(...allData) * 0.9;
    const range = maxVal - minVal || 1;

    const historyCount = historyData.length;
    const totalCount = allData.length;
    const stepX = width / (totalCount - 1);

    const getY = (val: number) => {
      return chartTop + chartHeight - ((val - minVal) / range) * chartHeight;
    };

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < historyCount; i++) {
      const x = i * stepX;
      const y = getY(historyData[i]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    for (let i = 0; i <= predictionData.length; i++) {
      const idx = historyCount - 1 + i;
      const x = idx * stepX;
      const val = i === 0 ? historyData[historyCount - 1] : predictionData[i - 1];
      const y = getY(val);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    for (let i = 0; i < historyCount; i += 4) {
      const x = i * stepX;
      const y = getY(historyData[i]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < predictionData.length; i += 15) {
      const idx = historyCount - 1 + i;
      const x = idx * stepX;
      const y = getY(predictionData[i]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = 'transparent';
  }, [historyData, predictionData]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        onTimeChange((currentTime + 1) % 24);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentTime, onTimeChange]);

  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledTimeChange(parseFloat(e.target.value));
  };

  const handlePrev = () => {
    onTimeChange(Math.max(0, currentTime - 1));
  };

  const handleNext = () => {
    onTimeChange(Math.min(23, currentTime + 1));
  };

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-6">
      <div className="w-[640px] h-[80px] relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '640px', height: '80px' }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-500/50 pointer-events-none"
          style={{ left: `${(currentTime / 23) * 100}%` }}
        />
      </div>

      <div className="w-[640px] flex items-center gap-4">
        <div className="text-white font-mono text-sm min-w-[50px] text-center bg-slate-700/80 px-2 py-1 rounded">
          {formatTime(currentTime)}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex-1 h-[40px] flex items-center relative">
          <div className="absolute left-0 right-0 h-[6px] bg-[#e2e8f0] rounded-full top-1/2 -translate-y-1/2" />
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={23}
            step={0.1}
            value={currentTime}
            onChange={handleSliderInput}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#3b82f6] shadow-[0_2px_6px_rgba(59,130,246,0.4)] pointer-events-none transition-[left] duration-75"
            style={{ left: `calc(${(currentTime / 23) * 100}% - 10px)` }}
          />
        </div>
      </div>

      <div className="w-[640px] flex justify-between text-xs text-slate-500 px-12">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
