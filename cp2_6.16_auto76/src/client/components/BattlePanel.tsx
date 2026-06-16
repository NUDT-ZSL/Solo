import React, { useState, useEffect } from 'react';
import { Player, Monster, Item, BattleState } from '../../types';
import { playClickSound, playAttackSound, playHealSound } from '../audioUtils';

interface BattlePanelProps {
  player: Player;
  monster: Monster | null;
  battleState: BattleState;
  onAttack: () => void;
  onDefend: () => void;
  onUseItem: (item: Item) => void;
  onClose: () => void;
  battleLog: string[];
}

const BattlePanel: React.FC<BattlePanelProps> = ({
  player,
  monster,
  battleState,
  onAttack,
  onDefend,
  onUseItem,
  battleLog
}) => {
  const [showItems, setShowItems] = useState(false);
  const [monsterShake, setMonsterShake] = useState(false);
  const [playerShield, setPlayerShield] = useState(false);

  useEffect(() => {
    if (battleState.monsterAnimation === 'hit') {
      setMonsterShake(true);
      const timer = setTimeout(() => setMonsterShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [battleState.monsterAnimation]);

  useEffect(() => {
    if (battleState.playerAnimation === 'defend') {
      setPlayerShield(true);
      const timer = setTimeout(() => setPlayerShield(false), 300);
      return () => clearTimeout(timer);
    }
  }, [battleState.playerAnimation]);

  if (!monster) return null;

  const monsterHpPercent = (monster.hp / monster.maxHp) * 100;

  const renderMonsterSprite = () => {
    const size = monster.isBoss ? 96 : 64;
    return (
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          transform: monsterShake ? 'translateX(4px)' : 'translateX(0)',
          transition: 'transform 0.05s ease',
          filter: monsterShake
            ? 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)'
            : 'none',
          transitionProperty: 'transform, filter',
          transitionDuration: '0.1s'
        }}
      >
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
          {monster.isBoss ? (
            <>
              <rect x="3" y="1" width="10" height="2" fill="#e8e8e8" />
              <rect x="2" y="2" width="12" height="6" fill="#e8e8e8" />
              <rect x="3" y="4" width="2" height="2" fill="#1a1a2e" />
              <rect x="11" y="4" width="2" height="2" fill="#1a1a2e" />
              <rect x="6" y="6" width="4" height="1" fill="#1a1a2e" />
              <rect x="7" y="7" width="2" height="1" fill="#1a1a2e" />
              <rect x="4" y="8" width="8" height="5" fill="#e8e8e8" />
              <rect x="2" y="9" width="2" height="4" fill="#e8e8e8" />
              <rect x="12" y="9" width="2" height="4" fill="#e8e8e8" />
              <rect x="5" y="13" width="2" height="3" fill="#e8e8e8" />
              <rect x="9" y="13" width="2" height="3" fill="#e8e8e8" />
              <rect x="3" y="3" width="10" height="1" fill="#ff0000" />
            </>
          ) : (
            <>
              <rect x="5" y="2" width="6" height="5" fill="#7cb342" />
              <rect x="4" y="3" width="1" height="3" fill="#7cb342" />
              <rect x="11" y="3" width="1" height="3" fill="#7cb342" />
              <rect x="6" y="4" width="1" height="1" fill="#1a1a2e" />
              <rect x="9" y="4" width="1" height="1" fill="#1a1a2e" />
              <rect x="7" y="6" width="2" height="1" fill="#1a1a2e" />
              <rect x="5" y="7" width="6" height="4" fill="#558b2f" />
              <rect x="6" y="11" width="2" height="2" fill="#558b2f" />
              <rect x="8" y="11" width="2" height="2" fill="#558b2f" />
            </>
          )}
        </svg>
      </div>
    );
  };

  const renderPlayerSprite = () => {
    return (
      <div style={{ position: 'relative' }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 16 16"
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="6" y="2" width="4" height="4" fill="#ffd4a3" />
          <rect x="5" y="3" width="1" height="1" fill="#1a1a2e" />
          <rect x="10" y="3" width="1" height="1" fill="#1a1a2e" />
          <rect x="5" y="6" width="6" height="5" fill="#3b82f6" />
          <rect x="4" y="7" width="1" height="3" fill="#3b82f6" />
          <rect x="11" y="7" width="1" height="3" fill="#3b82f6" />
          <rect x="12" y="5" width="1" height="4" fill="#c0c0c0" />
          <rect x="12" y="4" width="1" height="1" fill="#ffd700" />
          <rect x="6" y="11" width="2" height="3" fill="#1e3a5f" />
          <rect x="8" y="11" width="2" height="3" fill="#1e3a5f" />
        </svg>
        {playerShield && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '3px solid rgba(59, 130, 246, 0.6)',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              animation: 'pulse 0.3s ease-out',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 360,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 20,
        boxSizing: 'border-box',
        border: '2px solid #8b0000',
        boxShadow: '0 4px 20px rgba(139, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid #3d3d3d'
        }}
      >
        <h2
          style={{
            color: '#ef4444',
            fontSize: monster.isBoss ? 20 : 16,
            margin: 0,
            fontFamily: 'monospace',
            textShadow: monster.isBoss ? '0 0 10px #ff0000' : 'none'
          }}
        >
          {monster.isBoss && '💀 '}
          {monster.name}
          {monster.isBoss && ' 💀'}
        </h2>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
          height: monster.isBoss ? 120 : 80
        }}
      >
        {renderMonsterSprite()}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4
          }}
        >
          <span style={{ color: '#f5e6d3', fontSize: 12, fontFamily: 'monospace' }}>
            HP
          </span>
          <span style={{ color: '#d4a373', fontSize: 12, fontFamily: 'monospace' }}>
            {monster.hp}/{monster.maxHp}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 16,
            backgroundColor: '#0d0d15',
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid #3d3d3d'
          }}
        >
          <div
            style={{
              width: `${monsterHpPercent}%`,
              height: '100%',
              backgroundColor: monster.isBoss ? '#a855f7' : '#4ade80',
              transition: 'width 0.2s ease, background-color 0.2s ease',
              borderRadius: 3
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
          gap: 20
        }}
      >
        {renderPlayerSprite()}
        <div style={{ color: '#d4a373', fontSize: 24 }}>⚔️</div>
      </div>

      <div
        style={{
          backgroundColor: '#0d0d15',
          borderRadius: 6,
          padding: 10,
          marginBottom: 16,
          height: 80,
          overflowY: 'auto',
          border: '1px solid #3d3d3d'
        }}
      >
        {battleLog.slice(-5).map((log, index) => (
          <div
            key={index}
            style={{
              color: '#f5e6d3',
              fontSize: 11,
              fontFamily: 'monospace',
              marginBottom: 4,
              lineHeight: 1.4
            }}
          >
            {log}
          </div>
        ))}
      </div>

      {!showItems ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <button
            onClick={() => {
              playAttackSound();
              onAttack();
            }}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 8,
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              active: {
                transform: 'scale(0.98)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              } as any
            }}
            onMouseEnter={(e) => {
              playClickSound();
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98) translateY(0.5px)';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
          >
            ⚔️ 攻击
          </button>

          <button
            onClick={() => {
              playClickSound();
              onDefend();
            }}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 8,
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              playClickSound();
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98) translateY(0.5px)';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
          >
            🛡️ 防御
          </button>

          <button
            onClick={() => {
              playClickSound();
              setShowItems(true);
            }}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 8,
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              playClickSound();
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98) translateY(0.5px)';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
          >
            🎒 使用道具 ({player.inventory.length})
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10
            }}
          >
            <span style={{ color: '#d4a373', fontSize: 13, fontFamily: 'monospace' }}>
              选择道具
            </span>
            <button
              onClick={() => {
                playClickSound();
                setShowItems(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#f5e6d3',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {player.inventory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: '#666',
                  padding: 20,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
              >
                背包是空的
              </div>
            ) : (
              player.inventory.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    playHealSound();
                    onUseItem(item);
                    setShowItems(false);
                  }}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: '#2d2d2d',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    border: '1px solid #3d3d3d',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3d3d3d';
                    e.currentTarget.style.borderColor = '#d4a373';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2d2d2d';
                    e.currentTarget.style.borderColor = '#3d3d3d';
                  }}
                >
                  <span style={{ fontSize: 20, marginRight: 10 }}>
                    {item.type === 'potion' ? '🧪' : item.type === 'scroll' ? '📜' : '💰'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: '#f5e6d3',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        color: '#888',
                        fontSize: 10,
                        fontFamily: 'monospace'
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattlePanel;
