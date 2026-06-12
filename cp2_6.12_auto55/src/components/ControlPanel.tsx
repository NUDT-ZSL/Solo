import { useRef, useState, useCallback, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const PLAY_SPEEDS = [1, 2, 4, 8];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function ControlPanel() {
  const {
    cities,
    currentCity,
    currentTime,
    startTime,
    endTime,
    isPlaying,
    playSpeed,
    setCurrentCity,
    setCurrentTime,
    setIsPlaying,
    setPlaySpeed,
  } = useAppStore();

  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalDuration = endTime.getTime() - startTime.getTime();
  const progress = ((currentTime.getTime() - startTime.getTime()) / totalDuration) * 100;

  const months = useRef<string[]>([]);
  if (months.current.length === 0) {
    const startYear = startTime.getFullYear();
    for (let i = 0; i < 12; i++) {
      months.current.push(`${startYear}-${String(i + 1).padStart(2, '0')}`);
    }
  }

  const getMonthPosition = (monthStr: string): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return ((date.getTime() - startTime.getTime()) / totalDuration) * 100;
  };

  const snapToNearestMonth = (time: Date): Date => {
    const timeMs = time.getTime();
    let nearestMonth = startTime;
    let minDiff = Math.abs(timeMs - nearestMonth.getTime());

    for (let i = 0; i <= 12; i++) {
      const monthDate = new Date(startTime);
      monthDate.setMonth(monthDate.getMonth() + i);
      const diff = Math.abs(timeMs - monthDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestMonth = monthDate;
      }
    }

    const snapThreshold = totalDuration * 0.02;
    if (minDiff < snapThreshold) {
      return nearestMonth;
    }
    return time;
  };

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = new Date(startTime.getTime() + percentage * totalDuration);
    setCurrentTime(newTime);
  }, [startTime, totalDuration, setCurrentTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSliderClick(e);
  }, [handleSliderClick]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = new Date(startTime.getTime() + percentage * totalDuration);
      setCurrentTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startTime, totalDuration, setCurrentTime]);

  const speedIndex = PLAY_SPEEDS.indexOf(playSpeed);
  const nextSpeed = () => {
    const nextIdx = (speedIndex + 1) % PLAY_SPEEDS.length;
    setPlaySpeed(PLAY_SPEEDS[nextIdx]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2">
      <div
        className="mx-auto max-w-6xl rounded-xl bg-white/10 backdrop-blur-md p-4
                    border border-white/20 shadow-xl"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-white/70 text-sm">城市:</label>
            <select
              value={currentCity?.id || ''}
              onChange={(e) => {
                const city = cities.find(c => c.id === e.target.value);
                if (city) setCurrentCity(city);
              }}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5
                         text-sm focus:outline-none focus:border-white/40 transition-colors
                         hover:bg-white/15 cursor-pointer"
            >
              {cities.map(city => (
                <option key={city.id} value={city.id} className="bg-gray-800 text-white">
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={nextSpeed}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5
                         text-sm hover:bg-white/20 transition-all hover:brightness-110
                         active:scale-95 hover:-translate-y-px"
            >
              {playSpeed}x
            </button>
          </div>

          <div className="flex-1" />

          <div className="text-white/80 text-sm font-mono min-w-[160px] text-right">
            {formatDateTime(currentTime)}
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white/15 border border-white/25
                       flex items-center justify-center text-white
                       hover:bg-white/25 transition-all hover:brightness-110
                       active:scale-95 hover:-translate-y-px"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
        </div>

        <div
          ref={sliderRef}
          className="relative h-8 cursor-pointer group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {months.current.map((month, index) => {
            const pos = getMonthPosition(month);
            return (
              <div
                key={month}
                className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/30"
                style={{ left: `${pos}%` }}
              >
                <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-white/50 whitespace-nowrap">
                  {month.split('-')[1]}月
                </span>
              </div>
            );
          })}

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10
                       w-5 h-5 rounded-full bg-white shadow-lg shadow-cyan-400/50
                       transition-transform group-hover:scale-125"
            style={{
              left: `${progress}%`,
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.3)',
            }}
          >
            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-30" />
          </div>

          <div className="absolute -bottom-1 left-0 text-[10px] text-white/40">
            {formatDate(startTime)}
          </div>
          <div className="absolute -bottom-1 right-0 text-[10px] text-white/40">
            {formatDate(endTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
