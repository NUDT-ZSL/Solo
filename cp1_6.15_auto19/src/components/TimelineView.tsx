import { useState, useMemo } from 'react';
import { useFocusStore } from '../store';
import { getDateKey, getRecordsForDate, ActivityRecord, ActivityLabel } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

const BASE_WIDTH = 720;
const DAY_MS = 86400000;
const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21];

function fmtDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

export default function TimelineView() {
  const [zoom, setZoom] = useState(1);
  const records = useFocusStore(s => s.records);
  const labels = useFocusStore(s => s.labels);
  const activeTimer = useFocusStore(s => s.activeTimer);

  const todayKey = getDateKey(Date.now());
  const todayRecords = useMemo(
    () => getRecordsForDate(records, todayKey),
    [records, todayKey]
  );

  const dayStartMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [todayKey]);

  const labelMap = useMemo(() => {
    const map = new Map<string, ActivityLabel>();
    labels.forEach(l => map.set(l.name, l));
    return map;
  }, [labels]);

  const bars = useMemo(() => {
    const items = todayRecords.map(r => ({
      id: r.id,
      label: r.label,
      startTime: r.startTime,
      endTime: r.endTime,
      durationMs: r.durationMs,
      row: 0,
      isActive: false,
    }));

    if (activeTimer) {
      const now = Date.now();
      items.push({
        id: '__active__',
        label: activeTimer.label,
        startTime: activeTimer.startTime,
        endTime: now,
        durationMs: now - activeTimer.startTime,
        row: 0,
        isActive: true,
      });
    }

    items.sort((a, b) => a.startTime - b.startTime);

    const rowEnds: number[] = [];
    for (const item of items) {
      let assigned = false;
      for (let i = 0; i < rowEnds.length; i++) {
        if (item.startTime >= rowEnds[i]) {
          item.row = i;
          rowEnds[i] = item.endTime;
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        item.row = rowEnds.length;
        rowEnds.push(item.endTime);
      }
    }

    return items;
  }, [todayRecords, activeTimer]);

  const timelineWidth = BASE_WIDTH * zoom;
  const maxRow = bars.reduce((max, b) => Math.max(max, b.row), -1);
  const contentHeight = bars.length > 0 ? (maxRow + 1) * 32 + 20 : 60;

  const handleZoomIn = () => {
    if (zoom === 1) setZoom(2);
    else if (zoom === 2) setZoom(4);
  };

  const handleZoomOut = () => {
    if (zoom === 4) setZoom(2);
    else if (zoom === 2) setZoom(1);
  };

  return (
    <div className="rounded-card border-2 border-border bg-surface transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold text-text">今日时间线</h2>
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4 text-textSub" />
          </button>
          {[1, 2, 4].map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                zoom === z
                  ? 'bg-teal text-teal'
                  : 'bg-surface text-textSub'
              }`}
            >
              {z}x
            </button>
          ))}
          <button onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4 text-textSub" />
          </button>
        </div>
      </div>

      {todayRecords.length === 0 && !activeTimer ? (
        <div className="p-8 text-center text-textSub">暂无今日记录</div>
      ) : (
        <div className="overflow-x-auto px-4 pb-4">
          <div
            className="relative transition-all duration-300"
            style={{ width: timelineWidth, height: contentHeight }}
          >
            {HOUR_MARKS.map(hour => {
              const left = (hour / 24) * timelineWidth;
              return (
                <div key={hour} className="absolute top-0 h-full" style={{ left }}>
                  <div className="h-full border-l border-dashed border-border" />
                  <span className="absolute -translate-x-1/2 text-[6px] text-textSub md:text-[10px]">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              );
            })}

            {bars.map(bar => {
              const label = labelMap.get(bar.label);
              const color = label?.color ?? '#888';
              const left = ((bar.startTime - dayStartMs) / DAY_MS) * timelineWidth;
              const width = Math.max(
                ((bar.endTime - bar.startTime) / DAY_MS) * timelineWidth,
                4
              );
              const top = bar.row * 32 + 16;

              return (
                <div
                  key={bar.id}
                  className={`absolute flex items-center rounded px-1 text-[10px] font-medium text-text transition-all duration-300${
                    bar.isActive ? ' animate-pulse' : ''
                  }`}
                  style={{
                    left,
                    width,
                    top,
                    height: 28,
                    backgroundColor: color + '99',
                  }}
                >
                  <span className="truncate">{bar.label}</span>
                  {!bar.isActive && (
                    <span className="ml-1 shrink-0 opacity-70">
                      {fmtDuration(bar.durationMs)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
