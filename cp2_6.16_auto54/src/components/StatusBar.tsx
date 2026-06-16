import React from 'react';

interface StatusBarProps {
  gold: number;
  round: number;
  boardHeroCount: number;
  maxHeroes?: number;
}

export const StatusBar: React.FC<StatusBarProps> = React.memo(({
  gold,
  round,
  boardHeroCount,
  maxHeroes = 6,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.goldSection}>
        <span style={styles.goldIcon}>💰</span>
        <span style={styles.goldText}>{gold}</span>
      </div>
      <div style={styles.roundSection}>
        <span style={styles.roundText}>第 {round} 回合</span>
      </div>
      <div style={styles.heroCountSection}>
        <span style={styles.heroIcon}>⚔️🛡️</span>
        <span style={styles.heroCountText}>
          {boardHeroCount}/{maxHeroes}
        </span>
      </div>
    </div>
  );
});

StatusBar.displayName = 'StatusBar';

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    borderBottom: '1px solid #4a4a5e',
    fontFamily: 'monospace',
  },
  goldSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  goldIcon: {
    fontSize: 20,
  },
  goldText: {
    color: '#fdd835',
    fontSize: 24,
    fontWeight: 'bold',
  },
  roundSection: {
    display: 'flex',
    alignItems: 'center',
  },
  roundText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  heroCountSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  heroIcon: {
    fontSize: 16,
  },
  heroCountText: {
    color: '#ffffff',
    fontSize: 16,
  },
};
