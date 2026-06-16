import React, { useEffect, useState } from 'react';
import { GameStats } from '../../types';
import { playClickSound } from '../audioUtils';

interface LeaderboardProps {
  onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [scores, setScores] = useState<GameStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setScores(data.scores || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load leaderboard:', err);
        setLoading(false);
      });
  }, []);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 16,
          padding: 30,
          maxWidth: 600,
          width: '100%',
          border: '2px solid #d4a373',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            gap: 12
          }}
        >
          <span style={{ fontSize: 32 }}>🏆</span>
          <h1
            style={{
              color: '#ffd700',
              fontSize: 28,
              margin: 0,
              fontFamily: 'monospace',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
            }}
          >
            荣誉殿堂
          </h1>
          <span style={{ fontSize: 32 }}>🏆</span>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: '#888',
              fontFamily: 'monospace'
            }}
          >
            加载中...
          </div>
        ) : scores.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: '#666',
              fontFamily: 'monospace'
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
            <p>还没有任何记录</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>成为第一个征服地牢的勇士吧！</p>
          </div>
        ) : (
          <div
            style={{
              maxHeight: 400,
              overflowY: 'auto',
              marginBottom: 20
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid #3d3d3d',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#1a1a2e'
                  }}
                >
                  <th
                    style={{
                      padding: '10px 8px',
                      color: '#d4a373',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      textAlign: 'left'
                    }}
                  >
                    排名
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      color: '#d4a373',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      textAlign: 'left'
                    }}
                  >
                    玩家
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      color: '#d4a373',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}
                  >
                    击杀
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      color: '#d4a373',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}
                  >
                    宝箱
                  </th>
                  <th
                    style={{
                      padding: '10px 8px',
                      color: '#d4a373',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}
                  >
                    结果
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #2d2d2d',
                      backgroundColor: index < 3 ? 'rgba(255, 215, 0, 0.05)' : 'transparent'
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 8px',
                        color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#888',
                        fontSize: 16,
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                      }}
                    >
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        color: '#f5e6d3',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                      }}
                    >
                      {score.playerName}
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        color: '#ef4444',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        textAlign: 'center'
                      }}
                    >
                      {score.kills}
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        color: '#ffd700',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        textAlign: 'center'
                      }}
                    >
                      {score.chestsOpened}
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        color: score.victory ? '#4ade80' : '#ef4444',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        textAlign: 'center'
                      }}
                    >
                      {score.victory ? '✓ 通关' : '✗ 失败'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={() => {
            playClickSound();
            onBack();
          }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            backgroundColor: '#d4a373',
            color: '#1a1a2e',
            border: 'none',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 163, 115, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ← 返回主菜单
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
