import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TimerProps {
  hours: number;
  minutes: number;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
}

const Timer: React.FC<TimerProps> = ({ hours, minutes, onHoursChange, onMinutesChange }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isAlerting, setIsAlerting] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const totalSeconds = hours * 3600 + minutes * 60;

  const startTimer = useCallback(() => {
    if (totalSeconds <= 0) return;
    setRemainingSeconds(totalSeconds);
    setIsRunning(true);
    setIsAlerting(false);
  }, [totalSeconds]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setIsAlerting(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setRemainingSeconds(0);
  }, [stopTimer]);

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsAlerting(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (isAlerting) {
      const timeout = setTimeout(() => {
        setIsAlerting(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isAlerting]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const displayTime = isRunning || remainingSeconds > 0 
    ? formatTime(remainingSeconds) 
    : formatTime(totalSeconds);

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isAlerting ? 'timer-alert bg-orange-100' : 'bg-amber-50'}`} style={{ border: isAlerting ? '2px solid #FF4500' : '1px solid #F5DEB3' }}>
      <span className="text-sm font-medium text-amber-800">⏱️</span>
      
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={(e) => onHoursChange(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
          className="w-12 text-center"
          disabled={isRunning}
        />
        <span className="text-amber-700">时</span>
        <input
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={(e) => onMinutesChange(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
          className="w-12 text-center"
          disabled={isRunning}
        />
        <span className="text-amber-700">分</span>
      </div>

      <div className={`font-mono text-lg font-bold px-3 py-1 rounded ${isAlerting ? 'text-orange-600 bg-orange-100' : 'text-amber-800 bg-amber-100'}`}>
        {displayTime}
      </div>

      <div className="flex gap-1">
        {!isRunning ? (
          <button
            onClick={startTimer}
            disabled={totalSeconds <= 0}
            className="btn-icon text-green-600"
            title="开始计时"
          >
            ▶️
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="btn-icon text-red-600"
            title="停止计时"
          >
            ⏸️
          </button>
        )}
        <button
          onClick={resetTimer}
          className="btn-icon text-gray-600"
          title="重置"
        >
          🔄
        </button>
      </div>
    </div>
  );
};

export default Timer;
