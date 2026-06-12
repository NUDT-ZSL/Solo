import { useState, useEffect, useMemo } from 'react';
import HeatMap from '../components/HeatMap';
import { getStats } from '../api/habits';
import type { TimeRange, StatsDataPoint } from '../types';

export default function StatsPage() {
  const [range, setRange] = useState<TimeRange>('weekly');
  const [data, setData] = useState<StatsDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getStats(range);
        setData(res[range] || []);
      } catch (err) {
        console.error('加载统计数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  const totalCount = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);
  const activeDays = useMemo(() => new Set(data.filter((d) => d.count > 0).map((d) => d.date)).size, [data]);

  return (
    <div className="stats-page">
      <h1 className="intro-title" style={{ marginBottom: '8px' }}>数据可视化 📊</h1>
      <p className="intro-subtitle" style={{ marginBottom: '32px' }}>
        热力图展示各时段的打卡密度，从浅蓝到深蓝代表频次由低到高。
      </p>

      <div className="stats-summary" style={{ marginBottom: '32px' }}>
        <div className="summary-card">
          <div className="summary-value">{totalCount}</div>
          <div className="summary-label">总打卡次数</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{activeDays}</div>
          <div className="summary-label">活跃天数</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">
            {data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0}
          </div>
          <div className="summary-label">时段最高打卡</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">
            {data.length > 0 ? (totalCount / Math.max(1, activeDays)).toFixed(1) : '0'}
          </div>
          <div className="summary-label">日均打卡</div>
        </div>
      </div>

      <div className="range-tabs">
        {(['weekly', 'monthly', 'quarterly'] as TimeRange[]).map((r) => (
          <button
            key={r}
            className={`range-tab ${range === r ? 'active' : ''}`}
            onClick={() => setRange(r)}
          >
            {r === 'weekly' ? '周视图' : r === 'monthly' ? '月视图' : '季度视图'}
          </button>
        ))}
      </div>

      <div className="heatmap-container">
        <h3 className="heatmap-title">
          {range === 'weekly' ? '本周' : range === 'monthly' ? '本月' : '本季度'} · 打卡热力图
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : (
          <HeatMap data={data} range={range} />
        )}
      </div>
    </div>
  );
}
