import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownProps {
  targetTime: number;
  serverTimeOffset?: number;
  onComplete?: () => void;
  syncServerTime?: () => Promise<number>;
  syncInterval?: number;
  className?: string;
}

interface TimeUnitProps {
  value: number;
  label: string;
}

const TimeUnit: React.FC<TimeUnitProps> = ({ value, label }) => {
  const display = value.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl shadow-lg border border-amber-300/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl sm:text-4xl font-bold text-amber-900 tabular-nums tracking-tight">
            {display}
          </span>
        </div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-400/30" />
        <div className="absolute left-2 top-1/2 w-1.5 h-1.5 rounded-full bg-amber-700/20" />
        <div className="absolute right-2 top-1/2 w-1.5 h-1.5 rounded-full bg-amber-700/20" />
      </div>
      <span className="mt-2 text-xs sm:text-sm font-medium text-amber-700/80 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

export const Countdown: React.FC<CountdownProps> = ({
  targetTime,
  serverTimeOffset = 0,
  onComplete,
  syncServerTime,
  syncInterval = 1000,
  className = '',
}) => {
  const { days, hours, minutes, seconds } = useCountdown({
    targetTime,
    onComplete,
    syncServerTime,
    syncInterval,
  });

  return (
    <div className={`flex items-center justify-center gap-2 sm:gap-4 ${className}`}>
      <TimeUnit value={days} label="天" />
      <span className="text-2xl sm:text-3xl font-bold text-amber-400 mb-6">:</span>
      <TimeUnit value={hours} label="时" />
      <span className="text-2xl sm:text-3xl font-bold text-amber-400 mb-6">:</span>
      <TimeUnit value={minutes} label="分" />
      <span className="text-2xl sm:text-3xl font-bold text-amber-400 mb-6">:</span>
      <TimeUnit value={seconds} label="秒" />
    </div>
  );
};
