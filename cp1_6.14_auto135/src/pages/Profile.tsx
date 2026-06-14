import { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { Stats } from '../types';
import { api } from '../utils/http';

export default function Profile() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        console.error('加载统计数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!stats) {
    return <div style={styles.loading}>暂无数据</div>;
  }

  const statCards = [
    { label: '总品鉴数', value: stats.totalBeers.toString(), icon: '🍺' },
    { label: '平均评分', value: stats.avgRating.toFixed(1), icon: '⭐' },
    { label: '最爱风格', value: stats.favoriteStyle, icon: '🏆' },
    { label: '最爱风味', value: stats.favoriteTag, icon: '🌟' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>个人中心</h1>
        <p style={styles.subtitle}>查看你的品鉴统计与偏好</p>
      </div>

      <div style={styles.statsGrid}>
        {statCards.map((card, index) => (
          <div key={index} style={styles.statCard} className="stat-card">
            <div style={styles.statIcon}>{card.icon}</div>
            <div style={styles.statValue}>{card.value}</div>
            <div style={styles.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.sectionTitle}>风味偏好分布</h2>
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={stats.radarData} outerRadius={80}>
              <PolarGrid stroke="#2a2a5a" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#a0a0b0', fontSize: 13 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#4a4a6a', fontSize: 11 }}
                stroke="#2a2a5a"
              />
              <Radar
                name="偏好度"
                dataKey="value"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.legend}>
          <p style={styles.legendText}>
            雷达图展示了你在六大风味维度上的偏好分布，数值越高表示你越偏爱该类风味的啤酒。
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#a0a0b0',
    fontSize: '16px'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    fontSize: '15px',
    color: '#a0a0b0',
    margin: '8px 0 0 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '48px'
  },
  statCard: {
    width: '100%',
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '28px 20px',
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  statIcon: {
    fontSize: '36px',
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#a0a0b0'
  },
  chartSection: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '32px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  chartContainer: {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto'
  },
  legend: {
    marginTop: '24px',
    textAlign: 'center'
  },
  legendText: {
    fontSize: '14px',
    color: '#a0a0b0',
    lineHeight: 1.6,
    margin: 0
  }
};

const css = `
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = css;
document.head.appendChild(styleSheet);
