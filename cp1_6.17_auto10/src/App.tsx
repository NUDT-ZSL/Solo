import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PetStats, PetAction, FloatingText } from './types';
import PetDisplay from './PetDisplay';
import ControlPanel from './ControlPanel';
import './App.css';

const INITIAL_STATS: PetStats = {
  health: 100,
  hunger: 100,
  happiness: 100,
  cleanliness: 100,
};

const DECAY_RATES: Record<keyof PetStats, number> = {
  health: 0.2,
  hunger: 0.3,
  happiness: 0.1,
  cleanliness: 0.2,
};

const ACTION_EFFECTS: Record<PetAction, { type: keyof PetStats; value: number }> = {
  [PetAction.FEED]: { type: 'hunger', value: 15 },
  [PetAction.PLAY]: { type: 'happiness', value: 20 },
  [PetAction.CLEAN]: { type: 'cleanliness', value: 30 },
  [PetAction.MEDICINE]: { type: 'health', value: 25 },
};

const STAT_LABELS: Record<keyof PetStats, string> = {
  health: '生命值',
  hunger: '饱食度',
  happiness: '心情',
  cleanliness: '清洁度',
};

const STAT_COLORS: Record<keyof PetStats, string> = {
  health: '#E74C3C',
  hunger: '#F39C12',
  happiness: '#3498DB',
  cleanliness: '#2ECC71',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const App: React.FC = () => {
  const [stats, setStats] = useState<PetStats>(INITIAL_STATS);
  const [currentAction, setCurrentAction] = useState<PetAction | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isDead, setIsDead] = useState(false);
  const floatingIdRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addFloatingText = useCallback((type: keyof PetStats, value: number) => {
    const id = ++floatingIdRef.current;
    setFloatingTexts((prev) => [...prev, { id, type, value }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== id));
    }, 600);
  }, []);

  const handleAction = useCallback(
    (action: PetAction) => {
      if (isDead) return;

      const effect = ACTION_EFFECTS[action];
      setStats((prev) => {
        const newValue = clamp(prev[effect.type] + effect.value, 0, 100);
        const actualGain = newValue - prev[effect.type];
        if (actualGain > 0) {
          addFloatingText(effect.type, actualGain);
        }
        return { ...prev, [effect.type]: newValue };
      });

      setCurrentAction(action);
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
      actionTimeoutRef.current = setTimeout(() => {
        setCurrentAction(null);
      }, 300);
    },
    [isDead, addFloatingText]
  );

  useEffect(() => {
    let animationFrameId: number;
    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (deltaTime > 0.1) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      setStats((prev) => {
        if (prev.health <= 0) return prev;

        const anyZero =
          prev.hunger <= 0 || prev.happiness <= 0 || prev.cleanliness <= 0;

        const newStats: PetStats = { ...prev };

        (Object.keys(newStats) as (keyof PetStats)[]).forEach((key) => {
          let decay = DECAY_RATES[key] * deltaTime;
          if (key === 'health' && anyZero) {
            decay = 0.5 * deltaTime;
          } else if (key === 'health') {
            decay = 0;
          }
          newStats[key] = clamp(newStats[key] - decay, 0, 100);
        });

        return newStats;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (stats.health <= 0 && !isDead) {
      setIsDead(true);
    }
  }, [stats.health, isDead]);

  const renderProgressBar = (key: keyof PetStats) => (
    <div key={key} className="stat-row">
      <span className="stat-label">{STAT_LABELS[key]}</span>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${stats[key]}%`,
            background: STAT_COLORS[key],
          }}
        />
      </div>
      <span className="stat-value">{Math.floor(stats[key])}</span>
    </div>
  );

  const getFloatingTextColor = (type: keyof PetStats) => STAT_COLORS[type];

  return (
    <div className="page">
      <div className="game-container">
        <h1 className="title-text">像素小怪兽</h1>

        <div className="pet-area">
          <PetDisplay stats={stats} currentAction={currentAction} isDead={isDead} />

          <div className="floating-container">
            {floatingTexts.map((ft) => (
              <div
                key={ft.id}
                className="floating-text"
                style={{ color: getFloatingTextColor(ft.type) }}
              >
                +{ft.value}
              </div>
            ))}
          </div>

          <div className="stats-container">
            {(Object.keys(INITIAL_STATS) as (keyof PetStats)[]).map(renderProgressBar)}
          </div>
        </div>

        <ControlPanel onAction={handleAction} stats={stats} isDead={isDead} />

        {isDead && (
          <div className="death-overlay">
            <p className="death-text">你的小怪兽已离开...</p>
            <button className="pixel-btn restart-btn" onClick={() => window.location.reload()}>
              重新开始
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
