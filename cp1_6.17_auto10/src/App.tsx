import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PetStats, PetAction, FloatingText } from './types';
import PetDisplay from './PetDisplay';
import ControlPanel from './ControlPanel';

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
  const lastTimeRef = useRef<number>(performance.now());
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

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

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
    <div key={key} style={styles.statRow}>
      <span style={styles.statLabel}>{STAT_LABELS[key]}</span>
      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${stats[key]}%`,
            background: STAT_COLORS[key],
          }}
        />
      </div>
      <span style={styles.statValue}>{Math.floor(stats[key])}</span>
    </div>
  );

  const getFloatingTextColor = (type: keyof PetStats) => STAT_COLORS[type];

  return (
    <div style={styles.page}>
      <div style={styles.gameContainer}>
        <h1 style={styles.title}>像素小怪兽</h1>

        <div style={styles.petArea}>
          <PetDisplay stats={stats} currentAction={currentAction} isDead={isDead} />

          <div style={styles.floatingContainer}>
            {floatingTexts.map((ft) => (
              <div
                key={ft.id}
                style={{
                  ...styles.floatingText,
                  color: getFloatingTextColor(ft.type),
                }}
              >
                +{ft.value}
              </div>
            ))}
          </div>

          <div style={styles.statsContainer}>
            {(Object.keys(INITIAL_STATS) as (keyof PetStats)[]).map(renderProgressBar)}
          </div>
        </div>

        <ControlPanel onAction={handleAction} stats={stats} isDead={isDead} />

        {isDead && (
          <div style={styles.deathOverlay}>
            <p style={styles.deathText}>你的小怪兽已离开...</p>
            <button style={styles.restartButton} onClick={() => window.location.reload()}>
              重新开始
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatUpFade {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        @media (max-width: 480px) {
          .game-container {
            width: 95% !important;
          }
          .title-text {
            font-size: 0.8em !important;
          }
          .stat-label, .stat-value {
            font-size: 0.6em !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100%',
    background: '#8BAC0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: "'Press Start 2P', cursive",
  },
  gameContainer: {
    width: '350px',
    background: '#9BBC0F',
    border: '4px solid #306230',
    padding: '20px',
    position: 'relative',
  },
  title: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '16px',
    color: '#0F380F',
    textAlign: 'center',
    marginBottom: '20px',
    marginTop: 0,
  },
  petArea: {
    background: '#8BAC0F',
    border: '4px solid #306230',
    padding: '16px',
    position: 'relative',
  },
  floatingContainer: {
    position: 'absolute',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  floatingText: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '14px',
    fontWeight: 'bold',
    animation: 'floatUpFade 0.6s ease-out forwards',
    position: 'absolute',
    whiteSpace: 'nowrap',
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '8px',
    color: '#0F380F',
    width: '60px',
    flexShrink: 0,
  },
  progressBar: {
    width: '250px',
    height: '12px',
    background: '#306230',
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.5s ease',
  },
  statValue: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '8px',
    color: '#0F380F',
    width: '30px',
    textAlign: 'right',
    flexShrink: 0,
  },
  deathOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 56, 15, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  deathText: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '12px',
    color: '#E74C3C',
  },
  restartButton: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '10px',
    padding: '12px 24px',
    background: '#306230',
    color: '#8BAC0F',
    border: '3px solid #0F380F',
    cursor: 'pointer',
    borderRadius: 0,
  },
};

export default App;
