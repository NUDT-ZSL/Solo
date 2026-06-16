import React, { useEffect, useState } from 'react';
import { GameStats } from '../../types';
import { playVictorySound, playDefeatSound, playClickSound } from '../audioUtils';

interface EndScreenProps {
  victory: boolean;
  stats: GameStats;
  onRestart: () => void;
  onLeaderboard: () => void;
  onSaveScore: (name: string) => void;
}

const EndScreen: React.FC<EndScreenProps> = ({
  victory,
  stats,
  onRestart,
  onLeaderboard,
  onSaveScore
}) => {
  const [playerName, setPlayerName] = useState('');
  const [saved, setSaved] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (victory) {
      playVictorySound();
    } else {
      playDefeatSound();
    }

    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [victory]);

  const handleSave = () => {
    if (playerName.trim() && !saved) {
      playClickSound();
      onSaveScore(playerName.trim());
      setSaved(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          border: `3px solid ${victory ? '#ffd700' : '#ef4444'}`,
          boxShadow: `0 0 40px ${victory ? 'rgba(255, 215, 0, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          maxWidth: 500,
          width: '90%',
          transform: showContent ? 'scale(1)' : 'scale(0.8)',
          opacity: showContent ? 1 : 0,
          transition: 'all 0.5s ease-out'
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 20 }}>
          {victory ? '🏆' : '💀'}
        </div>

        <h1
          style={{
            color: victory ? '#ffd700' : '#ef4444',
            fontSize: victory ? 42 : 36,
            margin: 0,
            marginBottom: 8,
            fontFamily: 'monospace',
            textShadow: victory
              ? '0 0 20px rgba(255, 215, 0, 0.5)'
              : '0 0 20px rgba(239, 68, 68, 0.5)'
          }}
        >
          {victory ? '你成功逃出地牢！' : '你倒下了...'}
        </h1>

        <p
          style={{
            color: '#d4a373',
            fontSize: 14,
            marginBottom: 30,
            fontFamily: 'monospace'
          }}
        >
          {victory ? '恭喜你战胜了骷髅领主！' : '地牢吞噬了又一位勇敢的探险者'}
        </p>

        <div
          style={{
            backgroundColor: '#0d0d15',
            borderRadius: 10,
            padding: 20,
            marginBottom: 24,
            border: '1px solid #3d3d3d'
          }}
        >
          <h3
            style={{
              color: '#d4a373',
              fontSize: 16,
              margin: 0,
              marginBottom: 16,
              fontFamily: 'monospace'
            }}
          >
            📊 探索统计
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }}
          >
            <div
              style={{
                backgroundColor: '#1e1e2e',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #3d3d3d'
              }}
            >
              <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
                👣 总步数
              </div>
              <div
                style={{
                  color: '#f5e6d3',
                  fontSize: 24,
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}
              >
                {stats.steps}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#1e1e2e',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #3d3d3d'
              }}
            >
              <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
                ⚔️ 击杀数
              </div>
              <div
                style={{
                  color: '#ef4444',
                  fontSize: 24,
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}
              >
                {stats.kills}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#1e1e2e',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #3d3d3d'
              }}
            >
              <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
                📦 宝箱数
              </div>
              <div
                style={{
                  color: '#ffd700',
                  fontSize: 24,
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}
              >
                {stats.chestsOpened}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#1e1e2e',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #3d3d3d'
              }}
            >
              <div style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
                🏅 结果
              </div>
              <div
                style={{
                  color: victory ? '#4ade80' : '#ef4444',
                  fontSize: 18,
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}
              >
                {victory ? '胜利' : '失败'}
              </div>
            </div>
          </div>
        </div>

        {!saved ? (
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入你的名字保存战绩"
              maxLength={12}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                backgroundColor: '#0d0d15',
                border: '1px solid #3d3d3d',
                color: '#f5e6d3',
                fontSize: 14,
                fontFamily: 'monospace',
                textAlign: 'center',
                marginBottom: 10,
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d4a373';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#3d3d3d';
              }}
            />
            <button
              onClick={handleSave}
              disabled={!playerName.trim()}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 6,
                backgroundColor: playerName.trim() ? '#d4a373' : '#3d3d3d',
                color: playerName.trim() ? '#1a1a2e' : '#666',
                border: 'none',
                fontSize: 13,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                cursor: playerName.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
            >
              💾 保存战绩
            </button>
          </div>
        ) : (
          <div
            style={{
              color: '#4ade80',
              fontSize: 14,
              marginBottom: 20,
              fontFamily: 'monospace'
            }}
          >
            ✅ 战绩已保存！
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              playClickSound();
              onRestart();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              backgroundColor: '#4ade80',
              color: '#1a1a2e',
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔄 再来一局
          </button>

          <button
            onClick={() => {
              playClickSound();
              onLeaderboard();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🏆 排行榜
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndScreen;
