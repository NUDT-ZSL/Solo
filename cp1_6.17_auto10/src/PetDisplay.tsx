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

  const getHeadTilt = () => {
    if (currentAction === PetAction.FEED) return 'rotate(-10deg)';
    if (currentAction === PetAction.PLAY) return 'rotate(5deg)';
    if (currentAction === PetAction.CLEAN) return 'rotate(-5deg)';
    return 'rotate(0deg)';
  };

  if (isDead) {
    return (
      <div style={styles.container}>
        <div style={styles.tombstone}>
          <div style={styles.tombstoneCross}>+</div>
          <div style={styles.tombstoneText}>R.I.P</div>
        </div>
        <style>{`
          @keyframes tombstoneAppear {
            0% { transform: scale(0) translateY(50px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isHungry && (
        <div style={styles.speechBubble}>
          <span style={styles.speechText}>饥饿</span>
        </div>
      )}

      {isDirty && (
        <div style={styles.dustContainer}>
          <div style={{ ...styles.dustParticle, animationDelay: '0s' }} />
          <div style={{ ...styles.dustParticle, animationDelay: '0.3s' }} />
          <div style={{ ...styles.dustParticle, animationDelay: '0.6s' }} />
        </div>
      )}

      <div
        style={{
          ...styles.petWrapper,
          animation: isEndangered ? 'shake 0.3s infinite' : 'breathe 2s ease-in-out infinite',
        }}
      >
        <div
          style={{
            ...styles.petBody,
            transform: getHeadTilt(),
            transition: 'transform 0.3s ease',
          }}
        >
          <svg width="128" height="128" viewBox="0 0 32 32" style={styles.petSvg}>
            <rect x="8" y="10" width="16" height="14" fill="#9BBC0F" />
            <rect x="6" y="12" width="2" height="10" fill="#9BBC0F" />
            <rect x="24" y="12" width="2" height="10" fill="#9BBC0F" />
            <rect x="10" y="8" width="4" height="2" fill="#9BBC0F" />
            <rect x="18" y="8" width="4" height="2" fill="#9BBC0F" />

            <rect x="10" y="14" width="4" height="4" fill="#0F380F" />
            <rect x="18" y="14" width="4" height="4" fill="#0F380F" />

            {isBored ? (
              <>
                <rect x="10" y="16" width="4" height="2" fill="#0F380F" />
                <rect x="18" y="16" width="4" height="2" fill="#0F380F" />
              </>
            ) : isHealthy ? (
              <>
                <rect x="11" y="15" width="2" height="2" fill="#8BAC0F" />
                <rect x="19" y="15" width="2" height="2" fill="#8BAC0F" />
              </>
            ) : null}

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
              <div style={{ ...styles.tear, left: '38px' }} />
              <div style={{ ...styles.tear, left: '78px' }} />
            </>
          )}
        </div>
      </div>

      {isHungry && (
        <div style={styles.growlText}>咕噜咕噜~</div>
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: translateY(-3px); }
          50% { transform: translateY(3px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes dustRotate {
          0% { transform: rotate(0deg) translateX(20px) rotate(0deg); opacity: 0.7; }
          50% { opacity: 1; }
          100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); opacity: 0.7; }
        }
        @keyframes tearBlink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  petWrapper: {
    position: 'relative',
  },
  petBody: {
    position: 'relative',
    transformOrigin: 'center bottom',
  },
  petSvg: {
    imageRendering: 'pixelated',
    display: 'block',
  },
  speechBubble: {
    position: 'absolute',
    top: '10px',
    right: '40px',
    background: '#0F380F',
    padding: '8px 12px',
    border: '3px solid #306230',
  },
  speechText: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '10px',
    color: '#8BAC0F',
  },
  dustContainer: {
    position: 'absolute',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '60px',
    pointerEvents: 'none',
  },
  dustParticle: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    background: '#666',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    marginTop: '-4px',
    marginLeft: '-4px',
    animation: 'dustRotate 2s linear infinite',
  },
  tear: {
    position: 'absolute',
    top: '58px',
    width: '4px',
    height: '8px',
    background: '#3498DB',
    animation: 'tearBlink 1s ease-in-out infinite',
  },
  growlText: {
    position: 'absolute',
    bottom: '10px',
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '8px',
    color: '#0F380F',
    opacity: 0.7,
  },
  tombstone: {
    width: '80px',
    height: '120px',
    background: '#306230',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'tombstoneAppear 1s ease-out',
    border: '4px solid #0F380F',
  },
  tombstoneCross: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '24px',
    color: '#8BAC0F',
    marginBottom: '8px',
  },
  tombstoneText: {
    fontFamily: "'Press Start 2P', cursive",
    fontSize: '10px',
    color: '#8BAC0F',
  },
};

export default PetDisplay;
