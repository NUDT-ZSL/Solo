import React, { useEffect, useState } from 'react';
import { playClickSound } from '../audioUtils';

interface MainMenuProps {
  onStart: () => void;
  onLeaderboard: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, onLeaderboard }) => {
  const [titleVisible, setTitleVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 200);
    setTimeout(() => setButtonsVisible(true), 600);
  }, []);

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
        boxSizing: 'border-box',
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(139, 0, 0, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(212, 163, 115, 0.1) 0%, transparent 50%)
        `
      }}
    >
      <div
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(-30px)',
          transition: 'all 0.6s ease-out',
          textAlign: 'center',
          marginBottom: 40
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 16 }}>
          🏰
        </div>
        <h1
          style={{
            color: '#d4a373',
            fontSize: 48,
            margin: 0,
            marginBottom: 8,
            fontFamily: 'monospace',
            letterSpacing: 4,
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}
        >
          地牢探险
        </h1>
        <p
          style={{
            color: '#888',
            fontSize: 16,
            margin: 0,
            fontFamily: 'monospace',
            letterSpacing: 2
          }}
        >
          DUNGEON ROGUELIKE
        </p>
      </div>

      <div
        style={{
          opacity: buttonsVisible ? 1 : 0,
          transform: buttonsVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 280
        }}
      >
        <button
          onClick={() => {
            playClickSound();
            onStart();
          }}
          style={{
            padding: '18px 32px',
            borderRadius: 10,
            backgroundColor: '#d4a373',
            color: '#1a1a2e',
            border: 'none',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 4px 16px rgba(212, 163, 115, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(212, 163, 115, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 163, 115, 0.3)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98) translateY(1px)';
          }}
        >
          ⚔️ 开始冒险
        </button>

        <button
          onClick={() => {
            playClickSound();
            onLeaderboard();
          }}
          style={{
            padding: '14px 32px',
            borderRadius: 10,
            backgroundColor: 'transparent',
            color: '#d4a373',
            border: '2px solid #d4a373',
            fontSize: 15,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(212, 163, 115, 0.1)';
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🏆 排行榜
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#555',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        <p>WASD 移动 | 遭遇怪物自动战斗 | 找到右下角的BOSS并击败它</p>
        <p style={{ marginTop: 4, fontSize: 11 }}>v1.0 - 随机生成地牢，每次都是新冒险</p>
      </div>
    </div>
  );
};

export default MainMenu;
