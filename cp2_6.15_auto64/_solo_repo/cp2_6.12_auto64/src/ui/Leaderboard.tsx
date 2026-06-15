import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  created_at: number;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newestId, setNewestId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/leaderboard');
        const data = res.data.data as ScoreEntry[];
        setScores(data);
        if (data.length > 0) {
          const latest = data.reduce((prev, curr) =>
            curr.created_at > prev.created_at ? curr : prev
          );
          setNewestId(latest.id);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxSizing: 'border-box',
  };

  const panelStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)',
    borderRadius: '16px',
    padding: '30px 40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 215, 0, 0.2)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    margin: 0,
  };

  const backBtnStyle: React.CSSProperties = {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  };

  const listHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 80px',
    padding: '10px 15px',
    color: '#aaa',
    fontSize: '13px',
    fontWeight: 'bold',
    borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const listContainerStyle: React.CSSProperties = {
    maxHeight: '500px',
    overflowY: 'auto',
  };

  const loadingStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    color: '#aaa',
    fontSize: '16px',
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    color: '#777',
    fontSize: '16px',
  };

  return (
    <div style={containerStyle}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={panelStyle}
      >
        <div style={headerStyle}>
          <h1 style={titleStyle}>🏆 排行榜</h1>
          <button
            onClick={() => navigate('/')}
            style={backBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4a90d9 0%, #6ab0ff 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← 返回游戏
          </button>
        </div>

        <div style={listHeaderStyle}>
          <span>排名</span>
          <span>昵称</span>
          <span style={{ textAlign: 'right' }}>分数</span>
        </div>

        <div style={listContainerStyle}>
          {loading ? (
            <div style={loadingStyle}>加载中...</div>
          ) : scores.length === 0 ? (
            <div style={emptyStyle}>暂无记录，快去创造第一个高分吧！</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {scores.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ x: -100, opacity: 0 }}
                  animate={{
                    x: 0,
                    opacity: 1,
                    backgroundColor: entry.id === newestId ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  }}
                  exit={{ x: 100, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    duration: 0.5,
                    delay: index * 0.05,
                    backgroundColor: { duration: 1.5, ease: 'easeOut' },
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 80px',
                    padding: '12px 15px',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    opacity: index % 2 === 0 ? 0.9 : 1.0,
                    borderRadius: '6px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#fff',
                      fontSize: index < 3 ? '18px' : '16px',
                      textShadow: index < 3 ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
                    }}
                  >
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <span
                    style={{
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: entry.id === newestId ? 'bold' : 'normal',
                    }}
                  >
                    {entry.name}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      textShadow: '0 0 8px rgba(255, 215, 0, 0.3)',
                    }}
                  >
                    {entry.score}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
