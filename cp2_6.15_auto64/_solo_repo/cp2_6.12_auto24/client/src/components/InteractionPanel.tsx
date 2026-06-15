import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  const startCooldown = (type: 'feed' | 'play' | 'train') => {
    const startTime = Date.now();

    setButtons((prev) => ({
      ...prev,
      [type]: { onCooldown: true, remaining: Math.ceil(COOLDOWN_MS / 1000) },
    }));

    if (timersRef.current[type]) {
      clearInterval(timersRef.current[type]);
    }

    timersRef.current[type] = setInterval(() => {
      const elapsed = Date.now() - startTime;
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
  };

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

  const renderButton = (type: 'feed' | 'play' | 'train', icon: string, label: string, hint: string) => {
    const { onCooldown, remaining } = buttons[type];
    const isDisabled = onCooldown || (type === 'train' && pet.happiness < 5);

    return (
      <button
        key={type}
        className={`action-btn ${type}-btn ${onCooldown ? 'cooldown' : ''} ${type === 'train' && pet.happiness < 5 ? 'disabled-action' : ''}`}
        onClick={() => handleClick(type)}
        disabled={isDisabled}
      >
        <span className="action-icon">{icon}</span>
        <span className="action-label">{label}</span>
        <span className="action-hint">{hint}</span>
        {onCooldown && (
          <span className="cooldown-overlay">{remaining}</span>
        )}
      </button>
    );
  };

  return (
    <div className="interaction-panel" style={{ background: panelBg() }}>
      {renderButton('feed', '🍖', '喂食', '饥饿+15')}
      {renderButton('play', '🎾', '玩耍', '快乐+10')}
      {renderButton('train', '💪', '训练', '健康+8 快乐-5')}
    </div>
  );
}
