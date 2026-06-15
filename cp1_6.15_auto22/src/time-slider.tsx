import React, { useMemo } from 'react';
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

  const minDate = sorted.length > 0 ? sorted[0].arriveTime.slice(0, 10) : '';
  const maxDate =
    sorted.length > 0 ? sorted[sorted.length - 1].leaveTime.slice(0, 10) : '';

  function formatLabel(dateStr: string): string {
    if (!dateStr) return '--';
    return dateStr;
  }

  const activeCount = sorted.filter((r) => r.arriveTime <= cutoffDate).length;

  return (
    <div className="time-slider-container">
      <div className="time-slider-info">
        <span className="time-slider-label">
          时间线 · 已显现 {activeCount}/{sorted.length} 个足迹
        </span>
        <span className="time-slider-date">{formatLabel(cutoffDate)}</span>
      </div>
      <input
        type="range"
        className="time-slider-input"
        min={minDate}
        max={maxDate || '2025-12-31'}
        value={cutoffDate || maxDate || '2025-12-31'}
        onChange={(e) => onCutoffChange(e.target.value)}
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
