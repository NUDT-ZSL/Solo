import React from 'react';
import { Player } from '../../types';

interface PlayerPanelProps {
  player: Player;
}

const StatBar: React.FC<{
  value: number;
  maxValue: number;
  color: string;
  label: string;
  icon: string;
}> = ({ value, maxValue, color, label, icon }) => {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4
        }}
      >
        <span style={{ color: '#f5e6d3', fontSize: 12, fontFamily: 'monospace' }}>
          {icon} {label}
        </span>
        <span style={{ color: '#d4a373', fontSize: 12, fontFamily: 'monospace' }}>
          {value}/{maxValue}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 12,
          backgroundColor: '#1a1a2e',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #3d3d3d'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.2s ease, background-color 0.2s ease',
            borderRadius: 3
          }}
        />
      </div>
    </div>
  );
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ player }) => {
  return (
    <div
      style={{
        width: 200,
        backgroundColor: '#1e1e2e',
        borderRadius: 12,
        padding: 16,
        boxSizing: 'border-box',
        border: '2px solid #d4a373',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid #3d3d3d'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#3b82f6',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginRight: 12,
            border: '2px solid #d4a373'
          }}
        >
          ⚔️
        </div>
        <div>
          <div
            style={{
              color: '#f5e6d3',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace'
            }}
          >
            勇者
          </div>
          <div style={{ color: '#d4a373', fontSize: 11, fontFamily: 'monospace' }}>
            地牢探险者
          </div>
        </div>
      </div>

      <StatBar
        value={player.hp}
        maxValue={player.maxHp}
        color={player.hp > player.maxHp * 0.3 ? '#4ade80' : '#ef4444'}
        label="生命值"
        icon="❤️"
      />

      <StatBar
        value={player.hunger}
        maxValue={player.maxHunger}
        color={player.hunger > player.maxHunger * 0.3 ? '#fbbf24' : '#ef4444'}
        label="饱食度"
        icon="🍖"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #3d3d3d'
        }}
      >
        <div
          style={{
            backgroundColor: '#1a1a2e',
            padding: 8,
            borderRadius: 6,
            textAlign: 'center',
            border: '1px solid #3d3d3d'
          }}
        >
          <div style={{ fontSize: 16 }}>⚔️</div>
          <div style={{ color: '#f5e6d3', fontSize: 11, fontFamily: 'monospace' }}>
            攻击
          </div>
          <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' }}>
            {player.attack}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1a1a2e',
            padding: 8,
            borderRadius: 6,
            textAlign: 'center',
            border: '1px solid #3d3d3d'
          }}
        >
          <div style={{ fontSize: 16 }}>🛡️</div>
          <div style={{ color: '#f5e6d3', fontSize: 11, fontFamily: 'monospace' }}>
            防御
          </div>
          <div style={{ color: '#3b82f6', fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' }}>
            {player.defense}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 10,
          backgroundColor: '#1a1a2e',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #ffd700'
        }}
      >
        <span style={{ fontSize: 18, marginRight: 8 }}>💰</span>
        <span
          style={{
            color: '#ffd700',
            fontSize: 16,
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          {player.gold}
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 8,
          backgroundColor: '#1a1a2e',
          borderRadius: 6,
          border: '1px solid #3d3d3d'
        }}
      >
        <div
          style={{
            color: '#d4a373',
            fontSize: 11,
            marginBottom: 6,
            fontFamily: 'monospace'
          }}
        >
          🎒 背包 ({player.inventory.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {player.inventory.length === 0 ? (
            <span style={{ color: '#666', fontSize: 10, fontFamily: 'monospace' }}>
              空空如也
            </span>
          ) : (
            player.inventory.slice(0, 6).map(item => (
              <div
                key={item.id}
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  border: '1px solid #3d3d3d'
                }}
                title={item.name}
              >
                {item.type === 'potion' ? '🧪' : item.type === 'scroll' ? '📜' : '💰'}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
