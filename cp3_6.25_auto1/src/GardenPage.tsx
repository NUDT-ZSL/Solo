import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Plot {
  id: string;
  number: string;
  area: string;
  cropName: string | null;
  status: 'adopted' | 'vacant';
  adopterId: string | null;
  adopter: { id: string; name: string; avatar: string } | null;
  lastWateredAt: string | null;
}

interface LeaderboardEntry {
  plotId: string;
  number: string;
  adopterId: string;
  adopterName: string;
  avatar: string;
  cropName: string | null;
  healthScore: number;
}

export default function GardenPage({ currentUser }: { currentUser: { id: string; name: string; avatar: string } }) {
  const navigate = useNavigate();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [trendScores, setTrendScores] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [gardenRes, lbRes, trendRes] = await Promise.all([
        fetch('/api/gardens/garden-1'),
        fetch('/api/leaderboard/garden-1'),
        fetch('/api/leaderboard/garden-1/trend/user-1'),
      ]);
      const gardenData = await gardenRes.json();
      const lbData = await lbRes.json();
      const trendData = await trendRes.json();
      setPlots(gardenData.plots || []);
      setLeaderboard(lbData || []);
      setTrendLabels(trendData.labels || []);
      setTrendScores(trendData.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdopt = async (e: React.MouseEvent, plotId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/plots/${plotId}/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, cropName: '蔬菜' }),
      });
      fetchData();
    } catch {
      // ignore
    }
  };

  const rankIcons = ['🥇', '🥈', '🥉'];

  const chartData = {
    labels: trendLabels.map((d) => dayjs(d).format('MM/DD')),
    datasets: [
      {
        label: '健康趋势',
        data: trendScores,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76,175,80,0.1)',
        fill: true,
        pointRadius: 4,
        tension: 0.3,
      },
    ],
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>加载中...</div>;
  }

  return (
    <div className="main-layout" style={{ display: 'flex', padding: '24px', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#2e7d32', marginBottom: '20px' }}>
          菜畦认养
        </h2>
        <div className="plot-grid">
          {plots.map((plot) => (
            <div
              key={plot.id}
              onClick={() => navigate(`/plot/${plot.id}`)}
              style={{
                width: '280px',
                height: '200px',
                borderRadius: '16px',
                background: 'linear-gradient(to bottom, #e8f5e9, #fff9c4)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>#{plot.number}</span>
                <span style={{ fontSize: '12px', color: '#757575' }}>{plot.area}</span>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>{plot.cropName || '空置'}</span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: plot.status === 'adopted' ? '#4caf50' : '#9e9e9e',
                    color: 'white',
                  }}
                >
                  {plot.status === 'adopted' ? '已认养' : '空置'}
                </span>
              </div>
              {plot.lastWateredAt && (
                <div style={{ fontSize: '12px', color: '#757575', marginTop: '4px' }}>
                  上次浇水: {dayjs(plot.lastWateredAt).format('MM/DD HH:mm')}
                </div>
              )}
              {plot.adopter && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #43a047',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    {plot.adopter.avatar}
                  </span>
                  <span style={{ fontSize: '12px' }}>🌱</span>
                </div>
              )}
              {plot.status === 'vacant' && (
                <button
                  className="btn-hover"
                  onClick={(e) => handleAdopt(e, plot.id)}
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🌱
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar" style={{ width: '280px', flexShrink: 0 }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#2e7d32', marginBottom: '16px' }}>
          🏆 菜畦排行榜
        </h3>
        {leaderboard.map((entry, idx) => (
          <div
            key={entry.plotId}
            style={{
              width: '240px',
              borderRadius: '12px',
              background: '#f5f5f5',
              padding: '12px 16px',
              marginBottom: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{idx < 3 ? rankIcons[idx] : `${idx + 1}`}</span>
              <span style={{ fontWeight: 600 }}>#{entry.number}</span>
              <span style={{ fontSize: '13px' }}>{entry.cropName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13px' }}>
              <span style={{ color: '#757575' }}>{entry.adopterName}</span>
              <span style={{ fontWeight: 700, color: '#2e7d32' }}>{entry.healthScore}分</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#2e7d32', marginBottom: '8px' }}>
            我的7日趋势
          </h4>
          <div style={{ height: '200px' }}>
            <Line data={chartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}
