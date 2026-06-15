import React from 'react';
import { TreeType, Season, ForestStats, SEASON_ORDER } from './types';

interface ControlPanelProps {
  selectedTree: TreeType;
  onSelectTree: (type: TreeType) => void;
  seasonProgress: number;
  onSeasonChange: (progress: number) => void;
  planting: boolean;
  onTogglePlanting: () => void;
  onReset: () => void;
  stats: ForestStats;
}

const SEASON_LABELS: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

const TREE_LABELS: Record<TreeType, { name: string; emoji: string }> = {
  pine: { name: '松树', emoji: '🌲' },
  oak: { name: '橡树', emoji: '🌳' },
  cherry: { name: '樱花', emoji: '🌸' },
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedTree,
  onSelectTree,
  seasonProgress,
  onSeasonChange,
  planting,
  onTogglePlanting,
  onReset,
  stats,
}) => {
  const currentSeason = SEASON_ORDER[Math.min(3, Math.floor(seasonProgress * 4))];

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      width: 220,
      background: 'rgba(10, 31, 10, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 16,
      border: '1px solid rgba(76, 175, 80, 0.2)',
      padding: 20,
      color: '#C8E6C9',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: 10,
      userSelect: 'none',
    }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        color: '#A5D6A7',
        letterSpacing: 2,
      }}>
        森语流光
      </h2>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, marginBottom: 8, color: '#81C784', fontWeight: 500 }}>
          选择树种
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['pine', 'oak', 'cherry'] as TreeType[]).map(type => (
            <button
              key={type}
              onClick={() => onSelectTree(type)}
              style={{
                flex: 1,
                padding: '8px 4px',
                border: selectedTree === type
                  ? '1.5px solid #66BB6A'
                  : '1.5px solid rgba(76, 175, 80, 0.3)',
                borderRadius: 10,
                background: selectedTree === type
                  ? 'rgba(76, 175, 80, 0.2)'
                  : 'rgba(10, 31, 10, 0.4)',
                color: selectedTree === type ? '#A5D6A7' : '#81C78480',
                cursor: 'pointer',
                fontSize: 12,
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 20 }}>{TREE_LABELS[type].emoji}</span>
              <span>{TREE_LABELS[type].name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, marginBottom: 8, color: '#81C784', fontWeight: 500 }}>
          季节 — {SEASON_LABELS[currentSeason]}
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={seasonProgress}
          onChange={e => onSeasonChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#66BB6A',
            cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#81C78480',
          marginTop: 4,
        }}>
          {SEASON_ORDER.map(s => (
            <span key={s}>{SEASON_LABELS[s]}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onTogglePlanting}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderRadius: 10,
            background: planting
              ? 'linear-gradient(135deg, #66BB6A, #43A047)'
              : 'rgba(76, 175, 80, 0.15)',
            color: planting ? '#fff' : '#A5D6A7',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.25s ease',
            boxShadow: planting ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
          }}
        >
          {planting ? '🌱 播种中...' : '🌱 播种'}
        </button>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            padding: '10px 0',
            border: '1.5px solid rgba(244, 67, 54, 0.3)',
            borderRadius: 10,
            background: 'rgba(244, 67, 54, 0.1)',
            color: '#EF9A9A',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.25s ease',
          }}
        >
          重置
        </button>
      </div>

      <div style={{
        borderTop: '1px solid rgba(76, 175, 80, 0.15)',
        paddingTop: 12,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 6,
        }}>
          <span style={{ color: '#81C78480' }}>树木总数</span>
          <span style={{ color: '#A5D6A7', fontWeight: 600 }}>{stats.treeCount}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 6,
        }}>
          <span style={{ color: '#81C78480' }}>动物数量</span>
          <span style={{ color: '#A5D6A7', fontWeight: 600 }}>{stats.animalCount}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}>
          <span style={{ color: '#81C78480' }}>当前季节</span>
          <span style={{ color: '#A5D6A7', fontWeight: 600 }}>{SEASON_LABELS[stats.season]}</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
