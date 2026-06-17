import React, { useState } from 'react';
import {
  BulletConfig,
  EnemyConfig,
  BulletType,
  HitReactionType,
  BULLET_PRESET_COLORS,
  BULLET_TYPE_LABELS,
  HIT_REACTION_LABELS,
} from '../types';

interface EditorPanelProps {
  bulletConfig: BulletConfig;
  enemyConfig: EnemyConfig;
  onApply: (bullet: BulletConfig, enemy: EnemyConfig) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type TabType = 'bullet' | 'enemy';

const EditorPanel: React.FC<EditorPanelProps> = ({
  bulletConfig,
  enemyConfig,
  onApply,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('bullet');
  const [localBullet, setLocalBullet] = useState<BulletConfig>({ ...bulletConfig });
  const [localEnemy, setLocalEnemy] = useState<EnemyConfig>({ ...enemyConfig });

  const handleApply = () => {
    onApply({ ...localBullet }, { ...localEnemy });
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    textAlign: 'center',
    cursor: 'pointer',
    background: isActive ? '#2D2D2D' : 'transparent',
    color: isActive ? '#FF6B35' : '#999',
    border: 'none',
    borderBottom: isActive ? '2px solid #FF6B35' : '2px solid transparent',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: '#999',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: '#2D2D2D',
    color: '#DDD',
    border: '1px solid #444',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    appearance: 'none',
    cursor: 'pointer',
  };

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const sliderValueStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#FF6B35',
    minWidth: '28px',
    textAlign: 'right',
    fontFamily: 'monospace',
  };

  const colorGridStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: '#2D2D2D',
    color: '#DDD',
    border: '1px solid #444',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  };

  const applyBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 0',
    background: '#FF6B35',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    letterSpacing: '0.5px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  if (collapsed) {
    return (
      <div
        style={{
          background: '#1E1E1E',
          borderRadius: '0 0 12px 12px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#FF6B35', fontSize: '13px', fontWeight: 600 }}>
            配置面板
          </span>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: '1px solid #444',
              color: '#999',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'all 0.2s ease',
            }}
          >
            展开
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={localBullet.type}
            onChange={(e) => setLocalBullet({ ...localBullet, type: e.target.value as BulletType })}
            style={{ ...selectStyle, width: 'auto', flex: 1, minWidth: '120px' }}
          >
            {Object.entries(BULLET_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={localEnemy.hitReaction}
            onChange={(e) =>
              setLocalEnemy({ ...localEnemy, hitReaction: e.target.value as HitReactionType })
            }
            style={{ ...selectStyle, width: 'auto', flex: 1, minWidth: '120px' }}
          >
            {Object.entries(HIT_REACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button onClick={handleApply} style={{ ...applyBtnStyle, width: 'auto', padding: '8px 20px' }}>
            应用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        background: '#1E1E1E',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        color: '#DDD',
        boxSizing: 'border-box',
        overflowY: 'auto',
        maxHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          marginBottom: '20px',
          borderBottom: '1px solid #333',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <button style={tabStyle(activeTab === 'bullet')} onClick={() => setActiveTab('bullet')}>
          子弹配置
        </button>
        <button style={tabStyle(activeTab === 'enemy')} onClick={() => setActiveTab('enemy')}>
          敌人配置
        </button>
      </div>

      {activeTab === 'bullet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>子弹类型</label>
            <select
              value={localBullet.type}
              onChange={(e) =>
                setLocalBullet({ ...localBullet, type: e.target.value as BulletType })
              }
              style={selectStyle}
            >
              {Object.entries(BULLET_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>子弹大小</label>
            <div style={sliderContainerStyle}>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={localBullet.bulletSize}
                onChange={(e) =>
                  setLocalBullet({ ...localBullet, bulletSize: Number(e.target.value) })
                }
                style={{ flex: 1, accentColor: '#FF6B35' }}
              />
              <span style={sliderValueStyle}>{localBullet.bulletSize}px</span>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>子弹颜色</label>
            <div style={colorGridStyle}>
              {BULLET_PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setLocalBullet({ ...localBullet, bulletColor: color })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: color,
                    border:
                      localBullet.bulletColor === color
                        ? '3px solid #FFF'
                        : '3px solid transparent',
                    outline:
                      localBullet.bulletColor === color ? '2px solid #FF6B35' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'enemy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>受击类型</label>
            <select
              value={localEnemy.hitReaction}
              onChange={(e) =>
                setLocalEnemy({ ...localEnemy, hitReaction: e.target.value as HitReactionType })
              }
              style={selectStyle}
            >
              {Object.entries(HIT_REACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>敌人血量</label>
            <input
              type="number"
              min={1}
              max={10}
              value={localEnemy.health}
              onChange={(e) => {
                const val = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                setLocalEnemy({ ...localEnemy, health: val });
              }}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={handleApply}
          style={applyBtnStyle}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#FF8C00';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#FF6B35';
          }}
        >
          应用配置
        </button>
      </div>
    </div>
  );
};

export default EditorPanel;
