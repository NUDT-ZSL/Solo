import React from 'react';
import { PetStats, PetAction } from './types';

interface PetDisplayProps {
  stats: PetStats;
  currentAction: PetAction | null;
  isDead: boolean;
}

const PetDisplay: React.FC<PetDisplayProps> = ({ stats, currentAction, isDead }) => {
  const isHealthy = stats.health > 60 && stats.hunger > 60 && stats.happiness > 60 && stats.cleanliness > 60;
  const isHungry = stats.hunger < 30;
  const isBored = stats.happiness < 30;
  const isDirty = stats.cleanliness < 30;
  const isCrying = stats.health < 20 || stats.hunger < 20 || stats.happiness < 20 || stats.cleanliness < 20;
  const isEndangered = stats.health <= 0 || stats.hunger <= 0 || stats.happiness <= 0 || stats.cleanliness <= 0;

  const getHeadTiltStyle = (): React.CSSProperties => {
    let transform = 'rotate(0deg)';
    if (currentAction === PetAction.FEED) transform = 'rotate(-10deg)';
    else if (currentAction === PetAction.PLAY) transform = 'rotate(5deg)';
    else if (currentAction === PetAction.CLEAN) transform = 'rotate(-5deg)';
    return { transform };
  };

  const wrapperAnimClass = isEndangered ? 'shake-anim' : 'breathe-anim';

  if (isDead) {
    return (
      <div className="pet-display-container">
        <div className="tombstone">
          <div className="tombstone-cross">+</div>
          <div className="tombstone-text">R.I.P</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pet-display-container">
      {isHungry && (
        <div key={`bubble-${Date.now()}`} className="speech-bubble">
          <span className="speech-text">饥饿</span>
        </div>
      )}

      {isDirty && (
        <div className="dust-container">
          <div key={`dust1-${isDirty}`} className="dust-particle" style={{ animationDelay: '0s' }} />
          <div key={`dust2-${isDirty}`} className="dust-particle" style={{ animationDelay: '1s' }} />
          <div key={`dust3-${isDirty}`} className="dust-particle" style={{ animationDelay: '2s' }} />
        </div>
      )}

      <div className={`pet-wrapper ${wrapperAnimClass}`}>
        <div className="pet-body" style={getHeadTiltStyle()}>
          <svg width="128" height="128" viewBox="0 0 32 32" className="pet-svg">
            <rect x="8" y="10" width="16" height="14" fill="#9BBC0F" />
            <rect x="6" y="12" width="2" height="10" fill="#9BBC0F" />
            <rect x="24" y="12" width="2" height="10" fill="#9BBC0F" />
            <rect x="10" y="8" width="4" height="2" fill="#9BBC0F" />
            <rect x="18" y="8" width="4" height="2" fill="#9BBC0F" />

            {isBored ? (
              <>
                <rect x="10" y="16" width="4" height="2" fill="#0F380F" />
                <rect x="18" y="16" width="4" height="2" fill="#0F380F" />
              </>
            ) : (
              <>
                <rect x="10" y="14" width="4" height="4" fill="#0F380F" />
                <rect x="18" y="14" width="4" height="4" fill="#0F380F" />
                {isHealthy && (
                  <>
                    <rect x="11" y="15" width="2" height="2" fill="#8BAC0F" />
                    <rect x="19" y="15" width="2" height="2" fill="#8BAC0F" />
                  </>
                )}
              </>
            )}

            {isHealthy ? (
              <>
                <rect x="12" y="20" width="2" height="2" fill="#0F380F" />
                <rect x="18" y="20" width="2" height="2" fill="#0F380F" />
                <rect x="14" y="20" width="4" height="2" fill="#0F380F" />
              </>
            ) : (
              <>
                <rect x="13" y="21" width="6" height="1" fill="#0F380F" />
              </>
            )}

            <rect x="10" y="24" width="4" height="2" fill="#9BBC0F" />
            <rect x="18" y="24" width="4" height="2" fill="#9BBC0F" />
          </svg>

          {isCrying && (
            <>
              <div className="tear" style={{ left: '38px' }} />
              <div className="tear" style={{ left: '78px' }} />
            </>
          )}
        </div>
      </div>

      {isHungry && (
        <div className="growl-text">咕噜咕噜~</div>
      )}
    </div>
  );
};

export default PetDisplay;
