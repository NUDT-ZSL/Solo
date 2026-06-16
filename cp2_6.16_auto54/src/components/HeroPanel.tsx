import React, { useState } from 'react';
import { HeroStats } from '../types';

interface HeroPanelProps {
  heroTemplates: HeroStats[];
  gold: number;
  canUpgrade: boolean[];
  onBuyHero: (index: number) => void;
  onUpgradeHero: (index: number) => void;
  disabled?: boolean;
}

export const HeroPanel: React.FC<HeroPanelProps> = React.memo(({
  heroTemplates,
  gold,
  canUpgrade,
  onBuyHero,
  onUpgradeHero,
  disabled = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div style={styles.panelContainer}>
      <div style={styles.cardsRow}>
        {heroTemplates.map((hero, index) => {
          const canAfford = gold >= hero.cost;
          const isHovered = hoveredIndex === index;
          const canUpgradeThis = canUpgrade[index];

          return (
            <div
              key={hero.name}
              style={{
                ...styles.heroCard,
                opacity: disabled || !canAfford ? 0.5 : 1,
                transform: isHovered && !disabled && canAfford ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isHovered && !disabled && canAfford ? '0 4px 20px rgba(255,255,255,0.2)' : 'none',
                cursor: disabled || !canAfford ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (!disabled && canAfford) {
                  onBuyHero(index);
                }
              }}
            >
              <div style={styles.heroEmoji}>{hero.emoji}</div>
              <div style={styles.heroName}>{hero.name}</div>
              <div style={styles.heroStats}>
                <span>⚔{hero.baseAtk}</span>
                <span>❤{hero.baseHp}</span>
              </div>
              <div style={styles.costRow}>
                <span style={styles.goldIcon}>💰</span>
                <span style={{
                  ...styles.costText,
                  color: canAfford ? '#fdd835' : '#666666',
                }}>
                  {hero.cost}
                </span>
              </div>
              {canUpgradeThis && (
                <button
                  style={styles.upgradeButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) {
                      onUpgradeHero(index);
                    }
                  }}
                >
                  ⬆ 升星
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

HeroPanel.displayName = 'HeroPanel';

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    width: 540,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'monospace',
  },
  cardsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
  },
  heroCard: {
    width: 80,
    height: 100,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 4px',
    transition: 'all 0.2s ease',
    position: 'relative',
    border: '1px solid #2a2a3e',
  },
  heroEmoji: {
    fontSize: 32,
    lineHeight: 1,
    marginTop: 4,
  },
  heroName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroStats: {
    display: 'flex',
    gap: 8,
    fontSize: 10,
    color: '#aaaaaa',
  },
  costRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  goldIcon: {
    fontSize: 12,
  },
  costText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  upgradeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fdd835',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: 12,
    padding: '4px 8px',
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'monospace',
    boxShadow: '0 2px 8px rgba(253, 216, 53, 0.5)',
  },
};
