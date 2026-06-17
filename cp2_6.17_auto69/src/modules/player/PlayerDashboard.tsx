import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { playerApi, type PlayerStats } from '../../services/api';

const COLORS = ['#64b5f6', '#4caf50', '#ff9800', '#9c27b0', '#f44336'];

const mockStats: PlayerStats = {
  playerId: 'demo',
  playerName: '桌游达人',
  totalGames: 28,
  wins: 15,
  winRate: 0.54,
  averageScore: 38.5,
  longestWinStreak: 5,
  currentWinStreak: 2,
  recentScores: [
    { gameName: '璀璨宝石', score: 42.5, won: true, date: '2024-01-15' },
    { gameName: '卡坦岛', score: 38.0, won: true, date: '2024-01-14' },
    { gameName: '七大奇迹', score: 25.5, won: false, date: '2024-01-13' },
    { gameName: '璀璨宝石', score: 45.0, won: true, date: '2024-01-12' },
    { gameName: '殖民火星', score: 52.0, won: true, date: '2024-01-11' },
    { gameName: '卡坦岛', score: 28.5, won: false, date: '2024-01-10' },
    { gameName: '冷战热斗', score: 80.0, won: true, date: '2024-01-09' },
    { gameName: '七大奇迹', score: 32.0, won: false, date: '2024-01-08' },
    { gameName: '璀璨宝石', score: 35.5, won: true, date: '2024-01-07' },
    { gameName: '卡坦岛', score: 30.0, won: false, date: '2024-01-06' }
  ],
  gameDistribution: [
    { gameName: '璀璨宝石', count: 10, percentage: 36 },
    { gameName: '卡坦岛', count: 8, percentage: 29 },
    { gameName: '七大奇迹', count: 5, percentage: 18 },
    { gameName: '殖民火星', count: 3, percentage: 11 },
    { gameName: '冷战热斗', count: 2, percentage: 7 }
  ]
};

export default function PlayerDashboard() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    loadStats();
  }, [id]);

  async function loadStats() {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await playerApi.getPlayerStats(id);
    if (result.error) {
      console.log('Using mock data for demo:', result.error);
      setStats(mockStats);
      setUsingMock(true);
      setError(`无法连接到服务器，使用演示数据 (${result.error})`);
    } else if (result.data) {
      setStats(result.data);
      setUsingMock(false);
    }
    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  const barData = stats.recentScores
    .map(item => ({
      name: `${item.gameName.slice(0, 3)}`,
      score: item.score,
      won: item.won,
      fullName: item.gameName
    }))
    .reverse();

  const pieData = stats.gameDistribution.map(item => ({
    name: item.gameName,
    value: item.count,
    percentage: item.percentage
  }));

  return (
    <div className="dashboard-container">
      <h1 className="page-title">
        👤 {stats.playerName} 的数据中心
        {usingMock && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 'normal',
              color: '#888',
              marginLeft: 12
            }}
          >
            （演示模式）
          </span>
        )}
      </h1>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#fff3e0',
            color: '#e65100',
            borderLeft: '4px solid #ff9800'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="stats-badges">
          <div className="badge badge-total">
            <div className="badge-value">{stats.totalGames}</div>
            <div className="badge-label">总场次</div>
          </div>
          <div className="badge badge-winrate">
            <div className="badge-value">{(stats.winRate * 100).toFixed(0)}%</div>
            <div className="badge-label">胜率</div>
          </div>
          <div className="badge badge-avgscore">
            <div className="badge-value">{stats.averageScore}</div>
            <div className="badge-label">平均分</div>
          </div>
          <div className="badge badge-streak">
            <div className="badge-value">{stats.longestWinStreak}</div>
            <div className="badge-label">最长连胜</div>
          </div>
        </div>

        {stats.currentWinStreak > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                background: 'linear-gradient(90deg, #ff9800, #f44336)',
                color: 'white',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 'bold'
              }}
            >
              🔥 当前连胜 {stats.currentWinStreak} 场
            </span>
          </div>
        )}
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <h3 className="section-title">📈 最近10场得分趋势</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}分`,
                    props.payload.fullName
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.won ? '#4caf50' : '#f44336'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              marginTop: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: '#4caf50',
                  borderRadius: 2
                }}
              ></div>
              <span style={{ fontSize: 12, color: '#666' }}>胜利</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: '#f44336',
                  borderRadius: 2
                }}
              ></div>
              <span style={{ fontSize: 12, color: '#666' }}>失败</span>
            </div>
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="section-title">🎯 桌游分布</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}场 (${props.payload.percentage}%)`,
                    props.payload.name
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span style={{ fontSize: 12, color: '#666' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="section-title">📋 详细数据</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}
        >
          <div
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              总胜场
            </div>
            <div
              style={{ fontSize: 24, fontWeight: 'bold', color: '#4caf50' }}
            >
              {stats.wins}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              总负场
            </div>
            <div
              style={{ fontSize: 24, fontWeight: 'bold', color: '#f44336' }}
            >
              {stats.totalGames - stats.wins}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              游玩桌游数
            </div>
            <div
              style={{ fontSize: 24, fontWeight: 'bold', color: '#64b5f6' }}
            >
              {stats.gameDistribution.length}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8
            }}
          >
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              当前连胜
            </div>
            <div
              style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9800' }}
            >
              {stats.currentWinStreak}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
