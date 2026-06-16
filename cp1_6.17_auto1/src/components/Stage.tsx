import { useState, useEffect } from 'react';
import type { StagePosition } from '../types';

interface StageProps {
  positions: StagePosition[];
  onDrop: (character: any, positionId: string) => void;
  onRemoveCharacter: (positionId: string) => void;
  lightFlash: boolean;
  jumpingTracks: Set<number>;
}

export default function Stage({ positions, onRemoveCharacter, lightFlash, jumpingTracks }: StageProps) {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [lightColors, setLightColors] = useState(['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6']);

  useEffect(() => {
    if (lightFlash) {
      const colors = ['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6', '#3498DB', '#E74C3C'];
      const newColors = lightColors.map(() => colors[Math.floor(Math.random() * colors.length)]);
      setLightColors(newColors);
    }
  }, [lightFlash]);

  const positionToTrackMap: Record<string, number> = {
    'left': 0,
    'center': 1,
    'right': 2,
    'back': 3
  };

  return (
    <div style={{
      width: '800px',
      height: '450px',
      position: 'relative',
      borderRadius: '400px 400px 0 0',
      background: 'radial-gradient(ellipse at top, #2D2D4A 0%, #1E1E2E 70%)',
      overflow: 'hidden',
      boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
      border: '2px solid #2D2D4A'
    }}>
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 100px',
        zIndex: 10
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: '60px',
            height: '80px',
            background: `linear-gradient(to bottom, ${lightColors[i]} 0%, transparent 100%)`,
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
            opacity: lightFlash ? 1 : 0.3,
            transition: 'all 0.2s ease-out',
            animation: lightFlash ? 'lightFlash 0.2s ease-out' : 'none',
            filter: `blur(2px)`
          }} />
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0 110px',
        zIndex: 11
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: '30px',
            height: '20px',
            backgroundColor: '#333',
            borderRadius: '4px 4px 0 0',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: lightColors[i],
              opacity: lightFlash ? 1 : 0.5,
              boxShadow: lightFlash ? `0 0 15px ${lightColors[i]}` : 'none',
              transition: 'all 0.2s ease-out'
            }} />
          </div>
        ))}
      </div>

      {positions.map((position, index) => {
        const trackIndex = positionToTrackMap[position.id] ?? index;
        const isJumping = jumpingTracks.has(trackIndex);
        const isHighlighted = hoveredPosition === position.id && !position.character;
        
        return (
          <div
            key={position.id}
            data-position-id={position.id}
            onMouseEnter={() => setHoveredPosition(position.id)}
            onMouseLeave={() => setHoveredPosition(null)}
            style={{
              position: 'absolute',
              left: `${position.x - 40}px`,
              top: `${position.y - 40}px`,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: position.character 
                ? `3px solid ${position.character.color}` 
                : isHighlighted 
                  ? '3px solid #FFFFFF' 
                  : '2px dashed rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: position.character 
                ? `${position.character.color}20` 
                : isHighlighted
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'transparent',
              transition: 'all 0.2s ease-out',
              animation: isHighlighted ? 'highlight 0.2s ease-out infinite' : 'none',
              cursor: position.character ? 'pointer' : 'default',
              animationDuration: '0.2s'
            }}
            onClick={() => position.character && onRemoveCharacter(position.id)}
          >
            {position.character ? (
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: position.character.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  animation: isJumping ? 'jump 0.15s ease-out' : 'breathe 1.5s ease-in-out infinite',
                  boxShadow: `0 0 20px ${position.character.color}50`,
                  transition: 'all 0.15s ease-out'
                }}
              >
                {position.character.icon}
              </div>
            ) : (
              <span style={{ 
                color: isHighlighted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                fontSize: '12px',
                transition: 'all 0.2s ease-out'
              }}>
                {position.name}
              </span>
            )}
            
            {position.character && (
              <div style={{
                position: 'absolute',
                bottom: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                color: '#95A5A6',
                whiteSpace: 'nowrap'
              }}>
                {position.character.name}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '60px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '0',
        right: '0',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.3)'
      }}>
        {positions.filter(p => p.character).length} / 4 角色已就位
      </div>
    </div>
  );
}
