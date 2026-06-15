import React, { useMemo } from 'react';
import { GameData } from '../types';

export interface HUDProps {
  playerHp: number;
  playerMaxHp: number;
  playerGold: number;
  playerAttack: number;
  inventory: { id: string; type: string; value: number; name?: string }[];
  roomNumber: number;
  transitionAlpha: number;
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
  background: 'rgba(255,255,255,0.1)',
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
  textShadow: '0 0 4px rgba(255,68,68,0.5)',
};

const goldStyle: React.CSSProperties = {
  color: '#ffd700',
  fontWeight: 'bold',
  fontSize: 16,
  textShadow: '0 0 4px rgba(255,215,0,0.5)',
};

const attackStyle: React.CSSProperties = {
  color: '#ff8844',
  fontWeight: 'bold',
  fontSize: 14,
};

const inventoryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
};

const itemSlotStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: '1px solid rgba(255,255,255,0.27)',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  color: '#dddddd',
  background: 'rgba(0,0,0,0.3)',
  overflow: 'hidden',
  textAlign: 'center',
  lineHeight: 1.1,
  padding: 2,
  flexDirection: 'column',
};

const roomLabelStyle: React.CSSProperties = {
  color: '#888899',
  fontSize: 13,
  padding: '4px 10px',
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 4,
};

const hpBarStyle = (ratio: number): React.CSSProperties => ({
  width: 90,
  height: 8,
  background: 'rgba(0,0,0,0.5)',
  borderRadius: 4,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.1)',
  position: 'relative',
});

const hpBarFillStyle = (ratio: number): React.CSSProperties => ({
  width: `${Math.max(0, ratio) * 100}%`,
  height: '100%',
  background:
    ratio > 0.5
      ? 'linear-gradient(180deg, #ff6666, #cc2222)'
      : ratio > 0.25
      ? 'linear-gradient(180deg, #ffaa22, #cc7700)'
      : 'linear-gradient(180deg, #ff2222, #990000)',
  transition: 'width 0.15s ease-out',
});

function HUDItemSlot({ item }: { item: { type: string; value: number } }) {
  let icon = '?';
  let color = '#cccccc';
  if (item.type === 'heal') {
    icon = '❤';
    color = '#ff6666';
  } else if (item.type === 'attack') {
    icon = '⚔';
    color = '#ff9955';
  } else if (item.type === 'gold') {
    icon = '🪙';
    color = '#ffd700';
  }
  return (
    <div style={{ ...itemSlotStyle, borderColor: `${color}55` }}>
      <span style={{ color, fontSize: 13, lineHeight: 1 }}>{icon}</span>
      <span style={{ color, fontSize: 9, marginTop: 1 }}>+{item.value}</span>
    </div>
  );
}

const HUD: React.FC<HUDProps> = React.memo(function HUD({
  playerHp,
  playerMaxHp,
  playerGold,
  playerAttack,
  inventory,
  roomNumber,
  transitionAlpha,
}) {
  const hpRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 0;
  const recentItems = useMemo(() => inventory.slice(-5), [inventory]);

  return (
    <div
      style={{
        ...hudContainerStyle,
        opacity: Math.max(0.3, transitionAlpha),
        transition: 'opacity 0.1s linear',
      }}
    >
      <div style={sectionStyle}>
        <span style={{ fontSize: 16 }}>❤</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={hpStyle}>
            {playerHp}
            <span style={{ color: '#666666', fontWeight: 'normal', fontSize: 12 }}>
              /{playerMaxHp}
            </span>
          </span>
          <div style={hpBarStyle(hpRatio)}>
            <div style={hpBarFillStyle(hpRatio)} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={{ fontSize: 16 }}>🪙</span>
        <span style={goldStyle}>{playerGold}</span>
      </div>

      <div style={sectionStyle}>
        <span style={{ fontSize: 14 }}>⚔</span>
        <span style={attackStyle}>{playerAttack}</span>
      </div>

      <div style={inventoryStyle}>
        {recentItems.length === 0 ? (
          <div style={{ ...itemSlotStyle, opacity: 0.5 }}>
            <span style={{ fontSize: 18, opacity: 0.4 }}>·</span>
          </div>
        ) : (
          recentItems.map((it) => <HUDItemSlot key={it.id} item={it} />)
        )}
      </div>

      <div style={roomLabelStyle}>第 {roomNumber + 1} 层</div>
    </div>
  );
});

export function createHUDPropsFromGameData(data: GameData): HUDProps {
  return {
    playerHp: data.player.hp,
    playerMaxHp: data.player.maxHp,
    playerGold: data.player.gold,
    playerAttack: data.player.attack,
    inventory: data.player.inventory,
    roomNumber: data.currentRoomId,
    transitionAlpha: data.transitionAlpha,
  };
}

export default HUD;
