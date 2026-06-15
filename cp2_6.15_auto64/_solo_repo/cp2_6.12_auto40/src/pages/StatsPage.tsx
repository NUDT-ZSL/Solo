import { useState, useEffect, useMemo, Component } from 'react';
import HeatMap from '../components/HeatMap';
import { getStats } from '../api/habits';
import type { TimeRange, StatsDataPoint } from '../types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class StatsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ marginBottom: '8px' }}>统计图表渲染出错</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            className="add-habit-btn"
            onClick={this.handleReset}
            style={{ margin: '0 auto' }}
          >
            重新尝试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StatsPage() {
  const [range, setRange] = useState<TimeRange>('weekly');
  const [data, setData] = useState<StatsDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorResetKey, setErrorResetKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getStats(range);
        if (!res || !res[range]) {
          setError('服务器返回了无效数据');
          setData([]);
          return;
        }
        setData(res[range]);
      } catch (err) {
        const message = err instanceof Error ? err.message : '网络错误，请检查后端服务是否启动';
        setError(message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

  const handleErrorReset = () => {
    setErrorResetKey((k) => k + 1);
  };

  const totalCount = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);
  const activeDays = useMemo(
    () => new Set(data.filter((d) => d.count > 0).map((d) => d.date)).size,
    [data]
  );

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
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h3 style={{ marginBottom: '8px' }}>加载失败</h3>
            <p style={{ marginBottom: '16px' }}>{error}</p>
            <button
              className="add-habit-btn"
              onClick={() => {
                setRange(range);
                setErrorResetKey((k) => k + 1);
              }}
              style={{ margin: '0 auto' }}
            >
              重试
            </button>
          </div>
        ) : (
          <StatsErrorBoundary key={errorResetKey} onReset={handleErrorReset}>
            <HeatMap data={data} range={range} />
          </StatsErrorBoundary>
        )}
      </div>
    </div>
  );
}
