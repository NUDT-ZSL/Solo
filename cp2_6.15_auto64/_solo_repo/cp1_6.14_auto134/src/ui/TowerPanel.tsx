import React, { useState } from 'react';
import { TowerType } from '../audio-engine';
import { Tower } from '../battle-simulator';

interface TowerPanelProps {
  selectedTower: TowerType | null;
  onSelectTower: (type: TowerType | null) => void;
  getTowerCost: (type: TowerType) => number;
  score: number;
  selectedPlacedTower: Tower | null;
  onUpgrade: () => void;
  onCloseUpgrade: () => void;
  getUpgradeCost: (tower: Tower) => number;
}

const TOWER_INFO: Array<{ type: TowerType; name: string; color: string; icon: string; desc: string }> = [
  { type: 'machinegun', name: '机枪塔', color: '#ff3366', icon: '🔫', desc: '高射速，3级解锁溅射' },
  { type: 'laser', name: '激光塔', color: '#00bfff', icon: '⚡', desc: '高伤害，远射程' },
  { type: 'sonic', name: '声波塔', color: '#aa66ff', icon: '🔊', desc: '范围减速效果' },
  { type: 'heal', name: '治愈塔', color: '#aaff00', icon: '💚', desc: '辅助增益' },
];

export const TowerPanel: React.FC<TowerPanelProps> = ({
  selectedTower,
  onSelectTower,
  getTowerCost,
  score,
  selectedPlacedTower,
  onUpgrade,
  onCloseUpgrade,
  getUpgradeCost,
}) => {
  const [hoveredTower, setHoveredTower] = useState<TowerType | null>(null);

  const handleDragStart = (e: React.DragEvent, type: TowerType) => {
    e.dataTransfer.setData('towerType', type);
    onSelectTower(type);
  };

  const handleTowerClick = (type: TowerType) => {
    if (selectedTower === type) {
      onSelectTower(null);
    } else {
      onSelectTower(type);
    }
  };

  const towerInfo = selectedPlacedTower
    ? TOWER_INFO.find((t) => t.type === selectedPlacedTower.type)
    : null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
        }}
      >
        {TOWER_INFO.map(({ type, name, color, icon, desc }) => {
          const cost = getTowerCost(type);
          const isSelected = selectedTower === type;
          const canAfford = score >= cost;

          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => handleTowerClick(type)}
              onMouseEnter={() => setHoveredTower(type)}
              onMouseLeave={() => setHoveredTower(null)}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: '#2a2a3a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                position: 'relative',
                opacity: canAfford ? 1 : 0.4,
                boxShadow: isSelected ? `0 0 20px ${color}, 0 0 40px ${color}40` : 'none',
                border: isSelected ? `2px solid #ffcc00` : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: '28px' }}>{icon}</span>
              <span
                style={{
                  fontSize: '10px',
                  color,
                  fontFamily: "'Courier New', monospace",
                  marginTop: '2px',
                }}
              >
                {cost}
              </span>

              {hoveredTower === type && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '70px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e1e2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    minWidth: '120px',
                    whiteSpace: 'nowrap',
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      color,
                      fontSize: '14px',
                      fontFamily: "'Courier New', monospace",
                      marginBottom: '4px',
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      color: '#888',
                      fontSize: '11px',
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    {desc}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedPlacedTower && towerInfo && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1e1e2e',
            borderRadius: '16px',
            padding: '24px',
            minWidth: '320px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 500,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '32px' }}>{towerInfo.icon}</span>
                <div>
                  <div style={{ color: towerInfo.color, fontSize: '18px', fontFamily: "'Courier New', monospace" }}>
                    {towerInfo.name}
                  </div>
                  <div style={{ color: '#ffcc00', fontSize: '14px', fontFamily: "'Courier New', monospace" }}>
                    Lv.{selectedPlacedTower.level}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onCloseUpgrade}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              background: '#0a0a14',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontFamily: "'Courier New', monospace",
              fontSize: '13px',
              color: '#aaa',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Damage:</span>
              <span style={{ color: '#ff3366' }}>{selectedPlacedTower.damage}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Range:</span>
              <span style={{ color: '#00bfff' }}>{selectedPlacedTower.range}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Attack Speed:</span>
              <span style={{ color: '#aa66ff' }}>{selectedPlacedTower.attackSpeed} beat</span>
            </div>
            {selectedPlacedTower.level >= 3 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #333', color: '#ffcc00' }}>
                ✨ Special: {selectedPlacedTower.type === 'machinegun' ? 'Splash Damage' : selectedPlacedTower.type === 'laser' ? 'Piercing' : selectedPlacedTower.type === 'sonic' ? 'Slow Aura' : 'Group Heal'}
              </div>
            )}
          </div>

          {selectedPlacedTower.level < 5 ? (
            <button
              onClick={onUpgrade}
              disabled={score < getUpgradeCost(selectedPlacedTower)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: score >= getUpgradeCost(selectedPlacedTower) ? '#00ff88' : '#333',
                color: score >= getUpgradeCost(selectedPlacedTower) ? '#000' : '#666',
                fontFamily: "'Courier New', monospace",
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: score >= getUpgradeCost(selectedPlacedTower) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              ⬆️ Upgrade ({getUpgradeCost(selectedPlacedTower)} pts)
            </button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                color: '#ffcc00',
                fontFamily: "'Courier New', monospace",
              }}
            >
              ⭐ MAX LEVEL
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TowerPanel;
