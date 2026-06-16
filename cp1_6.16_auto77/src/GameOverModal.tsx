import React from 'react';

interface GameOverModalProps {
  score: number;
  wave: number;
  merges: number;
  luck: number;
  leaderboard: any[];
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  wave,
  merges,
  luck,
  leaderboard,
  onRestart,
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(5px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
        borderRadius: 16,
        padding: 30,
        maxWidth: 450,
        width: '90%',
        border: '2px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.1)',
        animation: 'modal-appear 0.3s ease-out',
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#FFD700',
          fontSize: 28,
          margin: '0 0 20px 0',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
        }}>游戏结束</h2>

        <div style={{
          textAlign: 'center',
          marginBottom: 25,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h3 style={{
            color: '#ccc',
            fontSize: 14,
            margin: '0 0 10px 0',
            fontWeight: 'normal',
          }}>本次得分</h3>
          <div style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#FFD700',
            textShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
            marginBottom: 15,
          }}>{score}</div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 13,
            color: '#aaa',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
              <span>波次 ({wave}波 × 50)</span>
              <span>{wave * 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
              <span>合成 ({merges}次 × 10)</span>
              <span>{merges * 10}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
              <span>气运值 ({luck} × 2)</span>
              <span>{luck * 2}</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{
            color: '#FFD700',
            fontSize: 18,
            margin: '0 0 15px 0',
            textAlign: 'center',
          }}>排行榜</h3>
          <div style={{
            maxHeight: 250,
            overflowY: 'auto',
            marginBottom: 20,
          }}>
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div key={entry.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: 4,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 6,
                transition: 'background 0.2s ease',
              }}>
                <span style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  fontWeight: 'bold',
                  fontSize: 12,
                  marginRight: 12,
                  background: index === 0
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : index === 1
                    ? 'linear-gradient(135deg, #BDC3C7 0%, #95A5A6 100%)'
                    : index === 2
                    ? 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: index < 3 ? '#1A1A2E' : '#888',
                }}>{index + 1}</span>
                <span style={{
                  flex: 1,
                  color: '#ddd',
                  fontSize: 14,
                }}>{entry.name}</span>
                <span style={{
                  color: '#FFD700',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          style={{
            width: '100%',
            padding: 14,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1A1A2E',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
          }}
          onClick={onRestart}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
          }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
