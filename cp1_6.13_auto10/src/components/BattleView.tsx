import { useEffect, useRef, useState } from 'react';
import type {
  CombatFrame,
  CombatResult,
  Card,
  Enemy,
  PlayerState,
  StatusEffect,
} from '../types';
import { getRarityColor, getTypeIcon } from '../cardPool';

interface Props {
  result: CombatResult;
  player: PlayerState;
  enemy: Enemy;
  deck: Card[];
  speed?: number;
  onFinish: () => void;
}

function HpBar({ hp, max, color }: { hp: number; max: number; color: string }) {
  const pct = Math.max(0, (hp / max) * 100);
  return (
    <div className="hp-bar-wrap">
      <div className="hp-bar" style={{ width: `${pct}%`, background: color }} />
      <span className="hp-text">{hp} / {max}</span>
    </div>
  );
}

function Character({
  side,
  name,
  hp,
  maxHp,
  shield,
  statusEffects,
  floating,
  flashShield,
}: {
  side: 'player' | 'enemy';
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  statusEffects: StatusEffect[];
  floating?: { value: string; color: string };
  flashShield: boolean;
}) {
  return (
    <div className={`character ${side}`}>
      <div className={`char-body ${side} ${flashShield ? 'shield-flash' : ''}`}>
        <div className="char-face">{side === 'player' ? '🧙' : '👹'}</div>
        <div className="char-name-tag">{name}</div>
        {floating && <div className="floating-number" style={{ color: floating.color }}>{floating.value}</div>}
      </div>
      <div className="char-info">
        <HpBar hp={hp} max={maxHp} color={side === 'player' ? '#22c55e' : 'linear-gradient(90deg,#ef4444,#b91c1c)'} />
        {shield > 0 && <div className="shield-text">🛡 {shield}</div>}
        {statusEffects.length > 0 && (
          <div className="status-effects">
            {statusEffects.map((e, i) => (
              <span key={i} className={`status-chip ${e.type}`} title={`${e.type} Lv${e.value} 剩${e.duration}回合`}>
                {statusIcon(e.type)}{e.duration}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function statusIcon(t: StatusEffect['type']): string {
  const map: Record<StatusEffect['type'], string> = {
    burn: '🔥',
    freeze: '❄',
    poison: '☠',
    lifesteal: '🩸',
    regen: '💚',
    reflect: '🪞',
    double: '⚡',
    cleanse: '✨',
  };
  return map[t] || '？';
}

function CardView({
  card,
  active,
  animate,
}: {
  card: Card;
  active?: boolean;
  animate?: 'fly' | null;
}) {
  const borderColor = getRarityColor(card.rarity);
  return (
    <div
      className={`rc-card ${active ? 'active' : ''} ${animate === 'fly' ? 'flying' : ''}`}
      style={{ borderColor, boxShadow: `0 0 12px ${borderColor}55` }}
    >
      <div className="rc-card-cost">
        <div className="diamond"><span>{card.cost}</span></div>
      </div>
      <div className="rc-card-type">{getTypeIcon(card.type)}</div>
      <div className="rc-card-name">{card.name}</div>
      <div className="rc-card-desc">{card.desc}</div>
      <div className="rc-card-value">{card.value}</div>
    </div>
  );
}

export default function BattleView({
  result,
  player,
  enemy,
  deck,
  speed = 1,
  onFinish,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [flyingCard, setFlyingCard] = useState<{ card: Card; source: 'player' | 'enemy' } | null>(null);
  const prevCard = useRef<Card | undefined>(undefined);
  const finishedRef = useRef(false);

  const frame: CombatFrame | undefined = result.frames[idx];
  const lastFrame = result.frames[result.frames.length - 1];

  useEffect(() => {
    if (!frame) return;
    if (frame.activeCard && (!prevCard.current || prevCard.current.uid !== frame.activeCard.uid)) {
      prevCard.current = frame.activeCard;
      setFlyingCard({ card: frame.activeCard, source: frame.activeCardSource || 'player' });
      setTimeout(() => setFlyingCard(null), 500);
    }
    if (frame.log) {
      setLogs(prev => [...prev.slice(-20), frame.log]);
    }
  }, [frame]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (idx >= result.frames.length - 1) {
      finishedRef.current = true;
      const t = setTimeout(() => onFinish(), 1200);
      return () => clearTimeout(t);
    }
    const delay = Math.max(80, 650 / speed);
    const t = setTimeout(() => setIdx(i => i + 1), delay);
    return () => clearTimeout(t);
  }, [idx, result.frames.length, speed, onFinish]);

  if (!frame) return null;

  const playerShieldFlash =
    frame.playerShield > 0 && (idx === 0 || frame.playerShield !== (result.frames[idx - 1]?.playerShield ?? 0));

  const floatingPlayer =
    frame.floatingNumber?.position === 'player'
      ? { value: frame.floatingNumber.value, color: frame.floatingNumber.color }
      : undefined;
  const floatingEnemy =
    frame.floatingNumber?.position === 'enemy'
      ? { value: frame.floatingNumber.value, color: frame.floatingNumber.color }
      : undefined;

  const ended = idx >= result.frames.length - 1;

  return (
    <div className="battle-view">
      <div className="battle-arena">
        <Character
          side="player"
          name="冒险者"
          hp={frame.playerHp}
          maxHp={player.maxHp}
          shield={frame.playerShield}
          statusEffects={frame.playerStatusEffects}
          floating={floatingPlayer}
          flashShield={playerShieldFlash}
        />
        <div className="vs-zone">
          <div className="turn-indicator">回合 {Math.ceil((idx + 1) / (deck.length + 2))}</div>
          {ended && (
            <div className={`battle-end-badge ${result.victory ? 'win' : 'lose'}`}>
              {result.victory ? '胜 利' : '失 败'}
            </div>
          )}
        </div>
        <Character
          side="enemy"
          name={enemy.name}
          hp={frame.enemyHp}
          maxHp={enemy.maxHp}
          shield={frame.enemyShield}
          statusEffects={frame.enemyStatusEffects}
          floating={floatingEnemy}
          flashShield={false}
        />
        {flyingCard && (
          <div className={`flying-card-layer ${flyingCard.source}`}>
            <CardView card={flyingCard.card} animate="fly" />
          </div>
        )}
      </div>

      <div className="deck-and-log">
        <div className="deck-rail">
          {deck.map((c, i) => (
            <CardView
              key={c.uid || c.id + i}
              card={c}
              active={frame.activeCard?.uid === c.uid}
            />
          ))}
        </div>
        <div className="battle-log">
          {logs.slice(-5).map((l, i) => (
            <div key={i} className="log-line">{l}</div>
          ))}
        </div>
      </div>
      {ended && lastFrame && (
        <div className="battle-summary">
          <strong>{result.summary}</strong>
        </div>
      )}
    </div>
  );
}
