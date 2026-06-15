import { useState, useEffect, useMemo } from 'react';
import { fetchChartData } from '../api';
import type { BurndownData } from '../types';

interface BurndownChartProps {
  projectId: string;
  onClose: () => void;
}

interface ChartData extends BurndownData {
  dailyRatios: number[];
}

function BurndownChart({ projectId, onClose }: BurndownChartProps) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    const startTime = performance.now();
    const res = await fetchChartData(projectId);
    const elapsed = performance.now() - startTime;
    if (res.code === 0) setData(res.data as ChartData);
    setLoading(false);
    if (elapsed > 800) {
      console.warn('燃尽图生成耗时:', elapsed.toFixed(0), 'ms');
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const chartSvg = useMemo(() => {
    if (!data) return null;

    const W = 680;
    const H = 420;
    const padding = { top: 40, right: 40, bottom: 60, left: 56 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const dates = data.dates && data.dates.length > 0 ? data.dates : [];
    const n = dates.length || 1;
    const safeRatios = (data.dailyRatios || []).map(function (v) {
      return Math.min(1, Math.max(0, typeof v === 'number' && isFinite(v) ? v : 0));
    });
    while (safeRatios.length < n) safeRatios.push(0);
    const ideal = data.ideal && data.ideal.length > 0 ? data.ideal : Array(n).fill(0);
    const actual = data.actual && data.actual.length > 0 ? data.actual : Array(n).fill(data.total || 0);
    const maxVal = Math.max(...ideal, ...actual, 1);
    const yMax = Math.ceil(maxVal / 5) * 5 || 5;
    const barWidth = Math.min(30, chartW / n * 0.5);

    const xAt = (i: number) => padding.left + (chartW * i) / (n > 1 ? n - 1 : 1);
    const yAt = (v: number) => padding.top + chartH - (chartH * v) / yMax;

    const idealPoints = ideal.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
    const actualPoints = actual.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');

    const areaPath =
      `M ${xAt(0)},${yAt(yMax)} ` +
      actual.map((v, i) => `L ${xAt(i)},${yAt(v)}`).join(' ') +
      ` L ${xAt(n - 1)},${yAt(yMax)} Z`;

    const yTicks = 5;
    const tickVals: number[] = [];
    for (let i = 0; i <= yTicks; i++) {
      tickVals.push(Math.round((yMax * i) / yTicks));
    }

    const doneCount = data.total - (actual[actual.length - 1] || 0);
    const completion = data.total > 0 ? Math.round((doneCount / data.total) * 100) : 0;

    const bars = actual.map((v, i) => {
      const barH = (yMax - v) > 0 ? ((yMax - v) / yMax) * chartH : 0;
      const bx = xAt(i) - barWidth / 2;
      const by = yAt(yMax) - barH;
      return { x: bx, y: by, w: barWidth, h: barH, i };
    });

    return {
      W, H, padding, chartW, chartH, n, yMax,
      dates, ideal, actual, idealPoints, actualPoints, areaPath,
      tickVals, doneCount, completion, bars, safeRatios,
      xAt, yAt,
    };
  }, [data]);

  const renderChart = () => {
    if (!data || loading || !chartSvg) {
      return (
        <div style={s.loading}>
          <div style={s.spinner} />
          <div style={s.loadingText}>
            {loading ? '正在生成燃尽图...' : '暂无数据'}
          </div>
        </div>
      );
    }

    const {
      W, H, padding, n, yMax,
      dates, idealPoints, actualPoints, areaPath,
      tickVals, doneCount, completion, bars, safeRatios,
      xAt, yAt,
    } = chartSvg;

    return (
      <div>
        <div style={s.statsRow} data-stats-row>
          <div style={s.stat}>
            <div style={s.statNum}>{data.total}</div>
            <div style={s.statLabel}>总任务</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statNum, color: '#10b981' }}>{doneCount}</div>
            <div style={s.statLabel}>已完成</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statNum, color: '#f59e0b' }}>
              {data.total - doneCount}
            </div>
            <div style={s.statLabel}>未完成</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statNum, color: '#3b82f6' }}>{completion}%</div>
            <div style={s.statLabel}>完成率</div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {tickVals.map((t, i) => {
            const y = yAt(t);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  x2={W - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#374151"
                  strokeOpacity={0.2}
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  fontSize={11}
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {t}
                </text>
              </g>
            );
          })}

          <text
            x={padding.left - 44}
            y={padding.top + chartSvg.chartH / 2}
            fontSize={12}
            fill="#9ca3af"
            textAnchor="middle"
            transform={`rotate(-90 ${padding.left - 44} ${padding.top + chartSvg.chartH / 2})`}
          >
            未完成任务数
          </text>

          {dates.map((d, i) => (
            <text
              key={i}
              x={xAt(i)}
              y={H - padding.bottom + 28}
              fontSize={11}
              fill="#9ca3af"
              textAnchor="middle"
            >
              {formatDateLabel(d)}
            </text>
          ))}

          <text
            x={W / 2}
            y={H - 12}
            fontSize={12}
            fill="#6b7280"
            textAnchor="middle"
          >
            日期
          </text>

          {bars.map((bar) => (
            <rect
              key={`bar-${bar.i}`}
              x={bar.x}
              y={bar.y}
              width={bar.w}
              height={bar.h}
              fill="#3b82f633"
              rx={3}
            />
          ))}

          <path
            d={areaPath}
            fill="url(#areaGradient)"
            stroke="none"
          />

          <polyline
            points={idealPoints}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          <polyline
            points={actualPoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chartSvg.ideal.map((v, i) => (
            <circle
              key={`i-${i}`}
              cx={xAt(i)}
              cy={yAt(v)}
              r="2"
              fill="#9ca3af"
            />
          ))}

          {chartSvg.actual && chartSvg.actual.map((v, i) => (
            <g key={`a-${i}`}>
              <circle
                cx={xAt(i)}
                cy={yAt(v)}
                r="6"
                fill="#fff"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              <title>{`${formatDateLabel(dates[i])}: 剩余 ${v} 个，完成比例 ${Math.round((safeRatios[i] ?? 0) * 100)}%`}</title>
            </g>
          ))}
        </svg>

        {safeRatios && safeRatios.length > 0 && (
          <div style={s.ratioGrid}>
            {dates.map((d, i) => {
              const ratio = safeRatios[i] ?? 0;
              const pct = Math.round(ratio * 100);
              return (
                <div key={i} style={s.ratioItem}>
                  <div style={s.ratioDate}>{formatDateLabel(d)}</div>
                  <div style={s.ratioBar}>
                    <div
                      style={{
                        ...s.ratioFill,
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                  <div style={s.ratioPct}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={s.legend}>
          <div style={s.legendItem}>
            <div style={{ ...s.legendLine, borderStyle: 'dashed', borderColor: '#9ca3af' }} />
            <span>理想燃尽线</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.legendLine, borderColor: '#3b82f6' }}>
              <div style={s.legendDot} />
            </div>
            <span>实际进度</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.legendFill, background: '#3b82f633' }} />
            <span>完成区域</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />
      <div
        data-chart-modal
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: visible
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.9)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s ease-out',
          zIndex: 201,
          width: 'min(760px, 94vw)',
          maxHeight: '92vh',
          background: '#1e1e2e',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#fff',
        }}
      >
        <div style={s.chartHeader}>
          <div>
            <div style={s.chartTitle}>项目燃尽图</div>
            <div style={s.chartSubtitle}>最近 7 天进度追踪</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.refreshBtn} onClick={loadData}>
              刷新
            </button>
            <button style={s.closeBtn} onClick={handleClose}>
              x
            </button>
          </div>
        </div>
        <div style={s.chartBody}>{renderChart()}</div>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  chartHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #31314a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  refreshBtn: {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    background: '#31314a',
    color: '#9ca3af',
    fontSize: 13,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#31314a',
    color: '#9ca3af',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
  },
  loading: {
    padding: '80px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #31314a',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'kanban-spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  stat: {
    background: '#2a2a3e',
    borderRadius: 10,
    padding: 14,
    textAlign: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  ratioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  ratioItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  ratioDate: {
    fontSize: 10,
    color: '#6b7280',
  },
  ratioBar: {
    width: '100%',
    height: 4,
    background: '#31314a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: 2,
    transition: 'width 0.3s ease-out',
  },
  ratioPct: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: 600,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: 28,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  legendLine: {
    width: 28,
    height: 0,
    borderTop: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#3b82f6',
    border: '2px solid #fff',
    boxSizing: 'border-box',
  },
  legendFill: {
    width: 28,
    height: 10,
    borderRadius: 2,
    border: '1px solid #3b82f666',
  },
};

export default BurndownChart;
