import React from 'react';
import type { GameSnapshot } from '@/types';

interface ScoreBoardProps {
  gameState: GameSnapshot;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ gameState }) => {
  const { score, combo, comboMultiplier, offeringProgress, gameState: state } = gameState;

  const comboColor = combo >= 5 ? '#ffaa00' : '#bb9944';
  const comboShadow = combo >= 5 ? '0 0 0.5px #ffaa00, 0 0 1px #ffaa00' : 'none';

  const offeringColor = offeringProgress > 60
    ? `rgb(255, ${Math.floor(170 - (offeringProgress - 60) * 2.83)}, 0)`
    : `rgb(255, 170, 0)`;

  const displayScore = gameState.gameState === 'victory' || gameState.gameState === 'defeat'
    ? gameState.finalScore
    : score;

  let statusText = '';
  let statusColor = '#8b7355';
  if (state === 'playing') {
    statusText = '运行中';
    statusColor = '#44bb44';
  } else if (state === 'paused') {
    statusText = '暂停中';
    statusColor = '#ffbb33';
  } else if (state === 'victory') {
    statusText = '胜利';
    statusColor = '#ffd700';
  } else if (state === 'defeat') {
    statusText = '失败';
    statusColor = '#ff4444';
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 10, 0.85)',
        borderRadius: '12px',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        border: '2px solid #3a2a1a',
        boxShadow: 'inset 0 0 20px rgba(58, 42, 26, 0.5), 0 4px 20px rgba(0, 0, 0, 0.5)',
        fontFamily: "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif",
        zIndex: 10,
      }}
    >
      {statusText && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '12px',
              color: '#8b7355',
              marginBottom: '4px',
              letterSpacing: '2px',
            }}
          >
            状态
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: statusColor,
              minWidth: '60px',
            }}
          >
            {statusText}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#8b7355',
            marginBottom: '4px',
            letterSpacing: '2px',
          }}
        >
          分数
        </div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#e0c080',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
            minWidth: '120px',
          }}
        >
          {displayScore.toLocaleString()}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#8b7355',
            marginBottom: '4px',
            letterSpacing: '2px',
          }}
        >
          连击
        </div>
        <div
          style={{
            fontSize: '24px',
            color: comboColor,
            textShadow: comboShadow,
            minWidth: '60px',
            transition: 'all 0.2s ease',
          }}
        >
          {combo}
        </div>
      </div>

      {comboMultiplier > 1 && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '12px',
              color: '#8b7355',
              marginBottom: '4px',
              letterSpacing: '2px',
            }}
          >
            倍数
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#ff6600',
              fontWeight: 'bold',
              animation: 'pulse 0.5s ease infinite',
            }}
          >
            x{comboMultiplier}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#8b7355',
            marginBottom: '4px',
            letterSpacing: '2px',
          }}
        >
          祭品
        </div>
        <div
          style={{
            width: '200px',
            height: '16px',
            background: '#2a1a0a',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #3a2a1a',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${offeringProgress}%`,
              background: `linear-gradient(90deg, #ffaa00, ${offeringColor})`,
              borderRadius: '8px',
              transition: 'width 0.2s ease, background 0.3s ease',
              boxShadow: '0 0 10px rgba(255, 170, 0, 0.5)',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};
