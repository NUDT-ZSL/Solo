import { useState, useEffect, useCallback, useRef } from 'react';
import { PetState } from '../types';

interface InteractionPanelProps {
  onAction: (type: 'feed' | 'play' | 'train') => void;
  pet: PetState;
}

const COOLDOWN_MS = 5000;

interface ButtonState {
  onCooldown: boolean;
  remaining: number;
}

export default function InteractionPanel({ onAction, pet }: InteractionPanelProps) {
  const [buttons, setButtons] = useState<Record<'feed' | 'play' | 'train', ButtonState>>({
    feed: { onCooldown: false, remaining: 0 },
    play: { onCooldown: false, remaining: 0 },
    train: { onCooldown: false, remaining: 0 },
  });

  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const startCooldown = useCallback((type: 'feed' | 'play' | 'train') => {
    const start = Date.now();
    setButtons((prev) => ({
      ...prev,
      [type]: { onCooldown: true, remaining: COOLDOWN_MS / 1000 },
    }));

    if (timersRef.current[type]) clearInterval(timersRef.current[type]);

    timersRef.current[type] = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, COOLDOWN_MS - elapsed);
      if (remaining <= 0) {
        clearInterval(timersRef.current[type]);
        setButtons((prev) => ({
          ...prev,
          [type]: { onCooldown: false, remaining: 0 },
        }));
      } else {
        setButtons((prev) => ({
          ...prev,
          [type]: { onCooldown: true, remaining: Math.ceil(remaining / 1000) },
        }));
      }
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  const handleClick = (type: 'feed' | 'play' | 'train') => {
    if (buttons[type].onCooldown) return;
    if (type === 'train' && pet.happiness < 5) return;
    startCooldown(type);
    onAction(type);
  };

  const panelBg = () => {
    if (pet.health < 20) return 'rgba(255, 107, 107, 0.1)';
    if (pet.hunger < 20) return 'rgba(255, 169, 77, 0.1)';
    if (pet.happiness > 60) return 'rgba(107, 203, 119, 0.1)';
    return 'rgba(255, 255, 255, 0.6)';
  };

  return (
    <div className="interaction-panel" style={{ background: panelBg() }}>
      <button
        className={`action-btn feed-btn ${buttons.feed.onCooldown ? 'cooldown' : ''}`}
        onClick={() => handleClick('feed')}
        disabled={buttons.feed.onCooldown}
      >
        <span className="action-icon">🍖</span>
        <span className="action-label">喂食</span>
        <span className="action-hint">饥饿+15</span>
        {buttons.feed.onCooldown && (
          <span className="cooldown-overlay">{buttons.feed.remaining}</span>
        )}
      </button>
      <button
        className={`action-btn play-btn ${buttons.play.onCooldown ? 'cooldown' : ''}`}
        onClick={() => handleClick('play')}
        disabled={buttons.play.onCooldown}
      >
        <span className="action-icon">🎾</span>
        <span className="action-label">玩耍</span>
        <span className="action-hint">快乐+10</span>
        {buttons.play.onCooldown && (
          <span className="cooldown-overlay">{buttons.play.remaining}</span>
        )}
      </button>
      <button
        className={`action-btn train-btn ${buttons.train.onCooldown ? 'cooldown' : ''} ${pet.happiness < 5 ? 'disabled-action' : ''}`}
        onClick={() => handleClick('train')}
        disabled={buttons.train.onCooldown || pet.happiness < 5}
      >
        <span className="action-icon">💪</span>
        <span className="action-label">训练</span>
        <span className="action-hint">健康+8 快乐-5</span>
        {buttons.train.onCooldown && (
          <span className="cooldown-overlay">{buttons.train.remaining}</span>
        )}
      </button>
    </div>
  );
}
