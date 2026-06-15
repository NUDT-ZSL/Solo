import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from './data-store';
import './main.css';

function AnimatedNumber({ value }: { value: string | number }) {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (display === value) return;
    setFlipping(true);
    const timer = setTimeout(() => {
      setDisplay(value);
      setFlipping(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [value, display]);

  return (
    <span className={`stat-value ${flipping ? 'stat-value--flip' : ''}`}>
      {display}
    </span>
  );
}

function App() {
  const [records, setRecords] = useState<TravelRecord[]>(() => loadRecords());
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
