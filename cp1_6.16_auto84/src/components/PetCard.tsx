import { useState } from 'react';
import { Pet, petStore } from '../utils/petStore';
import './PetCard.css';

interface PetCardProps {
  pet: Pet;
  onClick?: (e?: React.MouseEvent) => void;
  compact?: boolean;
}

export function PetCard({ pet, onClick, compact = false }: PetCardProps) {
  const [imageError, setImageError] = useState(false);
  const badgeLevel = petStore.getBadgeLevel(pet.snackCount);

  const getBadgeStyle = () => {
    switch (badgeLevel) {
      case 'bronze':
        return {
          background: 'linear-gradient(145deg, #cd7f32, #b87333, #cd7f32)',
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        };
      case 'silver':
        return {
          background: 'linear-gradient(145deg, #e8e8e8, #c0c0c0, #e8e8e8)',
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)',
        };
      case 'gold':
        return {
          background: 'linear-gradient(145deg, #ffd700, #daa520, #ffd700)',
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.3), 0 2px 12px rgba(255,215,0,0.4)',
        };
      default:
        return undefined;
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <div
      className={`pet-card ${compact ? 'compact' : ''} ${pet.isLost ? 'lost' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {pet.isLost && (
        <div className="lost-banner">
          <span className="lost-text">丢失中</span>
        </div>
      )}

      {badgeLevel !== 'none' && (
        <div className="badge" style={badgeStyle} title={`${badgeLevel === 'bronze' ? '铜' : badgeLevel === 'silver' ? '银' : '金'}徽章`}>
          <span className="badge-icon">🐾</span>
        </div>
      )}

      <div className="pet-avatar-container">
        {!imageError ? (
          <img
            src={pet.avatar}
            alt={pet.name}
            className="pet-avatar"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="pet-avatar-placeholder">
            <span className="placeholder-icon">🐱</span>
          </div>
        )}
      </div>

      <div className="pet-info">
        <h3 className="pet-name">{pet.name}</h3>
        <p className="pet-breed">{pet.breed}</p>
        {!compact && pet.personalityTags.length > 0 && (
          <div className="pet-tags">
            {pet.personalityTags.slice(0, 2).map((tag, index) => (
              <span key={index} className="pet-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="snack-indicator">
        <span className="snack-icon">❤️</span>
        <span className="snack-count">{pet.snackCount}</span>
      </div>
    </div>
  );
}
