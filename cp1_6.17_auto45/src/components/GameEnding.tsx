import { useMemo } from 'react';
import { useGameStore } from '../store';

export default function GameEnding() {
  const { resetGame } = useGameStore();

  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 400;
      return {
        id: i,
        sx: `${Math.cos(angle) * distance}px`,
        sy: `${Math.sin(angle) * distance}px`,
        delay: Math.random() * 1.5,
        size: 4 + Math.random() * 8,
        color: Math.random() > 0.5 ? '#FFD600' : '#E94560'
      };
    }), []);

  return (
    <div className="game-ending">
      <div className="ending-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className="ending-particle"
            style={{
              left: '50%',
              top: '50%',
              '--sx': p.sx,
              '--sy': p.sy,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`
            } as React.CSSProperties}
          />
        ))}
      </div>
      <h1 className="ending-title">ESCAPE</h1>
      <p className="ending-subtitle">你成功逃离了禁室！</p>
      <button className="ending-btn" onClick={resetGame}>
        🔄 再玩一次
      </button>
    </div>
  );
}
