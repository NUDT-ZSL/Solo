import { useState, useEffect, useMemo } from 'react';
import type { StagePosition, HitResult } from '../types';

interface StageProps {
  positions: StagePosition[];
  onDrop: (character: any, positionId: string) => void;
  onRemoveCharacter: (positionId: string) => void;
  lightFlash: boolean;
  jumpingTracks: Set<number>;
  hitJudgement?: HitResult['judgement'] | null;
  hitTrackIndex?: number;
}

const JUDGEMENT_TO_GLOW_CLASS: Record<HitResult['judgement'], string> = {
  Perfect: 'stage-glow-perfect',
  Good: 'stage-glow-good',
  OK: 'stage-glow-ok',
  Miss: 'stage-glow-miss'
};

const JUDGEMENT_TO_COLOR: Record<HitResult['judgement'], string> = {
  Perfect: '#FFD700',
  Good: '#3498DB',
  OK: '#4CAF50',
  Miss: '#E74C3C'
};

export default function Stage({ positions, onRemoveCharacter, lightFlash, jumpingTracks, hitJudgement, hitTrackIndex }: StageProps) {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const [lightColors, setLightColors] = useState(['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6']);
  const [glowKey, setGlowKey] = useState(0);

  useEffect(() => {
    if (lightFlash && hitJudgement) {
      setGlowKey(prev => prev + 1);
      
      if (hitTrackIndex !== undefined && hitTrackIndex >= 0 && hitTrackIndex < 4) {
        const newColors = [...lightColors];
        newColors[hitTrackIndex] = JUDGEMENT_TO_COLOR[hitJudgement];
        setLightColors(newColors);
        
        setTimeout(() => {
          setLightColors(prev => {
            const reset = [...prev];
            reset[hitTrackIndex] = ['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6'][hitTrackIndex];
            return reset;
          });
        }, 300);
      } else {
        const colors = ['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6'];
        const newColors = lightColors.map(() => colors[Math.floor(Math.random() * colors.length)]);
        setLightColors(newColors);
      }
    }
  }, [lightFlash, hitJudgement, hitTrackIndex]);

  const positionToTrackMap: Record<string, number> = {
    'left': 0,
    'center': 1,
    'right': 2,
    'back': 3
  };

  const stageGlowClass = useMemo(() => {
    if (!hitJudgement || !lightFlash) return '';
    return JUDGEMENT_TO_GLOW_CLASS[hitJudgement];
  }, [hitJudgement, lightFlash, glowKey]);

  const getCharacterAnimationClass = (trackIndex: number) => {
    if (!jumpingTracks.has(trackIndex) || !hitJudgement) return '';
    
    const character = positions.find((_, i) => {
      const posId = Object.keys(positionToTrackMap).find(k => positionToTrackMap[k] === trackIndex);
      return positions.find(p => p.id === posId) === positions[i];
    });
    
    if (!character) return '';
    
    if (hitJudgement === 'Perfect' || hitJudgement === 'Good') {
      return 'character-bounce';
    } else if (hitJudgement === 'OK') {
      return 'character-swing';
    }
    return 'character-bounce';
  };

  return (
    <div 
      key={glowKey}
      className={stageGlowClass}
      style={{
        width: '800px',
        height: '450px',
        position: 'relative',
        borderRadius: '400px 400px 0 0',
        background: 'radial-gradient(ellipse at top, #2D2D4A 0%, #1E1E2E 70%)',
        overflow: 'hidden',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
        border: '2px solid #2D2D4A',
        transition: 'box-shadow 0.15s ease-out'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: hitJudgement && lightFlash 
          ? `radial-gradient(ellipse at 50% 30%, ${JUDGEMENT_TO_COLOR[hitJudgement]}15 0%, transparent 60%)`
          : 'transparent',
        pointerEvents: 'none',
        transition: 'all 0.3s ease-out',
        zIndex: 1
      }} />

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
              boxShadow: lightFlash ? `0 0 15px ${lightColors[i]}, 0 0 30px ${lightColors[i]}50` : 'none',
              transition: 'all 0.2s ease-out'
            }} />
          </div>
        ))}
      </div>

      {positions.map((position, index) => {
        const trackIndex = positionToTrackMap[position.id] ?? index;
        const isJumping = jumpingTracks.has(trackIndex);
        const isHighlighted = hoveredPosition === position.id && !position.character;
        const animClass = getCharacterAnimationClass(trackIndex);
        
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
              zIndex: 20
            }}
            onClick={() => position.character && onRemoveCharacter(position.id)}
          >
            {position.character ? (
              <div
                className={animClass}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: position.character.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  animation: isJumping 
                    ? (hitJudgement === 'Perfect' || hitJudgement === 'Good' ? 'bounceHit 0.3s ease-out' : 'swingHit 0.3s ease-out')
                    : 'breathe 1.5s ease-in-out infinite',
                  boxShadow: isJumping && hitJudgement
                    ? `0 0 25px ${JUDGEMENT_TO_COLOR[hitJudgement]}, 0 0 40px ${JUDGEMENT_TO_COLOR[hitJudgement]}50`
                    : `0 0 20px ${position.character.color}50`,
                  transition: 'box-shadow 0.15s ease-out'
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

      {hitJudgement && lightFlash && hitTrackIndex !== undefined && (
        <div style={{
          position: 'absolute',
          left: positions.find((_, i) => {
            const posId = Object.keys(positionToTrackMap).find(k => positionToTrackMap[k] === hitTrackIndex);
            const pos = positions.find(p => p.id === posId);
            return pos !== undefined;
          })?.x ?? 400,
          top: positions.find((_, i) => {
            const posId = Object.keys(positionToTrackMap).find(k => positionToTrackMap[k] === hitTrackIndex);
            const pos = positions.find(p => p.id === posId);
            return pos !== undefined;
          })?.y ?? 250,
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${JUDGEMENT_TO_COLOR[hitJudgement]}40 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          animation: 'particleBurst 0.3s ease-out forwards',
          zIndex: 15
        }} />
      )}

      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '60px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
        zIndex: 5
      }} />

      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '0',
        right: '0',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.3)',
        zIndex: 6
      }}>
        {positions.filter(p => p.character).length} / 4 角色已就位
      </div>
    </div>
  );
}
