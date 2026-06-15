import { useState, useMemo, useCallback } from 'react';
import GamePage from './game/GamePage';
import ScoreBoard from './pages/ScoreBoard';
import { addScore } from './storage/ScoreStore';

type Page = 'menu' | 'game' | 'scores' | 'help';

interface StarDef {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function App() {
  const [page, setPage] = useState<Page>('menu');

  const stars = useMemo<StarDef[]>(() => {
    const arr: StarDef[] = [];
    for (let i = 0; i < 120; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        duration: 0.5 + Math.random() * 1.0,
        delay: Math.random() * 2,
      });
    }
    return arr;
  }, []);

  const handleGameOver = useCallback((score: number, kills: number, duration: number) => {
    const nickname = '匿名玩家';
    addScore(nickname, score, duration, kills);
  }, []);

  const handleGameOverWithNickname = useCallback((nickname: string, score: number, kills: number, duration: number) => {
    addScore(nickname, score, duration, kills);
  }, []);

  const renderStars = () => (
    <div className="stars-bg">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star-particle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--twinkle-duration': `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );

  if (page === 'game') {
    return (
      <div className="app-container">
        {renderStars()}
        <GamePage
          onGameOver={handleGameOverWithNickname}
          onBack={() => setPage('menu')}
        />
      </div>
    );
  }

  if (page === 'scores') {
    return (
      <div className="app-container">
        {renderStars()}
        <ScoreBoard onBack={() => setPage('menu')} />
      </div>
    );
  }

  if (page === 'help') {
    return (
      <div className="app-container">
        {renderStars()}
        <div className="help-container">
          <h2>游戏帮助</h2>
          <div className="help-content">
            <h3>操作说明</h3>
            <p>WASD / 方向键 — 移动飞船</p>
            <p>空格键 — 发射子弹</p>
            <h3>游戏规则</h3>
            <p>在太空中躲避小行星，同时发射子弹摧毁它们。大号小行星被击中后会分裂成两个更小的，最小的小行星被击碎则直接消失。</p>
            <h3>计分规则</h3>
            <p>击碎大号小行星（直径≥50px）：10分</p>
            <p>击碎小号小行星（直径&lt;50px）：20分</p>
            <h3>难度递增</h3>
            <p>每15秒从画布边缘生成一波新小行星。第1分钟每波1个，第2分钟每波2个，之后每波3个。</p>
            <h3>历史战绩</h3>
            <p>每局结束后可输入昵称保存战绩，最多保留20条记录。</p>
          </div>
          <button className="back-btn" onClick={() => setPage('menu')}>
            返回主菜单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {renderStars()}
      <div className="menu-container">
        <div className="menu-title">小行星躲避战</div>
        <button className="menu-btn" onClick={() => setPage('game')}>
          开始游戏
        </button>
        <button className="menu-btn" onClick={() => setPage('scores')}>
          战绩
        </button>
        <button className="menu-btn" onClick={() => setPage('help')}>
          帮助
        </button>
      </div>
    </div>
  );
}
