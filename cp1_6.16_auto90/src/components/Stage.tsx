import { useEffect } from 'react';
import type { Character, PlacedCharacter, StagePosition } from '../types';
import '../App.css';

interface StageProps {
  characters: Character[];
  placedCharacters: PlacedCharacter[];
  positions: StagePosition[];
  onDrop: (character: Character, positionId: string) => void;
  lightFlash: boolean;
  jumpingTracks: Set<number>;
  isGameMode: boolean;
}

function Stage({ characters, placedCharacters, positions, onDrop, lightFlash, jumpingTracks, isGameMode }: StageProps) {
  
  useEffect(() => {
    const handleCharacterDropped = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { character, positionId } = customEvent.detail;
      onDrop(character, positionId);
    };

    window.addEventListener('characterDropped', handleCharacterDropped);
    return () => window.removeEventListener('characterDropped', handleCharacterDropped);
  }, [onDrop]);

  const getCharacterForPosition = (positionId: string) => {
    return placedCharacters.find(p => p.positionId === positionId);
  };

  const getTrackIndexForPosition = (positionId: string): number => {
    const positionOrder = ['left', 'center', 'right', 'back'];
    return positionOrder.indexOf(positionId);
  };

  return (
    <div className="stage-wrapper">
      <div className="stage-container">
        <div className="stage-lights">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`spotlight ${lightFlash ? 'flash' : ''}`}
              style={{
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>

        {positions.map(position => {
          const placed = getCharacterForPosition(position.id);
          const trackIndex = getTrackIndexForPosition(position.id);
          const isJumping = jumpingTracks.has(trackIndex);

          return (
            <div
              key={position.id}
              className="stage-position"
              data-position-id={position.id}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`
              }}
            >
              {placed ? (
                <div
                  className={`stage-character ${isGameMode ? 'breathing' : ''} ${isJumping ? 'jumping' : ''}`}
                  style={{ backgroundColor: placed.character.color }}
                >
                  <span className="stage-character-icon">
                    {placed.character.icon}
                  </span>
                  <span className="stage-character-name">
                    {placed.character.name}
                  </span>
                </div>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {position.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Stage;
