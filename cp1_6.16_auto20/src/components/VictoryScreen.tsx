import React, { useEffect, useState, useCallback } from 'react';
import { MagicSpell } from '../data/GameData';

interface VictoryScreenProps {
  usedSpells: MagicSpell[];
  totalTurns: number;
  onRestart: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

function createParticles(count: number): Particle[] {
  const colors = ['#FFD700', '#66FCF1', '#45A29E', '#FFA500', '#FF6347'];
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: 60 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 6,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2
    });
  }
  return particles;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({ usedSpells, totalTurns, onRestart }) => {
  const [particles] = useState<Particle[]>(() => createParticles(40));

  return (
    <div className="victory-overlay">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}

      <div className="victory-title">胜利！</div>
      <div style={{ color: 'var(--accent-cyan)', marginTop: '12px', fontSize: '1.1rem' }}>
        在 {totalTurns} 个回合内击败了 3 只怪物
      </div>

      <div className="victory-spells">
        <h3>使用过的魔法组合</h3>
        <div className="victory-spell-list">
          {usedSpells.map((spell, i) => (
            <span key={`${spell.id}-${i}`} className="victory-spell-tag">
              {spell.name} (伤害:{spell.damage})
            </span>
          ))}
          {usedSpells.length === 0 && (
            <span style={{ opacity: 0.5 }}>无魔法记录</span>
          )}
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: '30px', padding: '12px 40px', fontSize: '1.1rem' }}
        onClick={onRestart}
      >
        再来一局
      </button>
    </div>
  );
};

export default VictoryScreen;
