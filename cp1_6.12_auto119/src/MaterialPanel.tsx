import { useState, memo, useCallback } from 'react';
import { useMaterialStore } from './store/materialStore';
import {
  WALL_MATERIALS,
  ROOF_MATERIALS,
  WINDOW_MATERIALS,
  type MaterialPreset,
} from './utils/theme';

interface MaterialGroupProps {
  title: string;
  accentColor: string;
  materials: readonly MaterialPreset[];
  selectedName: string;
  onSelect: (preset: MaterialPreset) => void;
}

const MaterialGroup = memo(function MaterialGroup({
  title,
  accentColor,
  materials,
  selectedName,
  onSelect,
}: MaterialGroupProps) {
  return (
    <div
      style={{
        background: '#3A3A3A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}00 0%, ${accentColor} 50%, ${accentColor}00 100%)`,
        }}
      />
      <div
        style={{
          color: '#E0E0E0',
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 12,
          marginTop: 6,
          fontFamily: "'Noto Sans SC', sans-serif",
          letterSpacing: 0.3,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {materials.map((m) => {
          const isSelected = selectedName === m.name;
          return (
            <button
              key={m.name}
              onClick={() => onSelect(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                height: 48,
                background: isSelected ? '#455A64' : '#424242',
                border: 'none',
                borderRadius: 8,
                padding: '0 12px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s ease-out, box-shadow 0.2s ease-out',
                boxShadow: isSelected
                  ? `0 0 0 0 ${accentColor}, 0 2px 8px rgba(0,0,0,0.2)`
                  : '0 1px 3px rgba(0,0,0,0.15)',
                animation: isSelected ? 'materialPulse 1.5s ease-in-out infinite' : 'none',
                overflow: 'hidden',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = '#616161';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = '#424242';
                }
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: accentColor,
                    borderRadius: '4px 0 0 4px',
                  }}
                />
              )}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: m.color,
                  border: m.transparent ? '1px dashed rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  opacity: m.opacity ?? 1,
                  flexShrink: 0,
                  boxShadow: m.metalness > 0.5 ? 'inset 0 -2px 4px rgba(255,255,255,0.15), inset 0 2px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              />
              <span
                style={{
                  color: isSelected ? '#FFFFFF' : '#BDBDBD',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  fontFamily: "'Noto Sans SC', sans-serif",
                  transition: 'color 0.2s ease-out',
                }}
              >
                {m.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

MaterialGroup.displayName = 'MaterialGroup';

function MaterialPanelInner() {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const currentMaterials = useMaterialStore((s) => s.currentMaterials);
  const selectMaterial = useMaterialStore((s) => s.selectMaterial);
  const undo = useMaterialStore((s) => s.undo);
  const historyIndex = useMaterialStore((s) => s.historyIndex);
  const showUndoMessage = useMaterialStore((s) => s.showUndoMessage);
  const undoMessage = useMaterialStore((s) => s.undoMessage);

  const canUndo = historyIndex > 0;

  const handleSelectWall = useCallback((m: MaterialPreset) => selectMaterial('wall', m), [selectMaterial]);
  const handleSelectRoof = useCallback((m: MaterialPreset) => selectMaterial('roof', m), [selectMaterial]);
  const handleSelectWindow = useCallback((m: MaterialPreset) => selectMaterial('window', m), [selectMaterial]);

  return (
    <>
      <style>{`
        @keyframes materialPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79, 195, 247, 0); }
          50% { box-shadow: 0 0 14px 2px rgba(79, 195, 247, 0.35); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          30% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        @media (max-width: 767px) {
          .material-panel-desktop { display: none !important; }
          .material-panel-mobile { display: block !important; }
        }
        @media (min-width: 768px) {
          .material-panel-desktop { display: block !important; }
          .material-panel-mobile { display: none !important; }
        }
      `}</style>

      <div
        className="material-panel-desktop"
        style={{
          width: 280,
          minWidth: 280,
          height: '100%',
          background: '#2C2C2C',
          padding: 20,
          boxSizing: 'border-box',
          overflowY: 'auto',
          position: 'relative',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 20,
            fontFamily: "'Noto Sans SC', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>🏗️</span>
          MaterialMix
        </div>

        <MaterialGroup
          title="墙面材质"
          accentColor="#4FC3F7"
          materials={WALL_MATERIALS}
          selectedName={currentMaterials.wall.name}
          onSelect={handleSelectWall}
        />

        <MaterialGroup
          title="屋顶材质"
          accentColor="#81C784"
          materials={ROOF_MATERIALS}
          selectedName={currentMaterials.roof.name}
          onSelect={handleSelectRoof}
        />

        <MaterialGroup
          title="窗框材质"
          accentColor="#FFB74D"
          materials={WINDOW_MATERIALS}
          selectedName={currentMaterials.window.name}
          onSelect={handleSelectWindow}
        />

        <button
          onClick={undo}
          disabled={!canUndo}
          style={{
            width: '100%',
            height: 48,
            background: canUndo ? '#FF7043' : '#555555',
            border: 'none',
            borderRadius: 8,
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontFamily: "'Noto Sans SC', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s ease-out, transform 0.2s ease-out',
            marginTop: 8,
          }}
          onMouseEnter={(e) => {
            if (canUndo) (e.currentTarget as HTMLElement).style.background = '#F4511E';
          }}
          onMouseLeave={(e) => {
            if (canUndo) (e.currentTarget as HTMLElement).style.background = '#FF7043';
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          撤销上一步
        </button>

        {showUndoMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 20,
              right: 20,
              padding: '10px 16px',
              background: 'rgba(0, 0, 0, 0.85)',
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "'Noto Sans SC', sans-serif",
              textAlign: 'center',
              animation: 'fadeInOut 0.3s ease-out',
              pointerEvents: 'none',
            }}
          >
            {undoMessage}
          </div>
        )}
      </div>

      <div
        className="material-panel-mobile"
        style={{ display: 'none', width: '100%', background: '#2C2C2C', zIndex: 100 }}
      >
        <div
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: isMobileExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#FFFFFF',
              fontWeight: 700,
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            <span>🏗️</span> 材质面板
          </div>
          <span
            style={{
              color: '#BDBDBD',
              fontSize: 18,
              transition: 'transform 0.2s',
              transform: isMobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </div>

        {isMobileExpanded && (
          <div style={{ padding: 16, height: 200, overflowY: 'auto' }}>
            <MaterialGroup
              title="墙面材质"
              accentColor="#4FC3F7"
              materials={WALL_MATERIALS}
              selectedName={currentMaterials.wall.name}
              onSelect={handleSelectWall}
            />
            <MaterialGroup
              title="屋顶材质"
              accentColor="#81C784"
              materials={ROOF_MATERIALS}
              selectedName={currentMaterials.roof.name}
              onSelect={handleSelectRoof}
            />
            <MaterialGroup
              title="窗框材质"
              accentColor="#FFB74D"
              materials={WINDOW_MATERIALS}
              selectedName={currentMaterials.window.name}
              onSelect={handleSelectWindow}
            />
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                width: '100%',
                height: 48,
                background: canUndo ? '#FF7043' : '#555555',
                border: 'none',
                borderRadius: 8,
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: canUndo ? 'pointer' : 'not-allowed',
                fontFamily: "'Noto Sans SC', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s ease-out',
              }}
            >
              <span>←</span> 撤销上一步
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const MaterialPanel = memo(MaterialPanelInner);
MaterialPanel.displayName = 'MaterialPanel';

export default MaterialPanel;
