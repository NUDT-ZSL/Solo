import { timeLabels } from '@/map/stationData';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface TimeSliderProps {
  currentTime: number;
  onTimeChange: (time: number) => void;
}

export default function TimeSlider({ currentTime, onTimeChange }: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        onTimeChange((currentTime + 1) % 24);
      }, 800);
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseInt(e.target.value, 10));
  };

  const handlePrev = () => {
    onTimeChange((currentTime - 1 + 24) % 24);
  };

  const handleNext = () => {
    onTimeChange((currentTime + 1) % 24);
  };

  return (
    <div className="p-4 bg-slate-800/50 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="text-white font-mono text-lg min-w-[60px] text-center">
          {timeLabels[currentTime]}
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

        <div className="flex-1 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={23}
            value={currentTime}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div className="hidden md:flex gap-1 text-xs text-slate-500">
          {timeLabels.filter((_, i) => i % 6 === 0).map((label) => (
            <span key={label} className="w-12 text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
