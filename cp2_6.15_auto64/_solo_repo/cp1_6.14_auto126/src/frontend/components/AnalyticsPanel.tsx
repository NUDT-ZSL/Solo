import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Work, WorkStats, getWorkStats, getWorks } from '../utils/http';

interface AnalyticsPanelProps {
  selectedWork?: Work | null;
  onSelectWork?: (work: Work) => void;
}

const PIE_COLORS = ['#ff2d55', '#5856d6', '#34c759', '#ff9500'];
const BAR_COLORS = {
  comments: '#5856d6',
  likes: '#ff9500',
  shares: '#34c759',
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ selectedWork, onSelectWork }) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkId, setActiveWorkId] = useState<string>('');
  const [drilldownDay, setDrilldownDay] = useState<string | null>(null);

  const fetchWorks = async () => {
    try {
      const data = await getWorks();
      const published = data.filter((w) => w.status === 'published');
      setWorks(published);
      if (selectedWork) {
        setActiveWorkId(selectedWork.id);
      } else if (published.length > 0) {
        setActiveWorkId(published[0].id);
      }
    } catch (error) {
      console.error('获取作品列表失败:', error);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  useEffect(() => {
    if (selectedWork) {
      setActiveWorkId(selectedWork.id);
    }
  }, [selectedWork]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!activeWorkId) return;
      try {
        setLoading(true);
        const data = await getWorkStats(activeWorkId);
        setStats(data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeWorkId]);

  const activeWork = useMemo(
    () => works.find((w) => w.id === activeWorkId),
    [works, activeWorkId]
  );

  const totalInteractions = useMemo(() => {
    if (!stats) return { comments: 0, likes: 0, shares: 0 };
    return stats.interactions.reduce(
      (acc, item) => ({
        comments: acc.comments + item.comments,
        likes: acc.likes + item.likes,
        shares: acc.shares + item.shares,
      }),
      { comments: 0, likes: 0, shares: 0 }
    );
  }, [stats]);

  const aggregatedBarData = useMemo(() => {
    return [
      { name: '评论数', value: totalInteractions.comments, type: 'comments' },
      { name: '点赞数', value: totalInteractions.likes, type: 'likes' },
      { name: '分享数', value: totalInteractions.shares, type: 'shares' },
    ];
  }, [totalInteractions]);

  const handleWorkSelect = (work: Work) => {
    setActiveWorkId(work.id);
    setDrilldownDay(null);
    if (onSelectWork) onSelectWork(work);
  };

  if (loading && !stats) {
    return (
      <div className="fade-in" style={styles.loadingContainer}>
        <div style={styles.loadingText}>加载数据中...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>数据分析</h2>
        <div style={styles.workSelector}>
          {works.map((work) => (
            <button
              key={work.id}
              onClick={() => handleWorkSelect(work)}
              style={{
                ...styles.workTab,
                backgroundColor: activeWorkId === work.id ? '#ff2d55' : '#1c1c1e',
                color: activeWorkId === work.id ? '#ffffff' : '#8e8e93',
              }}
            >
              <img src={work.cover} alt="" style={styles.workTabCover} />
              <span style={styles.workTabTitle}>{work.title}</span>
            </button>
          ))}
        </div>
      </div>

      {activeWork && stats && (
        <>
          <div style={styles.statsOverview} data-stats-overview>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <div style={styles.statInfo}>
                <div style={styles.statLabel}>总播放量</div>
                <div style={styles.statValue}>{stats.totalPlays.toLocaleString()}</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, color: '#34c759' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div style={styles.statInfo}>
                <div style={styles.statLabel}>平均播放时长</div>
                <div style={styles.statSubValue}>{stats.averageDuration} 分钟</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, color: '#5856d6' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5856d6" strokeWidth="2">
                  <path d="M21,15a2,2,0,0,1-2,2H7l-4,4V5a2,2,0,0,1,2-2H19A2,2,0,0,1,21,5Z" />
                </svg>
              </div>
              <div style={styles.statInfo}>
                <div style={styles.statLabel}>评论数</div>
                <div style={styles.statSubValue}>{totalInteractions.comments}</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, color: '#ff9500' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div style={styles.statInfo}>
                <div style={styles.statLabel}>点赞数</div>
                <div style={styles.statSubValue}>{totalInteractions.likes}</div>
              </div>
            </div>
          </div>

          <div style={styles.chartsRow} data-charts-row>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>过去7天播放趋势</h3>
              <div style={styles.totalPlaysDisplay}>
                <span style={styles.totalPlaysNumber}>{stats.totalPlays.toLocaleString()}</span>
                <span style={styles.totalPlaysLabel}>总播放量</span>
                <span style={styles.avgDurationLabel}>平均 {stats.averageDuration} 分钟/次</span>
              </div>
              <div style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.dailyPlays}>
                    <defs>
                      <linearGradient id="playGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff2d55" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#ff2d55" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                    <XAxis dataKey="date" stroke="#8e8e93" fontSize={12} />
                    <YAxis stroke="#8e8e93" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1c1e',
                        border: '1px solid #2c2c2e',
                        borderRadius: 8,
                        color: '#ffffff',
                      }}
                      itemStyle={{ color: '#ff2d55' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="plays"
                      stroke="#ff2d55"
                      strokeWidth={3}
                      fill="url(#playGradient)"
                      animationDuration={800}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>播放来源分布</h3>
              <div style={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={stats.sourceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {stats.sourceDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1c1e',
                        border: '1px solid #2c2c2e',
                        borderRadius: 8,
                        color: '#ffffff',
                      }}
                      formatter={(value: number) => [`${value}%`, '占比']}
                    />
                    <Legend
                      formatter={(value: string) => <span style={{ color: '#ffffff' }}>{value}</span>}
                      wrapperStyle={{ fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>粉丝互动统计</h3>
              {drilldownDay && (
                <button
                  style={styles.backBtn}
                  onClick={() => setDrilldownDay(null)}
                >
                  ← 返回总览
                </button>
              )}
            </div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={drilldownDay && stats ? stats.interactions.filter(i => i.day === drilldownDay) : aggregatedBarData}
                  barCategoryGap="20%"
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#8e8e93"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis stroke="#8e8e93" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1c1e',
                      border: '1px solid #2c2c2e',
                      borderRadius: 8,
                      color: '#ffffff',
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  {!drilldownDay ? (
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      onClick={(data: any) => {
                        if (data && data.type === 'comments') {
                          setDrilldownDay('');
                        }
                      }}
                      animationDuration={800}
                    >
                      {aggregatedBarData.map((entry, index) => (
                        <Cell
                          key={`bar-cell-${index}`}
                          fill={BAR_COLORS[entry.type as keyof typeof BAR_COLORS]}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Bar>
                  ) : (
                    <>
                      <Bar
                        dataKey="comments"
                        name="评论"
                        fill={BAR_COLORS.comments}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        animationDuration={800}
                      />
                      <Bar
                        dataKey="likes"
                        name="点赞"
                        fill={BAR_COLORS.likes}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        animationDuration={800}
                      />
                      <Bar
                        dataKey="shares"
                        name="分享"
                        fill={BAR_COLORS.shares}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        animationDuration={800}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!drilldownDay && (
              <div style={styles.drilldownHint}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                点击柱体可下钻查看本周每日互动趋势
              </div>
            )}
            {!drilldownDay && stats && (
              <div style={styles.weekTrendContainer}>
                <div style={styles.weekTrendTitle}>本周每日互动趋势（点击日期下钻）</div>
                <div style={styles.weekDaysRow}>
                  {stats.interactions.map((day) => (
                    <button
                      key={day.day}
                      style={styles.dayChip}
                      onClick={() => setDrilldownDay(day.day)}
                    >
                      <span style={styles.dayName}>{day.day}</span>
                      <span style={styles.daySummary}>
                        💬{day.comments} ❤️{day.likes} 🔗{day.shares}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 20,
  },
  workSelector: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  workTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px 8px 8px',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  workTabCover: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: 'cover',
  },
  workTabTitle: {
    fontSize: 14,
    fontWeight: 600,
  },
  statsOverview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,45,85,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statInfo: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1,
  },
  statSubValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#ffffff',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 24,
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 24,
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 16,
  },
  totalPlaysDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 16,
    marginBottom: 8,
    paddingLeft: 8,
  },
  totalPlaysNumber: {
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
  },
  totalPlaysLabel: {
    fontSize: 14,
    color: '#8e8e93',
  },
  avgDurationLabel: {
    fontSize: 16,
    color: '#8e8e93',
    marginLeft: 'auto',
  },
  chartContainer: {
    width: '100%',
  },
  backBtn: {
    padding: '6px 14px',
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  drilldownHint: {
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#8e8e93',
    paddingLeft: 8,
  },
  weekTrendContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: '1px solid #2c2c2e',
  },
  weekTrendTitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 12,
  },
  weekDaysRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  dayChip: {
    padding: '10px 16px',
    backgroundColor: '#2c2c2e',
    border: '1px solid #3a3a3c',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minWidth: 88,
  },
  dayName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ffffff',
  },
  daySummary: {
    fontSize: 11,
    color: '#8e8e93',
  },
};

const responsiveStyle = `
  @media (max-width: 1200px) {
    [data-stats-overview] { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 1024px) {
    [data-charts-row] { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    [data-stats-overview] { grid-template-columns: 1fr !important; }
  }
`;

const analyticsStyle = document.createElement('style');
analyticsStyle.textContent = responsiveStyle;
document.head.appendChild(analyticsStyle);

export default AnalyticsPanel;
