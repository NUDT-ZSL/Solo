import React, { useState } from 'react';
import { InkType } from './TerrainEngine';

interface ToolBarProps {
  selectedInk: InkType;
  onSelectInk: (ink: InkType) => void;
  autoEcoMode: boolean;
  onToggleAutoEco: () => void;
}

interface InkButtonConfig {
  type: InkType;
  color: string;
  hoverColor: string;
  tooltip: string;
  label: string;
}

const INK_BUTTONS: InkButtonConfig[] = [
  { type: 'lava', color: '#ff4444', hoverColor: '#ff6666', tooltip: '岩浆 - 腐蚀扩散', label: '炎' },
  { type: 'water', color: '#4488ff', hoverColor: '#6699ff', tooltip: '水流 - 渗透蔓延', label: '水' },
  { type: 'plant', color: '#44ff66', hoverColor: '#66ff88', tooltip: '植被 - 繁殖生长', label: '生' }
];

export const ToolBar: React.FC<ToolBarProps> = ({
  selectedInk,
  onSelectInk,
  autoEcoMode,
  onToggleAutoEco
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleClick = (type: InkType, _e: React.MouseEvent) => {
    const key = `click-${type}`;
    setClicked(key);
    onSelectInk(type);
    setTimeout(() => {
      setClicked(null);
    }, 300);
  };

  const handleMouseEnter = (type: InkType, e: React.MouseEvent<HTMLButtonElement>) => {
    setHovered(type);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 10, y: rect.top + rect.height / 2 });
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const handleAutoEcoClick = (_e: React.MouseEvent) => {
    const key = 'click-autoeco';
    setClicked(key);
    onToggleAutoEco();
    setTimeout(() => {
      setClicked(null);
    }, 300);
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 10
        }}
      >
        {INK_BUTTONS.map(btn => {
          const isSelected = selectedInk === btn.type;
          const isHovered = hovered === btn.type;
          const clickKey = `click-${btn.type}`;
          const isClicked = clicked === clickKey;
          const scale = isHovered ? 1.2 : 1;

          return (
            <div key={btn.type} style={{ position: 'relative', width: 36, height: 36 }}>
              <button
                onClick={(e) => handleClick(btn.type, e)}
                onMouseEnter={(e) => handleMouseEnter(btn.type, e)}
                onMouseLeave={handleMouseLeave}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: `radial-gradient(circle at 30% 30%, ${btn.hoverColor}, ${btn.color})`,
                  boxShadow: isSelected
                    ? `0 0 16px ${btn.color}aa, inset 0 0 8px rgba(255,255,255,0.3)`
                    : `0 2px 8px rgba(0,0,0,0.4), inset 0 0 6px rgba(255,255,255,0.2)`,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  transform: `scale(${scale})`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {btn.label}
                {isClicked && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: -4,
                      right: -4,
                      bottom: -4,
                      borderRadius: '50%',
                      border: `2px solid ${btn.color}`,
                      opacity: 0.6,
                      animation: 'none',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </button>
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    left: 0,
                    width: '100%',
                    height: 2,
                    background: btn.color,
                    borderRadius: 1,
                    boxShadow: `0 0 6px ${btn.color}`
                  }}
                />
              )}
            </div>
          );
        })}

        <div style={{ width: 36, height: 1, background: '#2a2a4a', margin: '4px 0' }} />

        <div style={{ position: 'relative', width: 36, height: 36 }}>
          <button
            onClick={handleAutoEcoClick}
            onMouseEnter={(e) => {
              setHovered('autoeco');
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.right + 10, y: rect.top + rect.height / 2 });
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: autoEcoMode ? '2px solid #44ffaa' : '2px solid #4a4a6a',
              cursor: 'pointer',
              background: autoEcoMode
                ? 'radial-gradient(circle at 30% 30%, #66ffbb, #22aa77)'
                : 'radial-gradient(circle at 30% 30%, #3a3a5a, #1a1a2e)',
              boxShadow: autoEcoMode
                ? '0 0 12px #44ffaa66, inset 0 0 8px rgba(255,255,255,0.2)'
                : '0 2px 8px rgba(0,0,0,0.4)',
              color: autoEcoMode ? '#fff' : '#8a8aa0',
              fontSize: 16,
              fontWeight: 'bold',
              transform: hovered === 'autoeco' ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              position: 'relative',
              overflow: 'visible'
            }}
          >
            ∞
            {clicked === 'click-autoeco' && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: '50%',
                  border: `2px solid ${autoEcoMode ? '#44ffaa' : '#4a4a6a'}`,
                  opacity: 0.6,
                  pointerEvents: 'none'
                }}
              />
            )}
          </button>
          {autoEcoMode && (
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                left: 0,
                width: '100%',
                height: 2,
                background: '#44ffaa',
                borderRadius: 1,
                boxShadow: '0 0 6px #44ffaa'
              }}
            />
          )}
        </div>
      </div>

      {hovered && hovered !== 'autoeco' && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translateY(-50%)',
            background: 'rgba(26, 26, 46, 0.95)',
            color: '#d0d0e0',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            border: '1px solid #3a3a5a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          {INK_BUTTONS.find(b => b.type === hovered)?.tooltip}
        </div>
      )}
      {hovered === 'autoeco' && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translateY(-50%)',
            background: 'rgba(26, 26, 46, 0.95)',
            color: '#d0d0e0',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            border: '1px solid #3a3a5a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          生态演化 - {autoEcoMode ? '已开启' : '点击开启'}
        </div>
      )}
    </>
  );
};
