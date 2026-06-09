import React from 'react';

export interface UIProps {
  currentLevel: number;
  totalLevels: number;
  timeElapsed: number;
  totalStars: number;
  connectedCount: number;
  totalRunes: number;
  streak: number;
  onReset: () => void;
  gameOver: boolean;
  finalScore: number;
  finalStars: number;
  levelStars: number[];
  onRestart: () => void;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const Star: React.FC<{ filled: boolean; size?: number; style?: React.CSSProperties }> = ({
  filled,
  size = 18,
  style
}) => {
  const color = filled ? '#FFD700' : '#333344';
  const glow = filled ? '0 0 8px #FFD700' : 'none';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        ...style,
        filter: filled ? `drop-shadow(${glow})` : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
        stroke={filled ? '#FFA500' : '#222233'}
        strokeWidth="1"
      />
    </svg>
  );
};

export const UI: React.FC<UIProps> = ({
  currentLevel,
  totalLevels,
  timeElapsed,
  totalStars,
  connectedCount,
  totalRunes,
  streak,
  onReset,
  gameOver,
  finalScore,
  finalStars,
  levelStars,
  onRestart
}) => {
  const progressIcons = [];
  for (let i = 0; i < totalRunes; i++) {
    const lit = i < connectedCount;
    progressIcons.push(
      <div
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: lit
            ? 'linear-gradient(135deg, #33FF66, #3399FF)'
            : 'rgba(100,120,150,0.3)',
          border: lit ? '1px solid #33FF66' : '1px solid rgba(100,120,150,0.5)',
          boxShadow: lit ? '0 0 6px #33FF66' : 'none',
          transform: lit ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}
      />
    );
  }

  if (gameOver) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,46,0.92)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(26,26,62,0.95) 0%, rgba(15,15,55,0.98) 100%)',
            border: '2px solid rgba(102,153,255,0.3)',
            borderRadius: 16,
            padding: '40px 56px',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(102,153,255,0.2)',
            maxWidth: '90%'
          }}
        >
          <h2
            style={{
              fontFamily: 'Arial Black, sans-serif',
              fontSize: 32,
              color: '#FFFFFF',
              marginBottom: 8,
              textShadow: '0 2px 10px rgba(102,153,255,0.5)'
            }}
          >
            通关完成！
          </h2>
          <p
            style={{
              color: '#99AACC',
              fontSize: 14,
              marginBottom: 24
            }}
          >
            恭喜你完成了所有符咒编织
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 20
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} filled={i < finalStars} size={32} />
            ))}
          </div>

          <div
            style={{
              background: 'rgba(20,20,60,0.6)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#AABBCC' }}>总用时</span>
              <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{formatTime(timeElapsed)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#AABBCC' }}>总得分</span>
              <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{finalScore}</span>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#8899BB', fontSize: 13, marginBottom: 8 }}>各关卡星级</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {levelStars.map((stars, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#778899',
                      marginBottom: 4
                    }}
                  >
                    第{idx + 1}关
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    {Array.from({ length: 3 }).map((_, si) => (
                      <Star key={si} filled={si < stars} size={16} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onRestart}
            style={{
              background: 'linear-gradient(135deg, #3399FF 0%, #6666FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 36px',
              borderRadius: 25,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif',
              boxShadow: '0 4px 15px rgba(51,153,255,0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(51,153,255,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(51,153,255,0.4)';
            }}
          >
            再玩一次
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'rgba(26,26,62,0.8)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid rgba(51,68,85,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1
            style={{
              fontFamily: 'Arial Black, sans-serif',
              fontSize: 24,
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(102,153,255,0.4)',
              margin: 0
            }}
          >
            符咒·光影编织
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 2
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} filled={i < totalStars} />
            ))}
          </div>
          <div
            style={{
              color: '#7788AA',
              fontSize: 13,
              padding: '4px 10px',
              background: 'rgba(51,68,85,0.4)',
              borderRadius: 12,
              border: '1px solid rgba(102,153,255,0.2)'
            }}
          >
            第 {currentLevel}/{totalLevels} 关
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {streak >= 3 && (
            <div
              style={{
                color: '#FFD700',
                fontSize: 12,
                padding: '4px 10px',
                background: 'rgba(255,215,0,0.1)',
                borderRadius: 12,
                border: '1px solid rgba(255,215,0,0.3)',
                fontWeight: 'bold',
                textShadow: '0 0 8px rgba(255,215,0,0.4)'
              }}
            >
              🔥 连击 x{streak}
            </div>
          )}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 22,
              color: '#EEEEEE',
              fontWeight: 'bold',
              letterSpacing: 2,
              textShadow: '0 0 10px rgba(170,200,255,0.5)',
              padding: '6px 16px',
              background: 'rgba(51,68,85,0.5)',
              borderRadius: 8,
              border: '1px solid rgba(102,153,255,0.2)',
              minWidth: 90,
              textAlign: 'center'
            }}
          >
            {formatTime(timeElapsed)}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
          padding: '10px 14px',
          background: 'rgba(26,26,62,0.7)',
          borderRadius: 10,
          border: '1px solid rgba(51,68,85,0.4)',
          maxWidth: '50%',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ color: '#8899BB', fontSize: 12, marginRight: 4, whiteSpace: 'nowrap' }}>
          进度
        </span>
        <div
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap'
          }}
        >
          {progressIcons}
        </div>
        <span style={{ color: '#AABBCC', fontSize: 12, marginLeft: 6 }}>
          {connectedCount}/{totalRunes}
        </span>
      </div>

      <button
        onClick={onReset}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 10,
          background: 'linear-gradient(135deg, rgba(51,153,255,0.3) 0%, rgba(102,102,255,0.3) 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(102,153,255,0.5)',
          padding: '10px 20px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 2px 10px rgba(51,153,255,0.15)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(51,153,255,0.35)';
          e.currentTarget.style.borderColor = 'rgba(150,200,255,0.8)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(51,153,255,0.15)';
          e.currentTarget.style.borderColor = 'rgba(102,153,255,0.5)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        重置本关
      </button>
    </>
  );
};

export default UI;
