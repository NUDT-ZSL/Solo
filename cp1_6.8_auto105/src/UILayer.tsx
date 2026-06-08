import { useEffect, useState } from 'react';
import { GameState } from './GameEngine';
import { FlowerVariety } from './BloomCollector';

interface UILayerProps {
  state: GameState;
  onReset: () => void;
  onFlowerClick: (flower: FlowerVariety) => void;
  onCloseCard: () => void;
}

function UILayer({ state, onReset, onFlowerClick, onCloseCard }: UILayerProps) {
  const [scoreAnim, setScoreAnim] = useState(0);
  const [prevScore, setPrevScore] = useState(0);

  useEffect(() => {
    if (state.score !== prevScore) {
      setScoreAnim(state.score - prevScore);
      setPrevScore(state.score);
      const timer = setTimeout(() => setScoreAnim(0), 600);
      return () => clearTimeout(timer);
    }
  }, [state.score, prevScore]);

  const progressPct = state.totalFlowers > 0
    ? (state.unlockedCount >= state.totalFlowers ? 100 : (state.cycleCount / 10) * 100)
    : 0;

  const progressLabel = state.unlockedCount >= state.totalFlowers
    ? '✦ 全部解锁 ✦'
    : `下一个光之花: ${state.cycleCount} / 10`;

  return (
    <div className="ui-layer">
      <div className="top-bar">
        <div className="stats-panel">
          <div className="stat-row">
            <span className="stat-icon firefly-icon" />
            <span>萤火虫: {state.fireflyCount}</span>
          </div>
          <div className="stat-row">
            <span className="stat-icon flower-icon-small" />
            <span>光之花: {state.unlockedCount} / {state.totalFlowers}</span>
          </div>
        </div>

        <button className="reset-btn" onClick={onReset}>重置</button>
      </div>

      <div className="score-badge">
        ✦ {state.score}
        {scoreAnim > 0 && <span style={{ marginLeft: 4, color: '#ffe080' }}>+{scoreAnim}</span>}
      </div>

      <div className="progress-container">
        <div className="flower-dots">
          {state.flowers.map((f, i) => (
            <div
              key={i}
              className={`flower-dot ${f.unlocked ? 'unlocked' : ''}`}
              style={{
                background: f.unlocked
                  ? `radial-gradient(circle, ${f.color1}, ${f.color2})`
                  : undefined,
                '--dot-glow': f.glowColor,
              } as React.CSSProperties}
              onClick={() => f.unlocked && onFlowerClick(f)}
            />
          ))}
        </div>

        <div className="progress-bar-wrapper">
          <div
            className="progress-fill"
            style={{ width: `${progressPct}%` }}
          />
          <span className="progress-text">{progressLabel}</span>
        </div>
      </div>

      {state.showUnlock && state.newlyUnlocked && (
        <div className="unlock-notification">
          <h2 style={{ color: state.newlyUnlocked.color1 }}>
            ✦ 解锁了{state.newlyUnlocked.name} ✦
          </h2>
          <p>{state.newlyUnlocked.description}</p>
        </div>
      )}

      {state.showButterfly && (
        <div className="butterfly-hint">幻光蝶降临了荧光草甸……</div>
      )}

      {state.selectedFlower && (
        <div className="flower-card-overlay">
          <div className="flower-card-overlay-bg" onClick={onCloseCard} />
          <div
            className="flower-card"
            style={{ '--card-glow': state.selectedFlower.glowColor } as React.CSSProperties}
          >
            <div
              className="card-glow"
              style={{
                background: `radial-gradient(circle, ${state.selectedFlower.color1}, ${state.selectedFlower.color2})`,
              }}
            />
            <h3 style={{ color: state.selectedFlower.color1 }}>
              {state.selectedFlower.name}
            </h3>
            <p>{state.selectedFlower.description}</p>
            <button className="close-btn" onClick={onCloseCard}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UILayer;
