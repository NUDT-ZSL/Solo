import { useState, useEffect } from 'react';

interface LobbyPageProps {
  onStartMatch: (name: string) => void;
  isMatching: boolean;
}

export default function LobbyPage({ onStartMatch, isMatching }: LobbyPageProps) {
  const [playerName, setPlayerName] = useState('');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isMatching) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [isMatching]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && !isMatching) {
      onStartMatch(playerName.trim());
    }
  };

  return (
    <div className="lobby-page">
      <div className="lobby-content">
        <h1 className="game-title">ChainReactor</h1>
        <p className="game-subtitle">六边形策略对战</p>
        
        <div className="lobby-card">
          {!isMatching ? (
            <form onSubmit={handleSubmit} className="lobby-form">
              <div className="form-group">
                <label htmlFor="playerName">输入昵称</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="请输入你的昵称"
                  maxLength={12}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="match-button"
                disabled={!playerName.trim()}
              >
                快速匹配
              </button>
            </form>
          ) : (
            <div className="matching-status">
              <div className="matching-spinner"></div>
              <p className="matching-text">
                正在寻找对手{dots}
              </p>
              <p className="matching-hint">请稍候，另一名玩家即将加入</p>
            </div>
          )}
        </div>

        <div className="game-rules">
          <h3>游戏规则</h3>
          <ul>
            <li>🔥 <strong>火塔</strong>：对相邻敌方格子造成伤害并占领</li>
            <li>❄️ <strong>冰塔</strong>：使相邻敌方塔行动间隔延长</li>
            <li>⚡ <strong>电塔</strong>：可对2格内的敌方塔造成连锁伤害</li>
            <li>🎯 放置塔消耗1能量，升级消耗2能量</li>
            <li>🏆 20回合后占领格子多者获胜</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
