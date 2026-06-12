import { useState, useMemo } from 'react';
import { RunningRoute, RoutePoint } from '../types';
import { paceToColor } from './MapView';

interface SidebarProps {
  routes: RunningRoute[];
  selectedRouteId: string | null;
  onToggleSelect: (id: string) => void;
  onAddRoute: (route: RunningRoute) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
}

const parseCoordinates = (text: string): RoutePoint[] => {
  const parts = text
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  const result: RoutePoint[] = [];
  for (const p of parts) {
    const [latStr, lngStr] = p.split(',').map((s) => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      result.push({ lat, lng });
    }
  }
  return result;
};

const MIN_PACE = 4;
const MAX_PACE = 10;

const Sidebar: React.FC<SidebarProps> = ({
  routes,
  selectedRouteId,
  onToggleSelect,
  onAddRoute,
  showHeatmap,
  onToggleHeatmap,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [avgPace, setAvgPace] = useState('');
  const [coordsText, setCoordsText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const paceRange = useMemo(() => {
    if (routes.length === 0) return { min: MIN_PACE, max: MAX_PACE };
    const paces = routes.map((r) => r.avgPace);
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    return { min: Math.max(MIN_PACE, min - 1), max: Math.min(MAX_PACE, max + 1) };
  }, [routes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const coords = parseCoordinates(coordsText);
    if (coords.length < 5) {
      setError('至少需要5个有效坐标点（格式：lat,lng|lat,lng）');
      return;
    }
    const parsedPace = avgPace ? parseFloat(avgPace) : undefined;
    if (parsedPace !== undefined && isNaN(parsedPace)) {
      setError('平均配速格式无效');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          avgPace: parsedPace,
          coordinates: coords,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '添加失败');
      }
      const data = (await res.json()) as RunningRoute;
      onAddRoute(data);
      setDate(new Date().toISOString().split('T')[0]);
      setAvgPace('');
      setCoordsText('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div>
        <div className="section-title">跑步路线热力图</div>
        <p style={{ fontSize: 12, color: '#a0a0b0', lineHeight: 1.5 }}>
          录入多条跑步路线，直观对比路径分布并生成核密度热力图。
        </p>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => setShowForm((s) => !s)}
      >
        {showForm ? '取消添加' : '+ 添加路线'}
      </button>

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>平均配速（分钟/公里，可选）</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={avgPace}
              onChange={(e) => setAvgPace(e.target.value)}
              placeholder="例如 5.5"
            />
          </div>
          <div className="form-group">
            <label>
              坐标点（至少5个，格式 lat,lng|lat,lng）
            </label>
            <textarea
              rows={5}
              value={coordsText}
              onChange={(e) => setCoordsText(e.target.value)}
              placeholder="31.2304,121.4737|31.2315,121.4748|31.2326,121.4760|31.2337,121.4772|31.2348,121.4784|31.2359,121.4796"
            />
          </div>
          {error && (
            <div
              style={{
                color: '#ff6b6b',
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '保存中...' : '保存路线'}
          </button>
        </form>
      )}

      <div className="card">
        <div className="section-title">路线图例</div>
        {routes.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a0a0b0' }}>暂无路线数据</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {routes.map((route) => {
              const color = paceToColor(
                route.avgPace,
                paceRange.min,
                paceRange.max
              );
              const isSelected = selectedRouteId === route.id;
              return (
                <div
                  key={route.id}
                  className={`legend-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onToggleSelect(route.id)}
                >
                  <span
                    className="legend-color"
                    style={{ background: color }}
                  />
                  <div className="legend-text">
                    <div style={{ fontWeight: 600 }}>{route.date}</div>
                    <div style={{ color: '#a0a0b0', fontSize: 11 }}>
                      {route.distance} km · {route.avgPace.toFixed(1)} min/km
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        className={`btn ${showHeatmap ? 'btn-primary' : 'btn-warn'}`}
        onClick={onToggleHeatmap}
        disabled={routes.length === 0}
        style={{ opacity: routes.length === 0 ? 0.5 : 1 }}
      >
        {showHeatmap ? '隐藏热力图' : '生成热力图'}
      </button>
    </>
  );
};

export default Sidebar;
