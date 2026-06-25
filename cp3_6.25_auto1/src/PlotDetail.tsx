import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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

interface Journal {
  id: string;
  cropVariety: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

interface CheckIn {
  id: string;
  type: 'water' | 'fertilize';
  userId: string;
  createdAt: string;
}

interface Plot {
  id: string;
  number: string;
  area: string;
  cropName: string | null;
  status: 'adopted' | 'vacant';
  adopterId: string | null;
  adopter: { id: string; name: string; avatar: string } | null;
  lastWateredAt: string | null;
  journals: Journal[];
  checkIns: CheckIn[];
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

interface Particle {
  id: number;
  tx: string;
  ty: string;
  left: number;
  top: number;
}

export default function PlotDetail({ currentUser }: { currentUser: { id: string; name: string; avatar: string } }) {
  const { id: plotId } = useParams<{ id: string }>();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [trendScores, setTrendScores] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newJournal, setNewJournal] = useState({ cropVariety: '', description: '', imageUrl: '' });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashButton, setFlashButton] = useState<'water' | 'fertilize' | null>(null);
  const waterBtnRef = useRef<HTMLButtonElement>(null);
  const fertilizeBtnRef = useRef<HTMLButtonElement>(null);

  const todayWaterCount = plot
    ? plot.checkIns.filter(
        (c) => c.type === 'water' && dayjs(c.createdAt).isSame(dayjs(), 'day')
      ).length
    : 0;

  const todayFertilizeCount = plot
    ? plot.checkIns.filter(
        (c) => c.type === 'fertilize' && dayjs(c.createdAt).isSame(dayjs(), 'day')
      ).length
    : 0;

  const fetchData = async () => {
    try {
      const [plotRes, lbRes, trendRes] = await Promise.all([
        fetch(`/api/plots/${plotId}`),
        fetch('/api/leaderboard/garden-1'),
        fetch('/api/leaderboard/garden-1/trend/user-1'),
      ]);
      const plotData = await plotRes.json();
      const lbData = await lbRes.json();
      const trendData = await trendRes.json();
      setPlot(plotData);
      setLeaderboard(lbData || []);
      setTrendLabels(trendData.labels || []);
      setTrendScores(trendData.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchData();
  }, [plotId]);

  const handleJournalSubmit = async () => {
    try {
      await fetch(`/api/plots/${plotId}/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          cropVariety: newJournal.cropVariety,
          description: newJournal.description,
          imageUrl: newJournal.imageUrl,
        }),
      });
      setNewJournal({ cropVariety: '', description: '', imageUrl: '' });
      setShowForm(false);
      fetchData();
    } catch {
      // ignore
    }
  };

  const handleCheckIn = async (type: 'water' | 'fertilize') => {
    try {
      await fetch(`/api/plots/${plotId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, type }),
      });

      setFlashButton(type);

      const btnRef = type === 'water' ? waterBtnRef : fertilizeBtnRef;
      const rect = btnRef.current?.getBoundingClientRect();
      const parentRect = btnRef.current?.parentElement?.getBoundingClientRect();

      const newParticles: Particle[] = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        tx: `${Math.random() * 60 - 30}px`,
        ty: `${Math.random() * 60 - 30}px`,
        left: rect && parentRect ? rect.left - parentRect.left + rect.width / 2 : 0,
        top: rect && parentRect ? rect.top - parentRect.top + rect.height / 2 : 0,
      }));

      setParticles(newParticles);

      setTimeout(() => {
        setFlashButton(null);
        setParticles([]);
        fetchData();
      }, 300);
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

  if (!plot) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>加载中...</div>;
  }

  const isAdopter = plot.adopterId === currentUser.id;

  return (
    <div className="main-layout" style={{ display: 'flex', padding: '24px', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ flex: 1 }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#2e7d32', fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
          ← 返回花园
        </Link>

        <div
          style={{
            borderRadius: '16px',
            background: 'linear-gradient(to bottom, #e8f5e9, #fff9c4)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px',
            marginBottom: '24px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>
                #{plot.number} {plot.cropName || '空置'}
              </h2>
              <div style={{ fontSize: '14px', color: '#757575' }}>{plot.area}</div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: plot.status === 'adopted' ? '#4caf50' : '#9e9e9e',
                  color: 'white',
                  marginTop: '8px',
                }}
              >
                {plot.status === 'adopted' ? '已认养' : '空置'}
              </span>
              {plot.adopter && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <span style={{ fontSize: '14px' }}>{plot.adopter.name}</span>
                  <span>🌱</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '16px' }}>
              💧×{todayWaterCount} 🧪×{todayFertilizeCount}
            </div>
          </div>
        </div>

        {isAdopter && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
              <button
                ref={waterBtnRef}
                className={`btn-hover ${flashButton === 'water' ? 'flash' : ''}`}
                onClick={() => handleCheckIn('water')}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '15px',
                  cursor: 'pointer',
                  background: '#2196f3',
                  color: 'white',
                }}
              >
                💧 浇水
              </button>
              <button
                ref={fertilizeBtnRef}
                className={`btn-hover ${flashButton === 'fertilize' ? 'flash' : ''}`}
                onClick={() => handleCheckIn('fertilize')}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '15px',
                  cursor: 'pointer',
                  background: '#ff9800',
                  color: 'white',
                }}
              >
                🧪 施肥
              </button>
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="particle"
                  style={
                    {
                      '--tx': p.tx,
                      '--ty': p.ty,
                      left: `${p.left}px`,
                      top: `${p.top}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#2e7d32', margin: 0 }}>种植日志</h3>
            {isAdopter && (
              <button
                onClick={() => setShowForm((v) => !v)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid #2e7d32',
                  background: 'white',
                  color: '#2e7d32',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📝 记录日志
              </button>
            )}
          </div>

          {showForm && (
            <div
              style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <input
                placeholder="作物品种"
                value={newJournal.cropVariety}
                onChange={(e) => setNewJournal((j) => ({ ...j, cropVariety: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
              <textarea
                placeholder="描述"
                value={newJournal.description}
                onChange={(e) => setNewJournal((j) => ({ ...j, description: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
              />
              <input
                placeholder="图片URL（可选）"
                value={newJournal.imageUrl}
                onChange={(e) => setNewJournal((j) => ({ ...j, imageUrl: e.target.value }))}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
              <button
                onClick={handleJournalSubmit}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#4caf50',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                保存
              </button>
            </div>
          )}

          <div
            style={{
              columnCount: 'auto',
              columnWidth: '260px',
              columnGap: '16px',
            }}
          >
            {plot.journals.map((journal) => (
              <div
                key={journal.id}
                style={{
                  breakInside: 'avoid',
                  width: '260px',
                  borderRadius: '12px',
                  boxShadow: '0 3px 4px rgba(0,0,0,0.1)',
                  padding: '14px',
                  background: 'white',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {journal.cropVariety}
                </span>
                <p style={{ fontSize: '14px', color: '#424242', margin: '8px 0' }}>{journal.description}</p>
                {journal.imageUrl && (
                  <img
                    src={journal.imageUrl}
                    alt=""
                    style={{ width: '100%', borderRadius: '8px', height: 'auto' }}
                  />
                )}
                <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '4px' }}>
                  {dayjs(journal.createdAt).format('YYYY/MM/DD HH:mm')}
                </div>
              </div>
            ))}
          </div>
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
