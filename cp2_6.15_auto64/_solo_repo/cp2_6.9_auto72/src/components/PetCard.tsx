import React from 'react';

export interface PetData {
  id: string;
  name: string;
  type: 'cat' | 'dog' | 'dragon';
  level: number;
  hunger: number;
  happiness: number;
  energy: number;
  isSick: boolean;
  evolved: boolean;
}

interface PetCardProps {
  pet: PetData;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const StatusBar: React.FC<{ value: number; color: string; label: string }> = ({ value, color, label }) => {
  const gradientFrom = value < 30 ? '#ff4444' : value < 60 ? '#ffaa00' : color === '#4CAF50' ? '#4CAF50' : color === '#2196F3' ? '#2196F3' : '#FFEB3B';
  const gradientTo = color;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 11, color: '#555' }}>
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div style={{
        width: '100%',
        height: 8,
        background: 'rgba(0,0,0,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
          borderRadius: 4,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>
    </div>
  );
};

const PixelPet: React.FC<{ type: string; size?: number; animate?: boolean }> = ({ type, size = 64, animate = true }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    imageRendering: 'pixelated',
    animation: animate ? 'breathe 3s ease-in-out infinite' : undefined,
  };

  const eyeStyle = animate ? { animation: 'blink 4s ease-in-out infinite' } : {};

  if (type === 'cat') {
    return (
      <svg viewBox="0 0 32 32" style={style} shapeRendering="crispEdges">
        <rect x="6" y="4" width="4" height="6" fill="#FFA07A" />
        <rect x="22" y="4" width="4" height="6" fill="#FFA07A" />
        <rect x="7" y="5" width="2" height="4" fill="#FFB6C1" />
        <rect x="23" y="5" width="2" height="4" fill="#FFB6C1" />
        <rect x="4" y="8" width="24" height="18" rx="2" fill="#FFA07A" />
        <rect x="6" y="10" width="20" height="14" fill="#FFDAB9" />
        <rect x="8" y="13" width="4" height="4" fill="#222" style={eyeStyle} />
        <rect x="20" y="13" width="4" height="4" fill="#222" style={eyeStyle} />
        <rect x="9" y="14" width="1" height="1" fill="#fff" />
        <rect x="21" y="14" width="1" height="1" fill="#fff" />
        <rect x="14" y="18" width="4" height="2" fill="#FF69B4" />
        <rect x="12" y="21" width="2" height="2" fill="#333" />
        <rect x="18" y="21" width="2" height="2" fill="#333" />
      </svg>
    );
  }
  if (type === 'dog') {
    return (
      <svg viewBox="0 0 32 32" style={style} shapeRendering="crispEdges">
        <rect x="3" y="6" width="6" height="10" fill="#8B4513" />
        <rect x="23" y="6" width="6" height="10" fill="#8B4513" />
        <rect x="5" y="8" width="2" height="6" fill="#D2691E" />
        <rect x="25" y="8" width="2" height="6" fill="#D2691E" />
        <rect x="6" y="10" width="20" height="16" fill="#D2691E" />
        <rect x="8" y="12" width="16" height="12" fill="#DEB887" />
        <rect x="9" y="14" width="4" height="4" fill="#222" style={eyeStyle} />
        <rect x="19" y="14" width="4" height="4" fill="#222" style={eyeStyle} />
        <rect x="10" y="15" width="1" height="1" fill="#fff" />
        <rect x="20" y="15" width="1" height="1" fill="#fff" />
        <rect x="13" y="19" width="6" height="4" fill="#222" />
        <rect x="14" y="20" width="1" height="1" fill="#fff" />
        <rect x="17" y="20" width="1" height="1" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" style={style} shapeRendering="crispEdges">
      <rect x="2" y="12" width="4" height="4" fill="#FF4500" />
      <rect x="26" y="12" width="4" height="4" fill="#FF4500" />
      <rect x="8" y="2" width="2" height="6" fill="#FFD700" />
      <rect x="22" y="2" width="2" height="6" fill="#FFD700" />
      <rect x="4" y="6" width="24" height="22" fill="#FF4500" />
      <rect x="6" y="8" width="20" height="18" fill="#FF6347" />
      <rect x="8" y="11" width="5" height="5" fill="#FFD700" style={eyeStyle} />
      <rect x="19" y="11" width="5" height="5" fill="#FFD700" style={eyeStyle} />
      <rect x="10" y="12" width="2" height="2" fill="#222" />
      <rect x="21" y="12" width="2" height="2" fill="#222" />
      <rect x="12" y="19" width="8" height="4" fill="#8B0000" />
      <rect x="14" y="20" width="1" height="2" fill="#fff" />
      <rect x="17" y="20" width="1" height="2" fill="#fff" />
      <rect x="10" y="24" width="3" height="4" fill="#FF4500" />
      <rect x="19" y="24" width="3" height="4" fill="#FF4500" />
    </svg>
  );
};

const PetCard: React.FC<PetCardProps> = ({ pet, selected, onClick, compact }) => {
  const cardStyle: React.CSSProperties = {
    width: compact ? '100%' : 232,
    height: compact ? 'auto' : 320,
    padding: 16,
    borderRadius: 16,
    background: selected
      ? 'linear-gradient(135deg, rgba(255,215,0,0.4), rgba(255,165,0,0.4))'
      : 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: pet.isSick
      ? '2px solid #ff4444'
      : selected
      ? '2px solid #FFD700'
      : '1px solid rgba(255,255,255,0.6)',
    boxShadow: selected
      ? '0 8px 24px rgba(255,215,0,0.3)'
      : '0 4px 16px rgba(0,0,0,0.08)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    animation: pet.evolved ? 'evolveGlow 1s ease-out' : undefined,
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <PixelPet type={pet.type} size={compact ? 48 : 72} />
        {pet.evolved && (
          <div style={{
            position: 'absolute',
            top: -6,
            right: -18,
            fontSize: 18,
            animation: 'starSpin 2s linear infinite',
          }}>
            ⭐
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <h3 style={{
          fontSize: compact ? 14 : 16,
          fontWeight: 600,
          color: pet.isSick ? '#ff4444' : '#333',
          margin: 0,
        }}>
          {pet.name}
          {pet.evolved && (
            <span style={{
              marginLeft: 4,
              fontSize: 10,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: 8,
            }}>
              进化
            </span>
          )}
        </h3>
      </div>
      <div style={{
        fontSize: 12,
        color: pet.isSick ? '#ff4444' : '#888',
        marginBottom: 10,
      }}>
        Lv.{pet.level} {pet.isSick && '😷 生病了'}
      </div>
      <div style={{ width: '100%' }}>
        <StatusBar value={pet.hunger} color="#4CAF50" label="饱食度" />
        <StatusBar value={pet.happiness} color="#2196F3" label="快乐度" />
        <StatusBar value={pet.energy} color="#FFEB3B" label="能量度" />
      </div>
    </div>
  );
};

export default PetCard;
