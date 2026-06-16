import React, { useEffect, useRef } from 'react';
import { Monster, elementInfo, ElementType } from '../data/GameData';

interface MonsterPanelProps {
  monster: Monster | null;
  isHit: boolean;
  damagePopup: { damage: number; isCritical: boolean; isResisted: boolean } | null;
}

const PIXEL_ICONS: Record<string, string> = {
  '🔥_SLIME': '🟠🟠🟠\n🟠😎🟠\n🟠🟠🟠',
  '🦀_CRAB': '🦀🦀🦀\n🦀👀🦀\n🦀🦀🦀',
  '🌬️_SPIRIT': '🌀🌀🌀\n🌀👻🌀\n🌀🌀🌀',
  '🗿_GIANT': '🪨🪨🪨\n🪨😠🪨\n🪨🪨🪨',
  '👤_SHADOW': '🌑🌑🌑\n🌑👁🌑\n🌑🌑🌑',
  '☀️_GUARDIAN': '🌟🌟🌟\n🌟😇🌟\n🌟🌟🌟'
};

function getHpClass(ratio: number): string {
  if (ratio > 0.6) return 'high';
  if (ratio > 0.3) return 'mid';
  return 'low';
}

function getPixelIcon(iconKey: string): string {
  return PIXEL_ICONS[iconKey] || '❓❓❓\n❓💀❓\n❓❓❓';
}

const MonsterPanel: React.FC<MonsterPanelProps> = ({ monster, isHit, damagePopup }) => {
  const logListRef = useRef<HTMLDivElement>(null);

  if (!monster) {
    return (
      <div className="monster-panel">
        <div className="glass-container" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '3rem', opacity: 0.3 }}>⚔️</div>
          <div style={{ color: 'var(--text-primary)', opacity: 0.4, marginTop: '8px' }}>等待怪物出现...</div>
        </div>
      </div>
    );
  }

  const hpRatio = monster.currentHp / monster.maxHp;
  const info = elementInfo[monster.element];

  return (
    <div className="monster-panel">
      <div className="glass-container">
        <div className="section-title">怪物</div>
        <div className={`monster-icon-container ${isHit ? 'monster-hit' : ''}`}>
          <div className="monster-pixel-icon">
            <div className="monster-body">
              <pre style={{
                fontFamily: 'monospace',
                fontSize: '1.5rem',
                lineHeight: '1.3',
                textAlign: 'center',
                filter: `drop-shadow(0 0 10px ${info.color})`
              }}>
                {getPixelIcon(monster.icon)}
              </pre>
            </div>
          </div>
          <div className="monster-name">{monster.name}</div>
          <span
            className="monster-element-tag"
            style={{
              background: `${info.color}33`,
              color: info.color,
              border: `1px solid ${info.color}66`
            }}
          >
            {info.symbol} {info.name}属性
          </span>

          {damagePopup && (
            <div
              className={`damage-popup ${damagePopup.isCritical ? 'critical' : damagePopup.isResisted ? 'resisted' : ''}`}
              style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}
            >
              -{damagePopup.damage}
            </div>
          )}
        </div>

        <div style={{ marginTop: '8px' }}>
          <div className="hp-label">
            <span>HP</span>
            <span>{monster.currentHp} / {monster.maxHp}</span>
          </div>
          <div className="hp-bar-container">
            <div
              className={`hp-bar ${getHpClass(hpRatio)}`}
              style={{ width: `${hpRatio * 100}%` }}
            />
          </div>
        </div>

        <div className="resistance-weakness">
          <div>
            <span className="label">抗性 </span>
            {monster.resistances.map(r => (
              <span key={r} className="value resist" style={{ marginRight: '4px' }}>
                ▲{elementInfo[r].name}
              </span>
            ))}
          </div>
          <div>
            <span className="label">弱点 </span>
            {monster.weaknesses.map(w => (
              <span key={w} className="value weak" style={{ marginRight: '4px' }}>
                ▼{elementInfo[w].name}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '0.8rem', textAlign: 'center', opacity: 0.6 }}>
          攻击力：{monster.attack}
        </div>
      </div>
    </div>
  );
};

export default MonsterPanel;
