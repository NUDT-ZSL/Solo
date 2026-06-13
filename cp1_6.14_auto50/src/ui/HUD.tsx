import React from 'react';
import { GameData } from '../types';
import { COLOR_HUD_BG } from '../constants';

interface HUDProps {
  data: GameData;
}

const hudContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  left: 8,
  right: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  background: COLOR_HUD_BG,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 8,
  color: '#ffffff',
  fontSize: 14,
  fontFamily: 'monospace',
  pointerEvents: 'none',
  zIndex: 10,
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const hpStyle: React.CSSProperties = {
  color: '#ff4444',
  fontWeight: 'bold',
  fontSize: 16,
};

const goldStyle: React.CSSProperties = {
  color: '#ffd700',
  fontWeight: 'bold',
  fontSize: 16,
};

const inventoryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
};

const itemSlotStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: '1px solid #ffffff44',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  color: '#cccccc',
  background: 'rgba(0,0,0,0.3)',
  overflow: 'hidden',
  textAlign: 'center',
  lineHeight: 1.1,
  padding: 2,
};

const roomLabelStyle: React.CSSProperties = {
  color: '#888899',
  fontSize: 12,
};

const heartIconStyle: React.CSSProperties = {
  fontSize: 16,
};

const HUD: React.FC<HUDProps> = ({ data }) => {
  const { player, currentRoomId } = data;

  const recentItems = player.inventory.slice(-5);

  return (
    <div style={hudContainerStyle}>
      <div style={sectionStyle}>
        <span style={heartIconStyle}>❤</span>
        <span style={hpStyle}>{player.hp}/{player.maxHp}</span>
      </div>

      <div style={sectionStyle}>
        <span style={heartIconStyle}>🪙</span>
        <span style={goldStyle}>{player.gold}</span>
      </div>

      <div style={sectionStyle}>
        <span style={{ color: '#ff8844', fontSize: 12 }}>⚔{player.attack}</span>
      </div>

      <div style={inventoryStyle}>
        {recentItems.length === 0 && (
          <div style={itemSlotStyle}>-</div>
        )}
        {recentItems.map((item) => (
          <div
            key={item.id}
            style={{
              ...itemSlotStyle,
              borderColor:
                item.type === 'heal'
                  ? '#ff444488'
                  : item.type === 'attack'
                  ? '#ff884488'
                  : '#ffd70088',
            }}
          >
            {item.type === 'heal' ? '❤' : item.type === 'attack' ? '⚔' : '🪙'}
            <br />
            +{item.value}
          </div>
        ))}
      </div>

      <div style={roomLabelStyle}>
        房间 #{currentRoomId + 1}
      </div>
    </div>
  );
};

export default HUD;
