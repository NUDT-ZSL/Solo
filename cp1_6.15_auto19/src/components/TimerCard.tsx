import { useState, useEffect, useRef } from 'react';
import { useFocusStore } from '../store';
import { formatDuration } from '../types';
import { Play, Square, ChevronDown } from 'lucide-react';

export default function TimerCard() {
  const labels = useFocusStore((s) => s.labels);
  const activeTimer = useFocusStore((s) => s.activeTimer);
  const startTimer = useFocusStore((s) => s.startTimer);
  const stopTimer = useFocusStore((s) => s.stopTimer);

  const [selectedLabel, setSelectedLabel] = useState(labels[0]?.name ?? '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }

    setElapsed(Date.now() - activeTimer.startTime);

    const id = setInterval(() => {
      setElapsed(Date.now() - activeTimer.startTime);
    }, 1000);

    return () => clearInterval(id);
  }, [activeTimer]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = labels.find((l) => l.name === (activeTimer ? activeTimer.label : selectedLabel));

  return (
    <div className="rounded-card border-2 border-border bg-surface p-5 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="relative mb-4" ref={dropdownRef}>
        <button
          type="button"
          disabled={!!activeTimer}
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg bg-surfaceHover px-3 py-2 text-sm text-text transition-colors disabled:opacity-50 md:w-auto"
        >
          <span className="flex items-center gap-2">
            {currentLabel && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentLabel.color }}
              />
            )}
            {currentLabel?.name ?? '选择活动'}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 text-textSub" />
        </button>

        {dropdownOpen && !activeTimer && (
          <ul className="absolute left-0 top-full z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg shadow-black/20 md:w-56">
            {labels.map((label) => (
              <li key={label.name}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLabel(label.name);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surfaceHover"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4 text-center">
        {activeTimer ? (
          <span className="font-mono text-4xl animate-pulse-glow text-teal md:text-5xl">
            {formatDuration(elapsed)}
          </span>
        ) : (
          <span className="font-mono text-4xl text-textSub md:text-5xl">
            00:00
          </span>
        )}
      </div>

      <div className="flex justify-center">
        {activeTimer ? (
          <button
            type="button"
            onClick={stopTimer}
            className="flex items-center gap-2 rounded-lg bg-red-500/15 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
          >
            <Square className="h-4 w-4" />
            停止计时
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTimer(selectedLabel)}
            className="flex items-center gap-2 rounded-lg bg-teal/15 px-5 py-2.5 text-sm font-medium text-teal transition-colors hover:bg-teal/25"
          >
            <Play className="h-4 w-4" />
            开始计时
          </button>
        )}
      </div>
    </div>
  );
}
