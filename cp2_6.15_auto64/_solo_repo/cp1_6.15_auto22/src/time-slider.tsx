import React, { useMemo, useEffect, useState } from 'react';
import { TravelRecord } from './data-store';

interface TimeSliderProps {
  records: TravelRecord[];
  cutoffDate: string;
  onCutoffChange: (date: string) => void;
}

export default function TimeSlider({
  records,
  cutoffDate,
  onCutoffChange,
}: TimeSliderProps) {
  const sorted = useMemo(
    () => [...records].sort((a, b) => a.arriveTime.localeCompare(b.arriveTime)),
    [records]
  );

  const dateSteps = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach((r) => {
      set.add(r.arriveTime.slice(0, 10));
      set.add(r.leaveTime.slice(0, 10));
    });
    const arr = Array.from(set).sort();
    if (arr.length === 0) arr.push(new Date().toISOString().slice(0, 10));
    return arr;
  }, [sorted]);

  const currentIndex = (() => {
    if (!cutoffDate) return dateSteps.length - 1;
    let idx = 0;
    for (let i = 0; i < dateSteps.length; i++) {
      if (dateSteps[i] <= cutoffDate) idx = i;
      else break;
    }
    return idx;
  })();

  const [localIndex, setLocalIndex] = useState(currentIndex);

  useEffect(() => {
    setLocalIndex(currentIndex);
  }, [currentIndex]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = parseInt(e.target.value, 10);
    setLocalIndex(idx);
    onCutoffChange(dateSteps[idx] || dateSteps[dateSteps.length - 1]);
  }

  function formatLabel(dateStr: string): string {
    if (!dateStr) return '--';
    return dateStr;
  }

  const displayDate = dateSteps[localIndex] || '';
  const activeCount = sorted.filter((r) => r.arriveTime.slice(0, 10) <= displayDate).length;

  const maxIdx = Math.max(0, dateSteps.length - 1);

  return (
    <div className="time-slider-container">
      <div className="time-slider-info">
        <span className="time-slider-label">
          时间线 · 已显现 {activeCount}/{sorted.length} 个足迹
        </span>
        <span className="time-slider-date">{formatLabel(displayDate)}</span>
      </div>
      <input
        type="range"
        className="time-slider-input"
        min={0}
        max={maxIdx}
        step={1}
        value={localIndex}
        onChange={handleChange}
        disabled={sorted.length === 0}
      />
      <div className="time-slider-ticks">
        {sorted.map((r, i) => (
          <span key={r.id} className="time-slider-tick">
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

