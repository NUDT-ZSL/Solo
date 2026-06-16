import { useState, useRef, useEffect } from 'react';
import type { Character } from '../types';
import '../App.css';

interface RoleSelectorProps {
  characters: Character[];
}

function RoleSelector({ characters }: RoleSelectorProps) {
  const [dragging, setDragging] = useState<Character | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, character: Character) => {
    e.preventDefault();
    setDragging(character);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPos({ x: clientX, y: clientY });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX, y: clientY });

      const stageContainer = document.querySelector('.stage-container');
      if (stageContainer) {
        const rect = stageContainer.getBoundingClientRect();
        const positions = document.querySelectorAll('.stage-position');
        
        positions.forEach(pos => {
          const posRect = pos.getBoundingClientRect();
          const posCenterX = posRect.left + posRect.width / 2;
          const posCenterY = posRect.top + posRect.height / 2;
          const distance = Math.sqrt(
            Math.pow(clientX - posCenterX, 2) + Math.pow(clientY - posCenterY, 2)
          );
          
          if (distance < 50) {
            pos.classList.add('highlight');
          } else {
            pos.classList.remove('highlight');
          }
        });
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      const stageContainer = document.querySelector('.stage-container');
      if (stageContainer) {
        const positions = document.querySelectorAll('.stage-position');
        
        let droppedOnPosition: Element | null = null;
        let minDistance = Infinity;
        
        positions.forEach(pos => {
          const posRect = pos.getBoundingClientRect();
          const posCenterX = posRect.left + posRect.width / 2;
          const posCenterY = posRect.top + posRect.height / 2;
          const distance = Math.sqrt(
            Math.pow(clientX - posCenterX, 2) + Math.pow(clientY - posCenterY, 2)
          );
          
          if (distance < 60 && distance < minDistance) {
            minDistance = distance;
            droppedOnPosition = pos;
          }
          
          pos.classList.remove('highlight');
        });

        if (droppedOnPosition) {
          const positionId = (droppedOnPosition as HTMLElement).getAttribute('data-position-id');
          if (positionId && dragging) {
            const event = new CustomEvent('characterDropped', {
              detail: { character: dragging, positionId }
            });
            window.dispatchEvent(event);
          }
        }
      }

      setDragging(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragging]);

  return (
    <div className="role-list">
      {characters.map(character => (
        <div
          key={character.id}
          className="role-card"
          onMouseDown={(e) => handleDragStart(e, character)}
          onTouchStart={(e) => handleDragStart(e, character)}
        >
          <div className="role-card-icon">{character.icon}</div>
          <div className="role-card-name">{character.name}</div>
          <div className="role-card-key">按键: {character.key}</div>
        </div>
      ))}

      {dragging && (
        <div
          className="drag-ghost"
          style={{
            left: dragPos.x - 35,
            top: dragPos.y - 35,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: dragging.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32
          }}
        >
          {dragging.icon}
        </div>
      )}
    </div>
  );
}

export default RoleSelector;
