import React, { useMemo } from 'react';
import { Player, Mineral, Pirate, MAP_WIDTH, MAP_HEIGHT } from '../game/GameEngine';

interface HoverPanelProps {
  mouseX: number | null;
  mouseY: number | null;
  players: Player[];
  minerals: Mineral[];
  pirates: Pirate[];
  canvasRect: DOMRect | null;
}

interface HoverInfo {
  type: 'player' | 'mineral' | 'pirate';
  x: number;
  y: number;
  data: Player | Mineral | Pirate;
}

const PICKUP_RANGE = 16;
const PLAYER_HIT_RADIUS = 20;
const PIRATE_HIT_RADIUS = 20;

export const HoverPanel: React.FC<HoverPanelProps> = ({
  mouseX,
  mouseY,
  players,
  minerals,
  pirates,
  canvasRect,
}) => {
  const hoverInfo = useMemo<HoverInfo | null>(() => {
    if (mouseX === null || mouseY === null) return null;

    for (const player of players) {
      const dist = Math.sqrt((player.x - mouseX) ** 2 + (player.y - mouseY) ** 2);
      if (dist < PLAYER_HIT_RADIUS) {
        return { type: 'player', x: player.x, y: player.y, data: player };
      }
    }

    for (const mineral of minerals) {
      const dist = Math.sqrt((mineral.x - mouseX) ** 2 + (mineral.y - mouseY) ** 2);
      if (dist < PICKUP_RANGE) {
        return { type: 'mineral', x: mineral.x, y: mineral.y, data: mineral };
      }
    }

    for (const pirate of pirates) {
      const dist = Math.sqrt((pirate.x - mouseX) ** 2 + (pirate.y - mouseY) ** 2);
      if (dist < PIRATE_HIT_RADIUS) {
        return { type: 'pirate', x: pirate.x, y: pirate.y, data: pirate };
      }
    }

    return null;
  }, [mouseX, mouseY, players, minerals, pirates]);

  if (!hoverInfo || !canvasRect) return null;

  const scaleX = canvasRect.width / MAP_WIDTH;
  const scaleY = canvasRect.height / MAP_HEIGHT;
  const screenX = hoverInfo.x * scaleX + canvasRect.left;
  const screenY = hoverInfo.y * scaleY + canvasRect.top;

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: screenX + 15,
    top: screenY - 10,
    background: 'rgba(0, 0, 0, 0.85)',
    border: '1px solid #66FCF1',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#C5C6C7',
    fontFamily: "'Roboto', sans-serif",
    fontSize: '13px',
    pointerEvents: 'none',
    zIndex: 1000,
    minWidth: '150px',
    animation: 'fadeIn 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  };

  const renderContent = () => {
    if (hoverInfo.type === 'player') {
      const player = hoverInfo.data as Player;
      const speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
      return (
        <>
          <div
            style={{
              color: player.color,
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '8px',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {player.name}
          </div>
          <div style={{ marginBottom: '4px' }}>
            坐标: ({Math.round(player.x)}, {Math.round(player.y)})
          </div>
          <div style={{ marginBottom: '4px' }}>
            速度: {speed.toFixed(2)} px/帧
          </div>
          <div>矿物: {player.mineralCount} 个</div>
          {player.speedBonus > 0 && (
            <div style={{ color: '#66FCF1', marginTop: '4px' }}>
              引擎加成: +{((player.speedBonus) * 100).toFixed(0)}%
            </div>
          )}
        </>
      );
    }

    if (hoverInfo.type === 'mineral') {
      const mineral = hoverInfo.data as Mineral;
      const valuePercent = mineral.initialValue > 0 
        ? Math.round((mineral.currentValue / mineral.initialValue) * 100) 
        : 0;
      return (
        <>
          <div
            style={{
              color: '#FFD700',
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '8px',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            ⭐ 金矿
          </div>
          <div style={{ marginBottom: '4px' }}>
            坐标: ({Math.round(mineral.x)}, {Math.round(mineral.y)})
          </div>
          <div style={{ marginBottom: '4px' }}>
            初始价值: {mineral.initialValue}
          </div>
          <div style={{ color: '#4ECDC4' }}>
            剩余价值: {valuePercent}%
          </div>
        </>
      );
    }

    if (hoverInfo.type === 'pirate') {
      const pirate = hoverInfo.data as Pirate;
      const target = players.find((p) => p.id === pirate.targetPlayerId);
      return (
        <>
          <div
            style={{
              color: '#E74C3C',
              fontWeight: 'bold',
              fontSize: '14px',
              marginBottom: '8px',
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            ☠ 海盗飞船
          </div>
          <div style={{ marginBottom: '4px' }}>
            坐标: ({Math.round(pirate.x)}, {Math.round(pirate.y)})
          </div>
          <div style={{ marginBottom: '4px' }}>
            速度: 3 px/帧
          </div>
          {target && (
            <div style={{ color: '#E74C3C' }}>
              目标: {target.name}
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <>
      <div style={panelStyle}>{renderContent()}</div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
