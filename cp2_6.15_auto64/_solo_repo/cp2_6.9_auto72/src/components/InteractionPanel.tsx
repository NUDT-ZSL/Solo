import React, { useState } from 'react';
import axios from 'axios';
import type { PetData } from './PetCard';

interface InteractionPanelProps {
  pet: PetData;
  onUpdate: (pet: PetData) => void;
}

type ActionType = 'feed' | 'play' | 'rest';

const InteractionPanel: React.FC<InteractionPanelProps> = ({ pet, onUpdate }) => {
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleInteraction = async (action: ActionType) => {
    if (animating) return;
    setAnimating(true);
    setCurrentAction(action);
    try {
      const response = await axios.post(`/api/pets/${pet.id}/interact`, { action });
      onUpdate(response.data as PetData);
    } catch (error) {
      console.error('交互失败:', error);
    }
    const duration = action === 'feed' ? 500 : action === 'play' ? 800 : 2000;
    setTimeout(() => {
      setAnimating(false);
      setCurrentAction(null);
    }, duration);
  };

  const getPetAnimation = () => {
    if (currentAction === 'play') return 'jump 0.8s ease-out';
    if (currentAction === 'feed') return 'scale(1.1)';
    if (currentAction === 'rest') return 'sleep';
    return undefined;
  };

  const renderPet = () => {
    const isSleeping = currentAction === 'rest';
    const eyeStyle = isSleeping ? undefined : { animation: 'blink 4s ease-in-out infinite' };

    const petStyle: React.CSSProperties = {
      width: 180,
      height: 180,
      animation: currentAction === 'play'
        ? 'jump 0.8s ease-out'
        : currentAction === 'feed'
        ? 'breathe 3s ease-in-out infinite, scaleUp 0.5s ease-out'
        : 'breathe 3s ease-in-out infinite',
      transform: currentAction === 'feed' ? 'scale(1.1)' : undefined,
      transition: 'transform 0.3s ease',
    };

    if (pet.type === 'cat') {
      return (
        <svg viewBox="0 0 32 32" style={petStyle} shapeRendering="crispEdges">
          <rect x="6" y="4" width="4" height="6" fill="#FFA07A" />
          <rect x="22" y="4" width="4" height="6" fill="#FFA07A" />
          <rect x="7" y="5" width="2" height="4" fill="#FFB6C1" />
          <rect x="23" y="5" width="2" height="4" fill="#FFB6C1" />
          <rect x="4" y="8" width="24" height="18" rx="2" fill="#FFA07A" />
          <rect x="6" y="10" width="20" height="14" fill="#FFDAB9" />
          {isSleeping ? (
            <>
              <rect x="8" y="14" width="4" height="2" fill="#222" />
              <rect x="20" y="14" width="4" height="2" fill="#222" />
            </>
          ) : (
            <>
              <rect x="8" y="13" width="4" height="4" fill="#222" style={eyeStyle} />
              <rect x="20" y="13" width="4" height="4" fill="#222" style={eyeStyle} />
            </>
          )}
          <rect x="9" y="14" width="1" height="1" fill="#fff" />
          <rect x="21" y="14" width="1" height="1" fill="#fff" />
          <rect x="14" y="18" width="4" height="2" fill="#FF69B4" />
          <rect x="12" y="21" width="2" height="2" fill="#333" />
          <rect x="18" y="21" width="2" height="2" fill="#333" />
          {isSleeping && (
            <text x="26" y="10" fill="#666" fontSize="4" fontFamily="sans-serif">Z</text>
          )}
          {isSleeping && (
            <text x="28" y="6" fill="#999" fontSize="3" fontFamily="sans-serif">z</text>
          )}
        </svg>
      );
    }
    if (pet.type === 'dog') {
      return (
        <svg viewBox="0 0 32 32" style={petStyle} shapeRendering="crispEdges">
          <rect x="3" y="6" width="6" height="10" fill="#8B4513" />
          <rect x="23" y="6" width="6" height="10" fill="#8B4513" />
          <rect x="5" y="8" width="2" height="6" fill="#D2691E" />
          <rect x="25" y="8" width="2" height="6" fill="#D2691E" />
          <rect x="6" y="10" width="20" height="16" fill="#D2691E" />
          <rect x="8" y="12" width="16" height="12" fill="#DEB887" />
          {isSleeping ? (
            <>
              <rect x="9" y="15" width="4" height="2" fill="#222" />
              <rect x="19" y="15" width="4" height="2" fill="#222" />
            </>
          ) : (
            <>
              <rect x="9" y="14" width="4" height="4" fill="#222" style={eyeStyle} />
              <rect x="19" y="14" width="4" height="4" fill="#222" style={eyeStyle} />
            </>
          )}
          <rect x="10" y="15" width="1" height="1" fill="#fff" />
          <rect x="20" y="15" width="1" height="1" fill="#fff" />
          <rect x="13" y="19" width="6" height="4" fill="#222" />
          {isSleeping && (
            <>
              <text x="26" y="10" fill="#666" fontSize="4" fontFamily="sans-serif">Z</text>
              <text x="28" y="6" fill="#999" fontSize="3" fontFamily="sans-serif">z</text>
            </>
          )}
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 32 32" style={petStyle} shapeRendering="crispEdges">
        <rect x="2" y="12" width="4" height="4" fill="#FF4500" />
        <rect x="26" y="12" width="4" height="4" fill="#FF4500" />
        <rect x="8" y="2" width="2" height="6" fill="#FFD700" />
        <rect x="22" y="2" width="2" height="6" fill="#FFD700" />
        <rect x="4" y="6" width="24" height="22" fill="#FF4500" />
        <rect x="6" y="8" width="20" height="18" fill="#FF6347" />
        {isSleeping ? (
          <>
            <rect x="9" y="12" width="3" height="2" fill="#222" />
            <rect x="20" y="12" width="3" height="2" fill="#222" />
          </>
        ) : (
          <>
            <rect x="8" y="11" width="5" height="5" fill="#FFD700" style={eyeStyle} />
            <rect x="19" y="11" width="5" height="5" fill="#FFD700" style={eyeStyle} />
          </>
        )}
        <rect x="10" y="12" width="2" height="2" fill="#222" />
        <rect x="21" y="12" width="2" height="2" fill="#222" />
        <rect x="12" y="19" width="8" height="4" fill="#8B0000" />
        <rect x="10" y="24" width="3" height="4" fill="#FF4500" />
        <rect x="19" y="24" width="3" height="4" fill="#FF4500" />
        {isSleeping && (
          <>
            <text x="26" y="8" fill="#666" fontSize="4" fontFamily="sans-serif">Z</text>
            <text x="28" y="4" fill="#999" fontSize="3" fontFamily="sans-serif">z</text>
          </>
        )}
      </svg>
    );
  };

  const buttonStyle = (color: string): React.CSSProperties => ({
    padding: '12px 28px',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: animating ? 'not-allowed' : 'pointer',
    opacity: animating ? 0.7 : 1,
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'all 0.3s ease',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 24,
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: 20,
      height: '100%',
    }}>
      <h2 style={{ color: '#333', marginBottom: 4 }}>
        {pet.name}
        {pet.evolved && (
          <span style={{
            marginLeft: 8,
            fontSize: 14,
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: 10,
          }}>
            ⭐ 进化
          </span>
        )}
      </h2>
      <p style={{ color: '#666', marginBottom: 20 }}>等级 {pet.level} | {pet.type === 'cat' ? '小猫' : pet.type === 'dog' ? '小狗' : '小龙'}</p>

      <div style={{
        margin: '20px 0 40px',
        padding: 30,
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 20,
        position: 'relative',
      }}>
        {renderPet()}
        {currentAction === 'play' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 32,
            animation: 'pop 0.6s ease-out forwards',
          }}>
            ✨
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          style={buttonStyle('#4CAF50')}
          onClick={() => handleInteraction('feed')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(76,175,80,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          disabled={animating}
        >
          🍖 喂食 (+20)
        </button>
        <button
          style={buttonStyle('#2196F3')}
          onClick={() => handleInteraction('play')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(33,150,243,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          disabled={animating}
        >
          🎾 玩耍 (+15)
        </button>
        <button
          style={buttonStyle('#FF9800')}
          onClick={() => handleInteraction('rest')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,152,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          disabled={animating}
        >
          😴 休息 (+30)
        </button>
      </div>
    </div>
  );
};

export default InteractionPanel;
