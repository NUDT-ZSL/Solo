import { useState, useCallback } from 'react';
import { PlantConfig } from '@/utils/plants';

interface CardHandProps {
  cards: PlantConfig[];
  energy: number;
  onSelectCard: (card: PlantConfig) => void;
  selectedCard: PlantConfig | null;
}

const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

const SEASON_COLORS: Record<string, string> = {
  spring: '#5CB85C',
  summer: '#FF6B35',
  autumn: '#D4A843',
  winter: '#A8D8EA',
};

const SEASON_BG: Record<string, string> = {
  spring: 'rgba(92,184,92,0.15)',
  summer: 'rgba(255,107,53,0.15)',
  autumn: 'rgba(212,168,67,0.15)',
  winter: 'rgba(168,216,234,0.15)',
};

export default function CardHand({ cards, energy, onSelectCard, selectedCard }: CardHandProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleCardClick = useCallback(
    (card: PlantConfig) => {
      if (energy < card.cost) return;
      onSelectCard(card);
    },
    [energy, onSelectCard]
  );

  return (
    <div className="card-hand">
      <div className="card-hand-inner">
        {cards.map((card, idx) => {
          const isSelected = selectedCard?.id === card.id;
          const isAffordable = energy >= card.cost;
          const isHovered = hoveredIdx === idx;
          const seasonColor = SEASON_COLORS[card.season];
          const seasonBg = SEASON_BG[card.season];
          const seasonLabel = SEASON_LABELS[card.season];

          return (
            <div
              key={`${card.id}-${idx}`}
              className={`game-card ${isSelected ? 'game-card--selected' : ''} ${!isAffordable ? 'game-card--disabled' : ''} ${isHovered ? 'game-card--hovered' : ''}`}
              onClick={() => handleCardClick(card)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={
                {
                  '--card-color': seasonColor,
                  '--card-bg': seasonBg,
                  '--glow-size': isHovered ? '60px' : '0px',
                } as React.CSSProperties
              }
            >
              <div className="game-card__glow" />
              <div className="game-card__season-badge" style={{ backgroundColor: seasonColor }}>
                {seasonLabel}
              </div>
              <div className="game-card__icon" style={{ color: seasonColor }}>
                {card.season === 'spring' && '🌿'}
                {card.season === 'summer' && '🔥'}
                {card.season === 'autumn' && '🍂'}
                {card.season === 'winter' && '❄️'}
              </div>
              <div className="game-card__name">{card.name}</div>
              <div className="game-card__skill">{card.skill}</div>
              <div className="game-card__cost">
                <span className="game-card__cost-dot" style={{ backgroundColor: isAffordable ? '#E8C547' : '#666' }} />
                {card.cost}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
