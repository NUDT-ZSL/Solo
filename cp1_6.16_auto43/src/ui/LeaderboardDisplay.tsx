import React from 'react';
import { LeaderboardDisplayEntry } from '../player/Leaderboard';

interface LeaderboardDisplayProps {
  entries: LeaderboardDisplayEntry[];
}

const PLAYER_COLORS: Record<string, string> = {
  '玩家1': '#FF6B6B',
  '玩家2': '#4ECDC4',
  '玩家3': '#FFE66D',
};

export const LeaderboardDisplay: React.FC<LeaderboardDisplayProps> = ({ entries }) => {
  const top3 = entries.slice(0, 3);

  const getRankStyle = (rank: number): React.CSSProperties => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    return {
      color: colors[rank - 1] || '#C5C6C7',
      fontWeight: 'bold',
      marginRight: '8px',
      width: '24px',
      textAlign: 'center',
    };
  };

  const getPlayerColor = (name: string): string => {
    return PLAYER_COLORS[name] || '#C5C6C7';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '200px',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          color: '#66FCF1',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '16px',
          textAlign: 'center',
        }}
      >
        🏆 排行榜
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {top3.map((entry) => (
          <div
            key={entry.playerId}
            className={entry.isLocalPlayer ? 'leaderboard-row local-player' : 'leaderboard-row'}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '6px',
              background: entry.isLocalPlayer ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
              borderLeft: entry.isLocalPlayer ? '3px solid #FFD700' : '3px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={getRankStyle(entry.rank)}>{entry.rank}</span>
            <span
              style={{
                color: getPlayerColor(entry.name),
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '13px',
                flex: 1,
                fontWeight: entry.isLocalPlayer ? 'bold' : 'normal',
              }}
            >
              {entry.name}
            </span>
            <span
              style={{
                color: '#FFD700',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              {entry.mineralCount}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .leaderboard-row.local-player {
          animation: pulseHighlight 2s ease-in-out infinite;
        }
        @keyframes pulseHighlight {
          0%, 100% { background: rgba(255, 215, 0, 0.15); }
          50% { background: rgba(255, 215, 0, 0.25); }
        }
      `}</style>
    </div>
  );
};
