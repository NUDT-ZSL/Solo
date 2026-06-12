import React, { useCallback, useState, useRef, useEffect } from 'react';
import { GameState, TowerType, TOWER_CONFIG } from '../game/types';
import { io, Socket } from 'socket.io-client';

interface UIPanelProps {
  state: GameState;
  onPlaceTower: (type: TowerType) => void;
  onUpgradeTower: (towerId: string) => void;
  onFreezeSkill: () => void;
  onStartGame: () => void;
  onNextWave: () => void;
}

export default function UIPanel({ state, onPlaceTower, onUpgradeTower, onFreezeSkill, onStartGame, onNextWave }: UIPanelProps) {
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [prevGold, setPrevGold] = useState(state.gold);
  const [prevWood, setPrevWood] = useState(state.wood);
  const [goldAnimating, setGoldAnimating] = useState(false);
  const [woodAnimating, setWoodAnimating] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001', { autoConnect: false, transports: ['websocket'] });
    socket.on('connect', () => {
      console.log('[UIPanel] Socket.io connected');
    });
    socket.on('connect_error', () => {});
    socketRef.current = socket;

    socket.on('state:update', (newState: GameState) => {
      if (newState.gold !== prevGold) setGoldAnimating(true);
      if (newState.wood !== prevWood) setWoodAnimating(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (state.gold !== prevGold) {
      setGoldAnimating(true);
      setPrevGold(state.gold);
      const timer = setTimeout(() => setGoldAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.gold, prevGold]);

  useEffect(() => {
    if (state.wood !== prevWood) {
      setWoodAnimating(true);
      setPrevWood(state.wood);
      const timer = setTimeout(() => setWoodAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.wood, prevWood]);

  const emitAction = useCallback((action: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`action:${action}`, data);
    }
  }, []);

  const handleTowerSelect = useCallback((type: TowerType) => {
    setSelectedTower(prev => prev === type ? null : type);
    onPlaceTower(type);
  }, [onPlaceTower]);

  const handleUpgrade = useCallback((towerId: string) => {
    onUpgradeTower(towerId);
    emitAction('upgradeTower', { towerId });
  }, [onUpgradeTower, emitAction]);

  const handleFreeze = useCallback(() => {
    onFreezeSkill();
    emitAction('freezeSkill');
  }, [onFreezeSkill, emitAction]);

  const handleStart = useCallback(() => {
    onStartGame();
    emitAction('startGame');
  }, [onStartGame, emitAction]);

  const handleNextWave = useCallback(() => {
    onNextWave();
    emitAction('nextWave');
  }, [onNextWave, emitAction]);

  const freezeCooldown = state.freezeCooldownEnd > performance.now();
  const freezeActive = state.freezeActive;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px',
      background: '#16213e',
      borderRadius: '12px',
      border: '1px solid #3a3a5c',
      minWidth: '220px',
      fontFamily: 'monospace',
      color: '#e0e0e0',
      fontSize: '13px'
    }}>
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        padding: '8px 12px',
        background: '#1a1a2e',
        borderRadius: '8px',
        border: '1px solid #3a3a5c'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#ffd700' }}>💰</span>
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: goldAnimating ? 'translateY(-4px)' : 'translateY(0)'
          }}>
            {state.gold}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#8b4513' }}>🪵</span>
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.3s ease',
            transform: woodAnimating ? 'translateY(-4px)' : 'translateY(0)'
          }}>
            {state.wood}
          </span>
        </div>
      </div>

      <div style={{
        padding: '8px 12px',
        background: '#1a1a2e',
        borderRadius: '8px',
        border: '1px solid #3a3a5c',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>❤️</span>
        <div style={{ flex: 1, height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(state.lives / 20) * 100}%`,
            background: state.lives > 10 ? '#4caf50' : state.lives > 5 ? '#ff9800' : '#f44336',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span>{state.lives}/20</span>
      </div>

      <div style={{
        padding: '6px 12px',
        background: '#1a1a2e',
        borderRadius: '8px',
        border: '1px solid #3a3a5c',
        textAlign: 'center'
      }}>
        波次: {state.wave}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#888', fontSize: '11px' }}>放置防御塔:</span>
        {(['arrow', 'cannon', 'magic'] as TowerType[]).map(type => {
          const config = TOWER_CONFIG[type];
          const label = type === 'arrow' ? '箭塔' : type === 'cannon' ? '炮塔' : '魔法塔';
          const canAfford = state.gold >= config.cost.gold && state.wood >= config.cost.wood;
          const isSelected = selectedTower === type;
          return (
            <button
              key={type}
              onClick={() => handleTowerSelect(type)}
              style={{
                padding: '8px 10px',
                background: isSelected ? '#2a4a6b' : '#1a1a2e',
                border: `1px solid ${isSelected ? '#4a8abf' : '#3a3a5c'}`,
                borderRadius: '8px',
                color: canAfford ? '#e0e0e0' : '#666',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                fontFamily: 'monospace'
              }}
              onMouseEnter={e => {
                if (canAfford) {
                  (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#3a5a7b' : '#2a2a4e';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = isSelected ? '#2a4a6b' : '#1a1a2e';
                (e.currentTarget as HTMLButtonElement).style.transform = isSelected ? 'translateY(-2px)' : 'translateY(0)';
              }}
            >
              <div>{label} (射程{config.range}格)</div>
              <div style={{ fontSize: '10px', color: '#888' }}>
                💰{config.cost.gold} 🪵{config.cost.wood} | 伤害{config.damage}
              </div>
            </button>
          );
        })}
      </div>

      {state.towers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ color: '#888', fontSize: '11px' }}>升级防御塔:</span>
          {state.towers.map(tower => {
            const config = TOWER_CONFIG[tower.type];
            const label = tower.type === 'arrow' ? '箭塔' : tower.type === 'cannon' ? '炮塔' : '魔法塔';
            const upgradeCost = { gold: 50 * tower.level, wood: 30 * tower.level };
            const canUpgrade = tower.level < 3 && state.gold >= upgradeCost.gold && state.wood >= upgradeCost.wood;
            return (
              <button
                key={tower.id}
                onClick={() => canUpgrade && handleUpgrade(tower.id)}
                style={{
                  padding: '6px 10px',
                  background: '#1a1a2e',
                  border: '1px solid #3a3a5c',
                  borderRadius: '8px',
                  color: canUpgrade ? '#e0e0e0' : '#666',
                  cursor: canUpgrade ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  fontFamily: 'monospace'
                }}
                onMouseEnter={e => {
                  if (canUpgrade) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#2a2a4e';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                {label} Lv.{tower.level} → Lv.{tower.level + 1} (💰{upgradeCost.gold} 🪵{upgradeCost.wood})
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={handleFreeze}
        disabled={freezeActive || freezeCooldown}
        style={{
          padding: '8px 10px',
          background: freezeActive ? '#1a3a5a' : freezeCooldown ? '#1a1a2e' : '#1a3a5a',
          border: `1px solid ${freezeActive ? '#4488cc' : freezeCooldown ? '#333' : '#4488cc'}`,
          borderRadius: '8px',
          color: freezeActive || freezeCooldown ? '#666' : '#88ccff',
          cursor: freezeActive || freezeCooldown ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          transition: 'all 0.2s ease',
          fontFamily: 'monospace'
        }}
        onMouseEnter={e => {
          if (!freezeActive && !freezeCooldown) {
            (e.currentTarget as HTMLButtonElement).style.background = '#2a4a6a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#1a3a5a';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        }}
      >
        ❄️ 冻结技能 {freezeActive ? '(生效中)' : freezeCooldown ? '(冷却中)' : ''}
      </button>

      {!state.isPlaying ? (
        <button
          onClick={handleStart}
          style={{
            padding: '10px',
            background: '#2a5a3a',
            border: '1px solid #4a8a5a',
            borderRadius: '8px',
            color: '#88ff88',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            fontFamily: 'monospace'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3a7a4a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#2a5a3a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          开始游戏
        </button>
      ) : (
        <button
          onClick={handleNextWave}
          style={{
            padding: '8px',
            background: '#2a4a6b',
            border: '1px solid #4a8abf',
            borderRadius: '8px',
            color: '#88bbff',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s ease',
            fontFamily: 'monospace'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3a5a7b';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#2a4a6b';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          下一波
        </button>
      )}
    </div>
  );
}
