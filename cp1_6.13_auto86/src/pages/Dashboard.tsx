import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Stats {
  totalEvents: number;
  totalMessages: number;
  newFans: number;
}

const containerStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '40px 24px',
};

const headerStyle: React.CSSProperties = {
  marginBottom: 40,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: 8,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#64748b',
};

const statsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  flexWrap: 'wrap',
  marginBottom: 60,
};

const statCardStyle: React.CSSProperties = {
  width: 240,
  height: 120,
  background: '#1e293b',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
  marginBottom: 8,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: '#38bdf8',
};

const svgLineStyle: React.CSSProperties = {
  height: 120,
  width: 60,
  flexShrink: 0,
};

const formSectionStyle: React.CSSProperties = {
  background: '#1e1b4b',
  borderRadius: 16,
  padding: 32,
  marginBottom: 40,
};

const formTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#e2e8f0',
  marginBottom: 24,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: '#0f0e17',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s ease-in-out',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  color: 'white',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
};

function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, totalMessages: 0, newFans: 0 });
  const [form, setForm] = useState({ name: '', date: '', time: '', location: '', price: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    axios.get('/api/stats').then((res) => setStats(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await axios.post('/api/events', { ...form, price: Number(form.price) });
      setForm({ name: '', date: '', time: '', location: '', price: '' });
      axios.get('/api/stats').then((res) => setStats(res.data));
    } catch (err) {
      alert('创建失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>仪表盘</h1>
        <p style={subtitleStyle}>乐队数据概览与后台管理</p>
      </div>

      <div style={statsContainerStyle}>
        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px rgba(56, 189, 248, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div style={statLabelStyle}>总演出数</div>
          <div style={statValueStyle}>{stats.totalEvents}</div>
        </div>

        <svg style={svgLineStyle} viewBox="0 0 60 120">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <g style={{ transformOrigin: '50% 50%', animation: 'spin3d 6s ease-in-out infinite' }}>
            <path
              d="M30 10 Q45 30 30 60 Q15 90 30 110"
              stroke="url(#lineGrad)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="30" cy="10" r="5" fill="#a78bfa" />
            <circle cx="30" cy="110" r="5" fill="#38bdf8" />
          </g>
        </svg>

        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px rgba(56, 189, 248, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div style={statLabelStyle}>总留言数</div>
          <div style={statValueStyle}>{stats.totalMessages}</div>
        </div>

        <svg style={svgLineStyle} viewBox="0 0 60 120">
          <g style={{ transformOrigin: '50% 50%', animation: 'spin3d 6s ease-in-out infinite', animationDelay: '1s' }}>
            <path
              d="M30 10 Q15 30 30 60 Q45 90 30 110"
              stroke="url(#lineGrad)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="30" cy="10" r="5" fill="#a78bfa" />
            <circle cx="30" cy="110" r="5" fill="#38bdf8" />
          </g>
        </svg>

        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px rgba(56, 189, 248, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div style={statLabelStyle}>近7天新增粉丝</div>
          <div style={statValueStyle}>{stats.newFans}</div>
        </div>
      </div>

      <div style={formSectionStyle}>
        <h2 style={formTitleStyle}>➕ 创建新演出</h2>
        <form onSubmit={handleSubmit}>
          <div style={gridStyle}>
            <input
              type="text"
              placeholder="演出名称"
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="date"
              style={inputStyle}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <input
              type="time"
              style={inputStyle}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="演出地点"
              style={inputStyle}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="票价 (元)"
              style={inputStyle}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
          <button type="submit" style={submitBtnStyle} disabled={uploading}>
            {uploading ? '创建中...' : '创建演出'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin3d {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
