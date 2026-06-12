import type { Character } from '../types';

interface CharacterToolbarProps {
  characters: Character[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function CharacterToolbar({
  characters,
  isOpen,
  onToggle
}: CharacterToolbarProps) {
  const handleDragStart = (e: React.DragEvent, character: Character) => {
    e.dataTransfer.setData('character', character.name);
    e.dataTransfer.setData('color', character.color);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      <button
        onClick={onToggle}
        className="menu-btn menu-btn-left"
        style={{
          display: 'none',
          position: 'fixed',
          left: 16,
          top: 16,
          zIndex: 200,
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          fontSize: 20
        }}
      >
        ☰
      </button>

      <div
        className="character-toolbar"
        style={{
          width: 200,
          backgroundColor: 'var(--toolbar-bg)',
          borderRadius: 12,
          padding: 16,
          height: 'fit-content',
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
            color: 'var(--text-color)',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: 8
          }}
        >
          角色列表
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {characters.map((char) => (
            <div
              key={char.name}
              draggable
              onDragStart={(e) => handleDragStart(e, char)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 8,
                borderRadius: 8,
                cursor: 'grab',
                transition: 'var(--transition-base)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: char.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 14,
                  flexShrink: 0
                }}
              >
                {char.name.charAt(0)}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-color)' }}>
                {char.name}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: '#888',
            lineHeight: 1.5
          }}
        >
          提示：拖拽角色色块到对白气泡上，可分配角色
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .menu-btn-left {
            display: block !important;
          }
          .character-toolbar {
            position: fixed !important;
            left: 0;
            top: 0;
            height: 100vh !important;
            z-index: 150;
            box-shadow: 2px 0 12px rgba(0,0,0,0.15);
            border-radius: 0 12px 12px 0 !important;
          }
        }
      `}</style>
    </>
  );
}
