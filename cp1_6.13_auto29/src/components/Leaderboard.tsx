import { useState, useEffect } from 'react';

interface ScoreRecord {
  _id: string;
  playerName: string;
  time: number;
  createdAt: string;
}

function Leaderboard() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/scores');
      const data = await response.json();
      setScores(data);
    } catch (e) {
      console.error('Failed to fetch scores:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>排行榜</h1>
      
      {loading ? (
        <p style={styles.loading}>加载中...</p>
      ) : scores.length === 0 ? (
        <p style={styles.empty}>暂无记录</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.headerCell}>排名</th>
                <th style={styles.headerCell}>玩家名</th>
                <th style={styles.headerCell}>用时</th>
                <th style={styles.headerCell}>完成时间</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr
                  key={score._id}
                  style={{
                    ...styles.row,
                    backgroundColor: index % 2 === 0 ? '#2d3748' : '#1a202c'
                  }}
                >
                  <td style={styles.cell}>
                    {index === 0 && <span style={styles.gold}>🥇</span>}
                    {index === 1 && <span style={styles.silver}>🥈</span>}
                    {index === 2 && <span style={styles.bronze}>🥉</span>}
                    {index > 2 && (index + 1)}
                  </td>
                  <td style={styles.cell}>{score.playerName}</td>
                  <td style={{ ...styles.cell, color: '#fbbf24' }}>
                    {formatTime(score.time)}
                  </td>
                  <td style={styles.cell}>{formatDate(score.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px',
    backgroundColor: '#1a202c',
    animation: 'fadeIn 0.3s ease-in-out',
    overflow: 'auto'
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#38bdf8',
    marginBottom: '32px'
  },
  loading: {
    color: '#94a3b8',
    fontSize: '18px'
  },
  empty: {
    color: 'white',
    fontSize: '18px',
    marginTop: '40px'
  },
  tableContainer: {
    width: '100%',
    maxWidth: '800px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    color: 'white'
  },
  headerRow: {
    backgroundColor: '#2d3748'
  },
  headerCell: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '14px',
    color: '#94a3b8',
    borderBottom: '2px solid #4a5568'
  },
  row: {
    height: '48px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  cell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e2e8f0'
  },
  gold: {
    fontSize: '18px'
  },
  silver: {
    fontSize: '18px'
  },
  bronze: {
    fontSize: '18px'
  }
};

export default Leaderboard;
