import React from 'react';
import { TowerType, TOWER_CONFIGS } from '../game/types';
import { Tower } from '../game/Tower';

interface HUDProps {
  hp: number;
  maxHp: number;
  gold: number;
  wave: number;
  minerCount: number;
  nextWaveTimer: number;
  waveInProgress: boolean;
  selectedTowerType: TowerType | null;
  selectedPlacedTower: Tower | null;
  onSelectTowerType: (type: TowerType | null) => void;
  onStartWave: () => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp, maxHp, gold, wave, minerCount,
  nextWaveTimer, waveInProgress,
  selectedTowerType, selectedPlacedTower,
  onSelectTowerType, onStartWave,
  onUpgradeTower, onSellTower,
}) => {
  const towerTypes: TowerType[] = ['attract', 'repel', 'lock'];
  const towerNames: Record<TowerType, string> = {
    attract: '吸引炮塔',
    repel: '排斥炮塔',
    lock: '锁定炮塔',
  };
  const towerIcons: Record<TowerType, string> = {
    attract: '⊶',
    repel: '⊷',
    lock: '🔒',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div style={{
        display: 'flex',
        gap: 16,
        background: 'rgba(10, 12, 40, 0.85)',
        padding: '12px 20px',
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(68, 136, 255, 0.3)',
        pointerEvents: 'auto',
      }}>
        <StatItem
          label="水晶血量"
          value={`${hp} / ${maxHp}`}
          color={hp / maxHp > 0.3 ? '#44FF88' : '#FF4466'}
          bar={{ value: hp, max: maxHp }}
        />
        <StatItem
          label="金币"
          value={`💰 ${gold}`}
          color="#FFD700"
        />
        <StatItem
          label="波次"
          value={`第 ${wave} 波`}
          color="#88AAFF"
        />
        <StatItem
          label="场上矿石"
          value={`${minerCount}`}
          color="#FF8866"
        />
        {!waveInProgress && wave < 99 && (
          <StatItem
            label="下一波"
            value={`${Math.ceil(nextWaveTimer)}s`}
            color="#AADDFF"
          />
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}>
        {!waveInProgress && !selectedPlacedTower && (
          <button
            onClick={onStartWave}
            style={buttonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3E4C6D')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2A2D5A')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ⚡ 立即开始下一波
          </button>
        )}

        {selectedPlacedTower && (
          <div style={{
            background: 'rgba(10, 12, 40, 0.9)',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255, 215, 0, 0.4)',
            minWidth: 200,
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: towerColors[selectedPlacedTower.state.type],
              marginBottom: 8,
            }}>
              {towerNames[selectedPlacedTower.state.type]} · Lv.{selectedPlacedTower.state.level}
            </div>
            <div style={{ fontSize: 12, color: '#AABBCC', marginBottom: 4 }}>
              范围: {Math.round(selectedPlacedTower.getRadius())}px
            </div>
            <div style={{ fontSize: 12, color: '#AABBCC', marginBottom: 10 }}>
              伤害/效果: {selectedPlacedTower.getDamage().toFixed(1) || '磁力'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedPlacedTower.canUpgrade() && (
                <button
                  onClick={onUpgradeTower}
                  disabled={gold < selectedPlacedTower.getUpgradeCost()}
                  style={{
                    ...buttonStyle,
                    padding: '6px 12px',
                    fontSize: 12,
                    opacity: gold < selectedPlacedTower.getUpgradeCost() ? 0.5 : 1,
                    cursor: gold < selectedPlacedTower.getUpgradeCost() ? 'not-allowed' : 'pointer',
                  }}
                >
                  升级 💰{selectedPlacedTower.getUpgradeCost()}
                </button>
              )}
              <button
                onClick={onSellTower}
                style={{
                  ...buttonStyle,
                  padding: '6px 12px',
                  fontSize: 12,
                  background: '#5A2D3A',
                }}
              >
                出售 💰{Math.floor(selectedPlacedTower.getConfig().cost * 0.6)}
              </button>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: 10,
          background: 'rgba(10, 12, 40, 0.85)',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid rgba(68, 136, 255, 0.3)',
        }}>
          {towerTypes.map((type) => {
            const config = TOWER_CONFIGS[type];
            const selected = selectedTowerType === type;
            const canAfford = gold >= config.cost;
            return (
              <button
                key={type}
                onClick={() => onSelectTowerType(selected ? null : type)}
                disabled={!canAfford}
                style={{
                  ...towerButtonStyle,
                  border: selected ? `2px solid #FFD700` : `1px solid ${config.color}`,
                  boxShadow: selected ? `0 0 15px rgba(255, 215, 0, 0.5)` : `0 0 8px ${config.color}33`,
                  opacity: canAfford ? 1 : 0.45,
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  background: selected ? 'rgba(255, 215, 0, 0.1)' : '#1A1D3A',
                }}
              >
                <div style={{
                  fontSize: 22,
                  color: config.color,
                  marginBottom: 4,
                  filter: `drop-shadow(0 0 4px ${config.color})`,
                }}>
                  {towerIcons[type]}
                </div>
                <div style={{ fontSize: 11, color: '#CCDDEE', marginBottom: 2 }}>
                  {towerNames[type]}
                </div>
                <div style={{ fontSize: 11, color: '#FFD700' }}>
                  💰 {config.cost}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const towerColors: Record<TowerType, string> = {
  attract: '#4488FF',
  repel: '#FF6644',
  lock: '#AA66FF',
};

const buttonStyle: React.CSSProperties = {
  background: '#2A2D5A',
  color: '#FFFFFF',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const towerButtonStyle: React.CSSProperties = {
  width: 90,
  padding: '10px 8px',
  borderRadius: 10,
  textAlign: 'center',
  transition: 'all 0.15s ease',
  color: '#fff',
};

interface StatItemProps {
  label: string;
  value: string;
  color: string;
  bar?: { value: number; max: number };
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, bar }) => {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 11, color: '#8899BB', marginBottom: 4, letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 'bold',
        color,
        textShadow: `0 0 8px ${color}55`,
        marginBottom: bar ? 4 : 0,
      }}>
        {value}
      </div>
      {bar && (
        <div style={{
          width: 90,
          height: 5,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${(bar.value / bar.max) * 100}%`,
            height: '100%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </div>
  );
};
