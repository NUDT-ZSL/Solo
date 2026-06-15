import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import MapView, { computeStats } from './map-view';
import TravelForm from './travel-form';
import TimeSlider from './time-slider';
import {
  TravelRecord,
  loadRecords,
  addRecord,
  deleteRecord,
  exportToJson,
  saveRecords,
  seedTestDataIfEmpty,
} from './data-store';
import './main.css';

function AnimatedNumber({ value }: { value: string | number }) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevDisplayRef = useRef<string | number>(value);
  const startTimeRef = useRef<number>(0);

  const isNumeric = (v: string | number): v is number => typeof v === 'number';

  useEffect(() => {
    const from = prevDisplayRef.current;
    const to = value;
    if (from === to) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const fromNum = isNumeric(from);
    const toNum = isNumeric(to);
    const bothNumeric = fromNum && toNum;

    const el = valueRef.current;
    if (el) {
      el.classList.remove('stat-animating');
      void el.offsetWidth;
      el.classList.add('stat-animating');
    }

    startTimeRef.current = performance.now();
    const duration = 300;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTimeRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (el) {
        el.style.transform = `translateY(${(1 - eased) * -10}px) rotateX(${(1 - eased) * 90}deg)`;
        el.style.opacity = String(0.3 + eased * 0.7);
      }
      if (bothNumeric) {
        const fromN = from as number;
        const toN = to as number;
        const cur = fromN + (toN - fromN) * eased;
        const display = Number.isInteger(toN)
          ? Math.round(cur)
          : Math.round(cur * 10) / 10;
        if (el) el.textContent = String(display);
      } else {
        if (el) {
          el.textContent = t < 0.5 ? String(from) : String(to);
        }
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (el) {
          el.style.transform = '';
          el.style.opacity = '';
          el.textContent = String(to);
          el.classList.remove('stat-animating');
        }
        prevDisplayRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span ref={valueRef} className="stat-value">
      {value}
    </span>
  );
}

function App() {
  const [records, setRecords] = useState<TravelRecord[]>(() => seedTestDataIfEmpty());
  const [cutoffDate, setCutoffDate] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...records].sort((a, b) => a.arriveTime.localeCompare(b.arriveTime)),
    [records]
  );

  useEffect(() => {
    if (sorted.length > 0 && !cutoffDate) {
      setCutoffDate(sorted[sorted.length - 1].leaveTime.slice(0, 10));
    }
  }, [sorted, cutoffDate]);

  const visibleIds = useMemo(() => {
    if (!cutoffDate) return new Set(sorted.map((r) => r.id));
    return new Set(
      sorted.filter((r) => r.arriveTime.slice(0, 10) <= cutoffDate).map((r) => r.id)
    );
  }, [sorted, cutoffDate]);

  const handleAdd = useCallback(
    (record: TravelRecord) => {
      const updated = addRecord(record);
      setRecords(updated);
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    const updated = deleteRecord(id);
    setRecords(updated);
  }, []);

  const handleExport = useCallback(() => {
    exportToJson();
  }, []);

  const stats = useMemo(() => computeStats(records), [records]);

  const visibleRecords = useMemo(
    () => records.filter((r) => visibleIds.has(r.id)),
    [records, visibleIds]
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">🌍 旅行足迹可视化</h1>
        <div className="header-actions">
          <TravelForm onSubmit={handleAdd} />
          <button className="export-btn" onClick={handleExport}>
            📤 导出JSON
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className="map-area">
          <MapView
            records={records}
            visibleIds={visibleIds}
            activeId={activeId}
            onActiveChange={setActiveId}
          />
          <TimeSlider
            records={records}
            cutoffDate={cutoffDate}
            onCutoffChange={setCutoffDate}
          />
        </div>

        <aside className="sidebar">
          <div className="stats-panel">
            <h3 className="sidebar-title">📊 旅行统计</h3>
            <div className="stat-item">
              <span className="stat-label">总旅行天数</span>
              <AnimatedNumber value={stats.totalDays} />
              <span className="stat-unit">天</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">到访城市数</span>
              <AnimatedNumber value={stats.cityCount} />
              <span className="stat-unit">个</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最长停留</span>
              <AnimatedNumber value={stats.longestStay} />
            </div>
            <div className="stat-item">
              <span className="stat-label">日均移动距离</span>
              <AnimatedNumber value={stats.avgDailyDist} />
              <span className="stat-unit">km</span>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className="export-btn"
                style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
                onClick={() => {
                  if (sorted.length === 0) return;
                  setCutoffDate(sorted[0].arriveTime.slice(0, 10));
                }}
              >
                ⏮ 起点
              </button>
              <button
                className="export-btn"
                style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
                onClick={() => {
                  if (sorted.length === 0) return;
                  setCutoffDate(sorted[sorted.length - 1].leaveTime.slice(0, 10));
                }}
              >
                ▶ 播放
              </button>
            </div>
          </div>

          <div className="record-list">
            <h3 className="sidebar-title">📝 足迹列表</h3>
            {visibleRecords.length === 0 && (
              <p className="empty-hint">暂无旅行记录，点击上方按钮添加</p>
            )}
            {visibleRecords.map((r) => {
              const idx =
                sorted.findIndex((s) => s.id === r.id) + 1;
              return (
                <div
                  key={r.id}
                  className={`record-card ${activeId === r.id ? 'record-card--active' : ''}`}
                  onClick={() => setActiveId(r.id)}
                >
                  <div className="record-card-header">
                    <span className="record-index">{idx}</span>
                    <span className="record-name">{r.placeName}</span>
                    <button
                      className="record-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="record-time">
                    {r.arriveTime.replace('T', ' ')} → {r.leaveTime.replace('T', ' ')}
                  </p>
                  {r.description && (
                    <p className="record-desc">{r.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
