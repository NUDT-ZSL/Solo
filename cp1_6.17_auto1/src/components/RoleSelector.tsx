import { useState, useRef, useEffect } from 'react';
import type { Character, StagePosition } from '../types';

interface RoleSelectorProps {
  characters: Character[];
  onDrop: (character: Character, positionId: string) => void;
  positions: StagePosition[];
}

export default function RoleSelector({ characters, onDrop, positions }: RoleSelectorProps) {
  const [draggingCharacter, setDraggingCharacter] = useState<Character | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingCharacter) {
        setDragPosition({ x: e.clientX, y: e.clientY });
        
        const positionElements = positions.map(p => ({
          id: p.id,
          element: document.querySelector(`[data-position-id="${p.id}"]`)
        }));
        
        let foundPosition: string | null = null;
        for (const pos of positionElements) {
          if (pos.element) {
            const rect = pos.element.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              foundPosition = pos.id;
              break;
            }
          }
        }
        setHoveredPosition(foundPosition);
      }
    };

    const handleMouseUp = (_e: MouseEvent) => {
      if (draggingCharacter && hoveredPosition) {
        const targetPosition = positions.find(p => p.id === hoveredPosition);
        if (targetPosition && !targetPosition.character) {
          onDrop(draggingCharacter, hoveredPosition);
        }
      }
      setDraggingCharacter(null);
      setHoveredPosition(null);
    };

    if (draggingCharacter) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingCharacter, hoveredPosition, positions, onDrop]);

  const handleMouseDown = (e: React.MouseEvent, character: Character) => {
    e.preventDefault();
    setDraggingCharacter(character);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const usedCharacterIds = positions
    .filter(p => p.character !== null)
    .map(p => p.character!.id);

  return (
    <div className="sidebar" ref={dragRef}>
      <h2 style={{ 
        fontSize: '18px', 
        marginBottom: '15px', 
        color: '#E0E0E0',
        textAlign: 'center'
      }}>
        🎭 角色选择
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {characters.map(character => {
          const isUsed = usedCharacterIds.includes(character.id);
          return (
            <div
              key={character.id}
              onMouseDown={(e) => !isUsed && handleMouseDown(e, character)}
              style={{
                background: `linear-gradient(135deg, #FF6B6B, #FFD93D)`,
                borderRadius: '12px',
                padding: '12px',
                cursor: isUsed ? 'not-allowed' : 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: isUsed ? 0.5 : 1,
                transition: 'all 0.3s ease-out',
                transform: isUsed ? 'none' : 'scale(1)',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isUsed) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUsed) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: character.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
                boxShadow: `0 0 10px ${character.color}50`
              }}>
                {character.icon}
              </div>
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#FFFFFF'
                }}>
                  {character.name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#FFFFFFAA'
                }}>
                  按键: {character.key}
                </div>
              </div>
              {isUsed && (
                <div style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  backgroundColor: '#4CAF50',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#FFFFFF'
                }}>
                  已放置
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#1E1E2E', 
        borderRadius: '8px',
        fontSize: '12px',
        color: '#95A5A6',
        lineHeight: '1.5'
      }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#E0E0E0' }}>📖 操作说明</p>
        <p>• 点击并拖拽角色到舞台上</p>
        <p>• 放置到高亮的位置上</p>
        <p>• 点击舞台上的角色可移除</p>
        <p>• 游戏中按 A/S/D/F 键击打音符</p>
      </div>

      {draggingCharacter && (
        <div
          style={{
            position: 'fixed',
            left: dragPosition.x - 25,
            top: dragPosition.y - 25,
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: draggingCharacter.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.8,
            boxShadow: `0 0 20px ${draggingCharacter.color}`,
            transform: 'scale(1.1)'
          }}
        >
          {draggingCharacter.icon}
        </div>
      )}
    </div>
  );
}
