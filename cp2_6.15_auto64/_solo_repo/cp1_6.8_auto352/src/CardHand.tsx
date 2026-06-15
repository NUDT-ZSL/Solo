import React, { useState, useCallback } from 'react';
import { PLANTS, Season, SEASON_COLORS } from './utils/plants';

interface CardHandProps {
  hand: string[];
  selectedCard: string | null;
  gold: number;
  onSelectCard: (plantId: string | null) => void;
  hoveredCard: string | null;
  onHoverCard: (plantId: string | null) => void;
}

const seasonEmoji: Record<Season, string> = {
  spring: '🌿',
  summer: '🔥',
  autumn: '🍂',
  winter: '❄️',
};

const seasonLabel: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

const CardHand: React.FC<CardHandProps> = ({ hand, selectedCard, gold, onSelectCard, hoveredCard, onHoverCard }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: '12px 20px',
      }}
    >
      {hand.map((plantId, index) => {
        const config = PLANTS[plantId];
        if (!config) return null;

        const isSelected = selectedCard === plantId;
        const isHovered = hoveredCard === plantId;
        const canAfford = gold >= config.cost;
        const seasonColor = SEASON_COLORS[config.season];

        return (
          <div
            key={`${plantId}_${index}`}
            onClick={() => {
              if (isSelected) {
                onSelectCard(null);
              } else if (canAfford) {
                onSelectCard(plantId);
              }
            }}
            onMouseEnter={() => onHoverCard(plantId)}
            onMouseLeave={() => onHoverCard(null)}
            style={{
              width: '110px',
              padding: '10px 8px',
              borderRadius: '14px',
              background: isSelected
                ? `linear-gradient(135deg, ${seasonColor.primary}44, ${seasonColor.secondary}33)`
                : isHovered
                ? `rgba(255, 255, 255, 0.1)`
                : 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: isSelected
                ? `2px solid ${seasonColor.primary}`
                : isHovered
                ? '2px solid rgba(255, 255, 255, 0.2)'
                : '2px solid rgba(255, 255, 255, 0.08)',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              transition: 'all 0.25s ease',
              transform: isSelected ? 'translateY(-8px) scale(1.05)' : isHovered ? 'translateY(-4px)' : 'translateY(0)',
              opacity: canAfford ? 1 : 0.4,
              boxShadow: isSelected
                ? `0 8px 24px ${seasonColor.primary}40, 0 0 40px ${seasonColor.primary}15`
                : isHovered
                ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              userSelect: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {(isSelected || isHovered) && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at 50% 30%, ${seasonColor.primary}15, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
            )}

            <div style={{ fontSize: '28px', marginBottom: '4px', position: 'relative' }}>
              {seasonEmoji[config.season]}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: seasonColor.secondary,
                marginBottom: '4px',
                textShadow: `0 0 8px ${seasonColor.primary}60`,
                position: 'relative',
              }}
            >
              {config.name}
            </div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '8px',
                background: `${seasonColor.primary}30`,
                color: seasonColor.secondary,
                marginBottom: '6px',
                position: 'relative',
              }}
            >
              {seasonLabel[config.season]}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '6px',
                lineHeight: 1.3,
                position: 'relative',
              }}
            >
              {config.description}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: canAfford ? '#ffcc00' : '#ff6666',
                position: 'relative',
              }}
            >
              💰 {config.cost}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardHand;
