import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { SpellType } from './SpellSystem';

interface UILayerProps {
  engine: GameEngine;
}

const SPELL_NAMES: Record<SpellType, string> = {
  fireball: '火球',
  icespike: '冰刺',
  teleport: '传送',
};

const SPELL_COLORS: Record<SpellType, string> = {
  fireball: '#ff6622',
  icespike: '#aaddff',
  teleport: '#cc66ff',
};

const SPELL_DESC: Record<SpellType, (level: number) => string> = {
  fireball: (l) => `伤害: ${25 + (l - 1) * 10}`,
  icespike: (l) => `减速: ${2 + (l - 1)}秒`,
  teleport: (l) => `冷却: ${Math.max(3, 5 - (l - 1) * 2)}秒`,
};

export function UILayer({ engine }: UILayerProps) {
  const [state, setState] = useState<GameState>(engine.state);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    return engine.onStateChange((s) => {
      setState({ ...s });
    });
  }, [engine]);

  const handleUpgrade = useCallback((spell: SpellType) => {
    engine.upgradeSpell(spell);
  }, [engine]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine]);

  const player = state.player;
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const now = performance.now();

  const rootStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
  };

  const hudStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const barOuter: React.CSSProperties = {
    width: '200px',
    height: '16px',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
  };

  const barInner: React.CSSProperties = {
    height: '100%',
    width: `${hpPercent}%`,
    background: hpPercent > 50
      ? 'linear-gradient(90deg, #44ff88, #22cc66)'
      : hpPercent > 25
        ? 'linear-gradient(90deg, #ffaa22, #ff6622)'
        : 'linear-gradient(90deg, #ff4444, #cc2222)',
    borderRadius: '8px',
    transition: 'width 0.3s ease',
  };

  const labelStyle: React.CSSProperties = {
    color: '#ccccee',
    fontSize: '13px',
    textShadow: '0 0 6px rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const spellBarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
  };

  const spellSlotStyle = (spell: SpellType, selected: boolean): React.CSSProperties => ({
    width: '56px',
    height: '56px',
    borderRadius: '10px',
    background: selected
      ? `rgba(${spell === 'fireball' ? '255,102,34' : spell === 'icespike' ? '170,221,255' : '204,102,255'},0.3)`
      : 'rgba(20,20,30,0.6)',
    border: selected
      ? `2px solid ${SPELL_COLORS[spell]}`
      : '2px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  });

  const cooldownOverlay = (spell: SpellType): React.CSSProperties => {
    const pct = state.spellSystem.getCooldownPercent(spell, now);
    return {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: `${(1 - pct) * 100}%`,
      background: 'rgba(0,0,0,0.5)',
      transition: 'height 0.1s linear',
    };
  };

  const upgradeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    pointerEvents: 'auto',
    cursor: 'pointer',
  };

  const upgradePanelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    right: '16px',
    width: '240px',
    background: 'rgba(15,15,25,0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '16px',
    pointerEvents: 'auto',
  };

  const upgradeItemStyle = (spell: SpellType): React.CSSProperties => ({
    padding: '10px',
    marginBottom: '8px',
    borderRadius: '10px',
    background: `rgba(${spell === 'fireball' ? '255,102,34' : spell === 'icespike' ? '170,221,255' : '204,102,255'},0.1)`,
    border: `1px solid rgba(${spell === 'fireball' ? '255,102,34' : spell === 'icespike' ? '170,221,255' : '204,102,255'},0.3)`,
    cursor: player.fragments >= 5 && state.spellSystem.levels[spell] < 5 ? 'pointer' : 'default',
    opacity: player.fragments >= 5 && state.spellSystem.levels[spell] < 5 ? 1 : 0.5,
    transition: 'all 0.2s ease',
  });

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(15,15,25,0.75)',
    backdropFilter: 'blur(12px)',
    color: '#ccccee',
    cursor: 'pointer',
    fontSize: '13px',
    pointerEvents: 'auto',
  };

  return (
    <div style={rootStyle}>
      <div style={hudStyle}>
        <div style={labelStyle}>
          <span style={{ color: '#ff6666' }}>❤</span>
          <span>{player.hp} / {player.maxHp}</span>
        </div>
        <div style={barOuter}>
          <div style={barInner} />
        </div>
        <div style={labelStyle}>
          <span style={{ color: '#44ffaa' }}>◆</span>
          <span>能量碎片: {player.fragments}</span>
        </div>
        <div style={labelStyle}>
          <span style={{ color: '#88ffdd' }}>⬡</span>
          <span>第 {state.floorNumber} 层 | 房间 {state.currentRoom + 1}/{state.floor.roomCount}</span>
        </div>
        {player.hasKey && (
          <div style={{ ...labelStyle, color: '#ffdd44' }}>
            🔑 已获得传送钥匙
          </div>
        )}
      </div>

      <div style={spellBarStyle}>
        {(['fireball', 'icespike', 'teleport'] as SpellType[]).map((spell, i) => (
          <div
            key={spell}
            style={spellSlotStyle(spell, state.selectedSpell === spell)}
            onClick={() => engine.selectSpell(spell)}
          >
            <div style={cooldownOverlay(spell)} />
            <span style={{
              fontSize: '18px',
              color: SPELL_COLORS[spell],
              textShadow: `0 0 8px ${SPELL_COLORS[spell]}`,
              position: 'relative',
              zIndex: 1,
            }}>
              {spell === 'fireball' ? '🔥' : spell === 'icespike' ? '❄' : '⚡'}
            </span>
            <span style={{
              fontSize: '10px',
              color: '#888899',
              position: 'relative',
              zIndex: 1,
            }}>
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <div style={upgradeBtnStyle}>
        <div
          style={{
            ...btnBase,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: upgradeOpen
              ? 'rgba(100,60,180,0.4)'
              : 'rgba(15,15,25,0.75)',
            borderColor: upgradeOpen
              ? 'rgba(153,102,255,0.5)'
              : 'rgba(255,255,255,0.2)',
          }}
          onClick={() => setUpgradeOpen(!upgradeOpen)}
        >
          <span style={{ color: '#9966ff' }}>⬆</span>
          <span>法术升级</span>
          {player.fragments >= 5 && (
            <span style={{
              background: '#44ffaa',
              color: '#000',
              borderRadius: '8px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: 'bold',
            }}>
              !
            </span>
          )}
        </div>
      </div>

      {upgradeOpen && (
        <div style={upgradePanelStyle}>
          <div style={{
            color: '#ccccee',
            fontSize: '14px',
            marginBottom: '12px',
            fontWeight: 'bold',
          }}>
            法术升级 ({player.fragments}/5 碎片)
          </div>
          {(['fireball', 'icespike', 'teleport'] as SpellType[]).map(spell => (
            <div
              key={spell}
              style={upgradeItemStyle(spell)}
              onClick={() => handleUpgrade(spell)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}>
                <span style={{
                  color: SPELL_COLORS[spell],
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}>
                  {SPELL_NAMES[spell]}
                </span>
                <span style={{ color: '#888899', fontSize: '12px' }}>
                  Lv.{state.spellSystem.levels[spell]}
                </span>
              </div>
              <div style={{ color: '#aaaacc', fontSize: '12px' }}>
                {SPELL_DESC[spell](state.spellSystem.levels[spell])}
              </div>
              {state.spellSystem.levels[spell] < 5 && (
                <div style={{
                  color: player.fragments >= 5 ? '#44ffaa' : '#666677',
                  fontSize: '11px',
                  marginTop: '4px',
                }}>
                  {player.fragments >= 5 ? '点击升级' : '需要5个碎片'}
                </div>
              )}
              {state.spellSystem.levels[spell] >= 5 && (
                <div style={{ color: '#ffcc44', fontSize: '11px', marginTop: '4px' }}>
                  已满级
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {state.gameover && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          pointerEvents: 'auto',
        }}>
          <div style={{
            color: '#ff4444',
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '0 0 30px #ff0000',
            marginBottom: '20px',
          }}>
            你已陨落
          </div>
          <div style={{ color: '#aaaacc', fontSize: '16px', marginBottom: '30px' }}>
            到达第 {state.floorNumber} 层
          </div>
          <div
            style={{
              ...btnBase,
              fontSize: '16px',
              padding: '12px 32px',
              background: 'rgba(255,68,68,0.3)',
              borderColor: 'rgba(255,68,68,0.5)',
              color: '#ff6666',
            }}
            onClick={handleRestart}
          >
            重新挑战
          </div>
        </div>
      )}
    </div>
  );
}
