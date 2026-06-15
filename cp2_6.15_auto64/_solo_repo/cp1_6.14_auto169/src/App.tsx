import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Castle,
  Shield,
  Hammer,
  ArrowUp,
  Gem,
  Flag,
  Clock,
  Coins,
  Home,
  Swords,
  Users,
} from 'lucide-react';
import { MapEngine } from './MapEngine';
import { CombatSimulator } from './CombatSimulator';
import { eventBus } from './eventBus';
import type {
  Building,
  BuildingType,
  LogEntry,
  PlayerId,
  Unit,
} from './types';
import {
  BARRACKS_UPGRADE_COST,
  BUILDING_COSTS,
  GAME_DURATION,
  GRID_SIZE,
  HUMAN_PLAYER,
  PLAYER_COLORS,
  PLAYER_NAMES,
} from './types';
import { isAdjacent } from './utils/bfs';

let _logId = 0;
const makeLogId = () => `log_${++_logId}_${Date.now().toString(36)}`;

type BuildMenuState = { x: number; y: number } | null;

type UIState = {
  gridVersion: number;
  resources: Record<string, number>;
  territories: Record<string, number>;
  logs: LogEntry[];
  timeRemaining: number;
  isGameOver: boolean;
  winner: PlayerId | 'draw' | null;
  selectedCell: { x: number; y: number } | null;
  buildMenu: BuildMenuState;
  unitsVersion: number;
};

const App: React.FC = () => {
  const mapEngineRef = useRef<MapEngine | null>(null);
  const combatSimRef = useRef<CombatSimulator | null>(null);
  const rafRef = useRef<number>(0);
  const gameStartRef = useRef<number>(0);
  const lastAiTickRef = useRef<number>(0);
  const lastCombatTickRef = useRef<number>(0);
  const lastRenderTickRef = useRef<number>(0);
  const uiStateRef = useRef<UIState>({
    gridVersion: 0,
    resources: {},
    territories: {},
    logs: [],
    timeRemaining: GAME_DURATION,
    isGameOver: false,
    winner: null,
    selectedCell: null,
    buildMenu: null,
    unitsVersion: 0,
  });

  const [uiVersion, setUiVersion] = useState(0);
  const forceUpdate = useCallback(() => setUiVersion((v) => v + 1), []);

  const state = uiStateRef.current;

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const log: LogEntry = {
      id: makeLogId(),
      time: Math.floor(performance.now() / 1000),
      message,
      type,
    };
    state.logs.push(log);
    if (state.logs.length > 100) state.logs.shift();
  }, [state]);

  const resetGame = useCallback(() => {
    eventBus.clear();

    const engine = new MapEngine();
    mapEngineRef.current = engine;
    const combat = new CombatSimulator(engine);
    combatSimRef.current = combat;

    gameStartRef.current = performance.now();
    lastAiTickRef.current = 0;
    lastCombatTickRef.current = 0;
    lastRenderTickRef.current = 0;

    state.gridVersion = 0;
    state.resources = {};
    state.territories = {};
    for (const pid of Object.keys(engine.players)) {
      state.resources[pid] = engine.players[pid].resources;
      state.territories[pid] = engine.players[pid].territoryCount;
    }
    state.logs = [];
    state.timeRemaining = GAME_DURATION;
    state.isGameOver = false;
    state.winner = null;
    state.selectedCell = null;
    state.buildMenu = null;
    state.unitsVersion = 0;

    addLog('⚔️ 游戏开始！占领超过50%网格以获胜', 'info');
    addLog('💡 点击己方领地后，再点击相邻格子可建造', 'info');

    eventBus.on('log:add', (data) => {
      addLog(data.message, data.type);
    });

    eventBus.on('resource:update', ({ playerId, amount }) => {
      state.resources[playerId] = amount;
    });

    eventBus.on('territory:change', () => {
      for (const pid of Object.keys(engine.players)) {
        state.territories[pid] = engine.players[pid].territoryCount;
      }
    });

    forceUpdate();
  }, [state, addLog, forceUpdate]);

  useEffect(() => {
    resetGame();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      eventBus.clear();
    };
  }, [resetGame]);

  useEffect(() => {
    const engine = mapEngineRef.current;
    const combat = combatSimRef.current;
    if (!engine || !combat) return;

    let stopped = false;

    const loop = (now: number) => {
      if (stopped) return;

      const elapsed = (now - gameStartRef.current) / 1000;
      state.timeRemaining = Math.max(0, GAME_DURATION - Math.floor(elapsed));

      if (!state.isGameOver) {
        try {
          engine.processBuildingProduction(now);
          engine.processSpawns(now);

          for (const unit of engine.units.values()) {
            if (!unit) continue;
            if (unit.trail.length > 0) {
              for (const t of unit.trail) t.alpha -= 0.06;
              unit.trail = unit.trail.filter((t) => t.alpha > 0);
            }
            const hasTarget = engine.getEnemyCombatTargetsForUnit(unit) != null;
            if (!hasTarget) {
              engine.stepUnitTowardsTarget(unit, now);
            }
          }
          state.unitsVersion++;

          if (now - lastCombatTickRef.current >= 500) {
            lastCombatTickRef.current = now;
            const combatEvents = engine.findCombatEventsForTurn();
            if (combatEvents.length > 0) {
              combat.resolveAllCombatEvents(combatEvents);
            }
          }

          if (now - lastAiTickRef.current >= 1500) {
            lastAiTickRef.current = now;
            runAITurn(engine, combat, now);
          }

          if (state.timeRemaining <= 0) {
            endGame();
          } else {
            const threshold = GRID_SIZE * GRID_SIZE * 0.5;
            for (const pid of ['player1', 'player2', 'player3', 'player4'] as PlayerId[]) {
              if ((state.territories[pid] || 0) > threshold) {
                state.winner = pid;
                state.isGameOver = true;
                addLog(`🏆 ${PLAYER_NAMES[pid]} 提前达成超过50%领地！`, 'capture');
                break;
              }
            }
          }
        } catch (e) {
          console.error('Game loop error:', e);
        }
      }

      if (now - lastRenderTickRef.current >= 33) {
        lastRenderTickRef.current = now;
        state.gridVersion++;
        forceUpdate();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endGame = useCallback(() => {
    if (state.isGameOver) return;
    state.isGameOver = true;
    let bestCount = -1;
    let bestPlayers: PlayerId[] = [];
    for (const pid of ['player1', 'player2', 'player3', 'player4'] as PlayerId[]) {
      const c = state.territories[pid] || 0;
      if (c > bestCount) {
        bestCount = c;
        bestPlayers = [pid];
      } else if (c === bestCount) {
        bestPlayers.push(pid);
      }
    }
    if (bestPlayers.length === 1) {
      state.winner = bestPlayers[0];
      addLog(`🏆 ${PLAYER_NAMES[bestPlayers[0]]} 获得胜利！`, 'capture');
    } else {
      state.winner = 'draw';
      addLog('🎯 平局！多方领地数量相同', 'info');
    }
  }, [state, addLog]);

  const runAITurn = (engine: MapEngine, combat: CombatSimulator, now: number) => {
    void now;
    const aiPlayers = (['player2', 'player3', 'player4'] as PlayerId[]);

    for (const pid of aiPlayers) {
      const playerData = engine.players[pid];
      if (!playerData) continue;
      let resources = playerData.resources;

      const ownedCells: { x: number; y: number }[] = [];
      let barracksCount = 0;
      let towerCount = 0;
      let barracksToUpgrade: { x: number; y: number; b: Building } | null = null;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const c = engine.grid[y][x];
          if (c.owner === pid) {
            ownedCells.push({ x, y });
            if (c.building) {
              if (c.building.type === 'barracks') {
                barracksCount++;
                if (combat.canUpgrade(c.building) && !barracksToUpgrade) {
                  barracksToUpgrade = { x, y, b: c.building };
                }
              } else if (c.building.type === 'tower') {
                towerCount++;
              }
            }
          }
        }
      }

      if (barracksToUpgrade && resources >= BARRACKS_UPGRADE_COST) {
        const up = combat.upgradeBuilding(
          barracksToUpgrade.b,
          resources,
          barracksToUpgrade.x,
          barracksToUpgrade.y
        );
        if (up.success) {
          resources -= up.cost;
          playerData.resources = resources;
          eventBus.emit('resource:update', { playerId: pid, amount: resources });
          eventBus.emit('log:add', {
            message: `${PLAYER_NAMES[pid]}升级了兵营`,
            type: 'build',
          });
        }
      }

      if (ownedCells.length === 0) continue;

      const buildCandidates: { x: number; y: number }[] = [];
      const seen = new Set<string>();
      for (const cell of ownedCells) {
        const adjs = [
          { x: cell.x + 1, y: cell.y },
          { x: cell.x - 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 },
          { x: cell.x, y: cell.y - 1 },
        ];
        for (const adj of adjs) {
          if (adj.x < 0 || adj.x >= GRID_SIZE || adj.y < 0 || adj.y >= GRID_SIZE) continue;
          const k = `${adj.x},${adj.y}`;
          if (seen.has(k)) continue;
          seen.add(k);
          const c = engine.grid[adj.y][adj.x];
          if (c.building) continue;
          buildCandidates.push(adj);
        }
      }

      if (buildCandidates.length === 0) continue;

      const wants: { type: BuildingType; priority: number }[] = [];
      if (barracksCount < 2) wants.push({ type: 'barracks', priority: 5 });
      if (towerCount < 1) wants.push({ type: 'tower', priority: 3 });
      wants.push({ type: 'barracks', priority: 2 });
      if (Math.random() < 0.5) wants.push({ type: 'tower', priority: 1 });

      for (const want of wants.sort((a, b) => b.priority - a.priority)) {
        const cost = BUILDING_COSTS[want.type];
        if (resources < cost) continue;
        const shuffled = buildCandidates.sort(() => Math.random() - 0.5);
        for (const cand of shuffled) {
          const res = engine.placeBuilding(cand.x, cand.y, want.type, pid);
          if (res.ok) {
            resources -= cost;
            playerData.resources = resources;
            eventBus.emit('resource:update', { playerId: pid, amount: resources });
            eventBus.emit('log:add', {
              message: `${PLAYER_NAMES[pid]}建造了${want.type === 'tower' ? '防御塔' : '兵营'}`,
              type: 'build',
            });
            break;
          }
        }
        if (resources < 5) break;
      }
    }
  };

  const handleCellClick = useCallback((x: number, y: number) => {
    if (state.isGameOver) return;
    const engine = mapEngineRef.current;
    if (!engine) return;

    const cell = engine.grid[y][x];
    const selected = state.selectedCell;

    if (selected) {
      if (selected.x === x && selected.y === y) {
        state.selectedCell = null;
        state.buildMenu = null;
        forceUpdate();
        return;
      }

      const selectedCell = engine.grid[selected.y][selected.x];

      if (selectedCell.owner === HUMAN_PLAYER && isAdjacent(selected.x, selected.y, x, y)) {
        if (!cell.building) {
          state.buildMenu = { x, y };
          forceUpdate();
          return;
        } else if (cell.building.owner === HUMAN_PLAYER) {
          state.selectedCell = { x, y };
          state.buildMenu = null;
          forceUpdate();
          return;
        }
      }

      if (cell.owner === HUMAN_PLAYER) {
        state.selectedCell = { x, y };
        state.buildMenu = null;
        forceUpdate();
        return;
      }

      state.selectedCell = null;
      state.buildMenu = null;
      forceUpdate();
      return;
    }

    if (cell.owner === HUMAN_PLAYER) {
      state.selectedCell = { x, y };
      state.buildMenu = null;
      forceUpdate();
    }
  }, [state, forceUpdate]);

  const doPlaceBuilding = useCallback((type: BuildingType) => {
    const engine = mapEngineRef.current;
    if (!engine || !state.buildMenu) return;
    const { x, y } = state.buildMenu;

    const playerRes = state.resources[HUMAN_PLAYER] || 0;
    const cost = BUILDING_COSTS[type];
    if (playerRes < cost) {
      addLog(`❌ 资源不足（需要${cost}）`, 'info');
      return;
    }

    const canPlace = engine.canPlaceBuilding(x, y, HUMAN_PLAYER);
    if (!canPlace.ok) {
      addLog(`❌ ${canPlace.reason || '无法建造'}`, 'info');
      return;
    }

    const res = engine.placeBuilding(x, y, type, HUMAN_PLAYER);
    if (res.ok) {
      engine.players[HUMAN_PLAYER].resources = playerRes - cost;
      eventBus.emit('resource:update', {
        playerId: HUMAN_PLAYER,
        amount: engine.players[HUMAN_PLAYER].resources,
      });
      addLog(
        `🏗️ 建造${type === 'tower' ? '防御塔' : '兵营'}(-${cost}资源)`,
        'build'
      );
      state.buildMenu = null;
      state.selectedCell = null;
    } else {
      addLog(`❌ ${res.reason || '建造失败'}`, 'info');
    }
    forceUpdate();
  }, [state, addLog, forceUpdate]);

  const doUpgradeBarracks = useCallback(() => {
    const engine = mapEngineRef.current;
    const combat = combatSimRef.current;
    if (!engine || !combat || !state.selectedCell) return;
    const { x, y } = state.selectedCell;
    const cell = engine.grid[y][x];
    if (!cell.building || cell.building.type !== 'barracks') return;
    const playerRes = state.resources[HUMAN_PLAYER] || 0;
    const up = combat.upgradeBuilding(cell.building, playerRes, x, y);
    if (up.success) {
      engine.players[HUMAN_PLAYER].resources = playerRes - up.cost;
      eventBus.emit('resource:update', {
        playerId: HUMAN_PLAYER,
        amount: engine.players[HUMAN_PLAYER].resources,
      });
      addLog(`⬆️ 兵营升级成功(-${up.cost}资源)`, 'build');
      state.selectedCell = null;
    } else {
      addLog(`❌ ${up.message || '升级失败'}`, 'info');
    }
    forceUpdate();
  }, [state, addLog, forceUpdate]);

  const closeBuildMenu = useCallback(() => {
    state.buildMenu = null;
    forceUpdate();
  }, [state, forceUpdate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.build-menu') && !target.closest('.cell')) {
        if (state.buildMenu) {
          state.buildMenu = null;
          state.selectedCell = null;
          forceUpdate();
        }
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [state, forceUpdate]);

  const buildableCoords = useMemo(() => {
    const s = new Set<string>();
    const engine = mapEngineRef.current;
    if (!engine || !state.selectedCell) return s;
    const { x: sx, y: sy } = state.selectedCell;
    const sc = engine.grid[sy]?.[sx];
    if (!sc || sc.owner !== HUMAN_PLAYER) return s;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const nx = sx + dx;
      const ny = sy + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      s.add(`${nx},${ny}`);
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedCell, state.gridVersion]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const engine = mapEngineRef.current;
  if (!engine) return null;

  const humanResources = state.resources[HUMAN_PLAYER] ?? 0;
  const humanTerritory = state.territories[HUMAN_PLAYER] ?? 0;

  const playerIds = ['player1', 'player2', 'player3', 'player4'] as PlayerId[];
  const totalCells = GRID_SIZE * GRID_SIZE;

  const selectedCellForMenu = state.selectedCell
    ? engine.grid[state.selectedCell.y]?.[state.selectedCell.x]
    : null;
  const canUpgradeSelected =
    selectedCellForMenu?.building?.type === 'barracks' &&
    combatSimRef.current?.canUpgrade(selectedCellForMenu.building);

  return (
    <div className="game-root">
      <div className="game-bg-overlay" />
      <div className="game-bg-grid-lines" />

      <div className="game-header">
        <div className="game-title">REALM FORGE</div>
        <div className={`timer-display ${state.timeRemaining <= 30 ? 'warning' : ''}`}>
          <Clock size={18} style={{ verticalAlign: -3, marginRight: 6, opacity: 0.8 }} />
          {formatTime(state.timeRemaining)}
        </div>
        <div style={{ width: 180 }} />
      </div>

      <div className="info-panel">
        <div className="info-card">
          <div className="resource-row">
            <div className="resource-label">
              <span className="resource-dot" style={{ color: PLAYER_COLORS[HUMAN_PLAYER], background: PLAYER_COLORS[HUMAN_PLAYER] }} />
              <Gem size={14} />
              资源
            </div>
            <div className="resource-value" style={{ color: '#fbbf24' }}>{humanResources}</div>
          </div>
          <div className="resource-row">
            <div className="resource-label">
              <span className="resource-dot" style={{ color: PLAYER_COLORS[HUMAN_PLAYER], background: PLAYER_COLORS[HUMAN_PLAYER] }} />
              <Flag size={14} />
              领地
            </div>
            <div className="resource-value">{humanTerritory}<span style={{ fontSize: 13, opacity: 0.6 }}>/{totalCells}</span></div>
          </div>
          <div className="territory-bar">
            {playerIds.map((pid) => {
              const count = state.territories[pid] || 0;
              const width = (count / totalCells) * 100;
              return (
                <div
                  key={pid}
                  className="territory-segment"
                  style={{ width: `${width}%`, background: PLAYER_COLORS[pid] }}
                  title={`${PLAYER_NAMES[pid]}: ${count}`}
                />
              );
            })}
          </div>
        </div>

        <div className="info-card">
          <div className="resource-row">
            <div className="resource-label">
              <Users size={14} />
              阵营战况
            </div>
          </div>
          {playerIds.map((pid) => {
            const count = state.territories[pid] || 0;
            const isHuman = pid === HUMAN_PLAYER;
            return (
              <div key={pid} className="resource-row" style={{ marginBottom: 4 }}>
                <div className="resource-label" style={{ fontSize: 13, opacity: isHuman ? 1 : 0.7 }}>
                  <span
                    className="resource-dot"
                    style={{ color: PLAYER_COLORS[pid], background: PLAYER_COLORS[pid] }}
                  />
                  {PLAYER_NAMES[pid]}
                  {isHuman ? ' (你)' : ''}
                </div>
                <div className="resource-value" style={{ fontSize: 15 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-container" key={state.gridVersion}>
        {engine.grid.map((row, y) => (
          <div key={y} className="grid-row">
            {row.map((cell, x) => {
              const isSelected = state.selectedCell?.x === x && state.selectedCell?.y === y;
              const isBuildable = buildableCoords.has(`${x},${y}`);
              const ownerClass = `owner-${cell.owner}`;
              const classes = ['cell', ownerClass];
              if (cell.isResourcePoint) classes.push('resource-point');
              if (isSelected) classes.push('selected');
              if (isBuildable && !cell.building) classes.push('buildable');

              const ownerColor = PLAYER_COLORS[cell.owner] || 'rgba(255,255,255,0.3)';

              return (
                <div
                  key={`${x}-${y}`}
                  className={classes.join(' ')}
                  onClick={() => handleCellClick(x, y)}
                  data-coords={`${x},${y}`}
                >
                  {cell.isResourcePoint && <div className="resource-glow" />}

                  {cell.building && (
                    <div
                      className={`building ${cell.building.type} ${cell.building.level > 1 ? 'lvl2' : ''}`}
                      style={{
                        boxShadow: cell.building.type === 'resource' && cell.building.owner === 'neutral'
                          ? '0 0 16px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.3)'
                          : undefined,
                      }}
                      title={`${cell.building.type} Lv.${cell.building.level} | HP:${cell.building.hp}/${cell.building.maxHp}`}
                    >
                      <div className="building-icon">
                        {cell.building.type === 'resource' ? <Coins size={22} /> :
                          cell.building.type === 'tower' ? <Shield size={22} /> :
                            <Castle size={22} />}
                      </div>
                      <div className="hp-bar">
                        <div
                          className={`hp-bar-fill ${cell.building.hp < cell.building.maxHp * 0.35 ? 'low' : ''}`}
                          style={{ width: `${(cell.building.hp / cell.building.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="unit-container">
                    {(() => {
                      const u = cell.unit;
                      if (!u) return null;
                      return u.trail.map((t) => (
                        <div
                          key={t.id}
                          className="unit-trail"
                          style={{
                            left: `calc(50% + ${(t.x - x) * 100}%)`,
                            top: `calc(50% + ${(t.y - y) * 100}%)`,
                            background: PLAYER_COLORS[u.owner] || 'white',
                            opacity: Math.max(0, t.alpha * 0.5),
                            transform: `translate(-50%, -50%) scale(${0.3 + t.alpha * 0.6})`,
                          }}
                        />
                      ));
                    })()}

                    {cell.unit && (
                      <div
                        className="unit"
                        key={cell.unit.id}
                        style={{
                          color: PLAYER_COLORS[cell.unit.owner] || 'white',
                          background: PLAYER_COLORS[cell.unit.owner] || 'white',
                        }}
                        title={`${PLAYER_NAMES[cell.unit.owner]} 步兵 HP:${cell.unit.hp}/${cell.unit.maxHp}`}
                      >
                        <div
                          className="hp-bar"
                          style={{ bottom: -7, left: -8, right: -8, height: 2 }}
                        >
                          <div
                            className={`hp-bar-fill ${cell.unit.hp < cell.unit.maxHp * 0.35 ? 'low' : ''}`}
                            style={{ width: `${(cell.unit.hp / cell.unit.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="coords">{x},{y}</div>

                  {void ownerColor}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {state.buildMenu && (
        <BuildMenu
          menuState={state.buildMenu}
          onPlace={doPlaceBuilding}
          onClose={closeBuildMenu}
          resources={humanResources}
        />
      )}

      {selectedCellForMenu?.building?.type === 'barracks' && canUpgradeSelected && !state.buildMenu && (
        <UpgradeMenu
          cell={state.selectedCell!}
          onUpgrade={doUpgradeBarracks}
          onClose={() => { state.selectedCell = null; forceUpdate(); }}
          resources={humanResources}
        />
      )}

      <div className="log-panel">
        <div className="log-header">
          <span>作战日志</span>
          <button
            className="log-clear-btn"
            onClick={() => { state.logs = []; forceUpdate(); }}
          >
            清空
          </button>
        </div>
        <div className="log-list" ref={(el) => {
          if (el) el.scrollTop = el.scrollHeight;
        }}>
          {state.logs.slice(-60).map((log) => (
            <div key={log.id} className={`log-entry ${log.type}`}>
              <span className="log-time">[{formatTime(log.time % 3600)}]</span>
              {log.message}
            </div>
          ))}
        </div>
      </div>

      <div className="hint-text">
        💡 选中己方领地 → 点击相邻格子建造 | 选中兵营可升级 | 中立资源点被占领后每5秒+3资源
      </div>

      <div className="legend">
        <div className="legend-item"><span className="legend-swatch gold" /><Home size={12} /> 资源建筑</div>
        <div className="legend-item"><span className="legend-swatch tower" /><Shield size={12} /> 防御塔 (ATK 5)</div>
        <div className="legend-item"><span className="legend-swatch barracks" /><Castle size={12} /> 兵营</div>
        <div className="legend-item"><span className="legend-swatch unit" /><Swords size={12} /> 步兵 (ATK 3)</div>
      </div>

      {state.isGameOver && (
        <div className="overlay" onClick={(e) => e.stopPropagation()}>
          <div className="game-over-modal">
            <div className={`game-over-title ${state.winner === 'draw' ? 'draw' : ''}`}>
              {state.winner === 'draw'
                ? 'DRAW'
                : state.winner === HUMAN_PLAYER
                  ? 'VICTORY!'
                  : 'DEFEAT'}
            </div>
            <div className="game-over-subtitle">
              {state.winner === 'draw'
                ? '势均力敌，战斗进入僵局'
                : state.winner
                  ? `${PLAYER_NAMES[state.winner as PlayerId]} 统治了战场！`
                  : '游戏结束'}
            </div>
            <div className="score-board">
              {playerIds.map((pid) => {
                const count = state.territories[pid] || 0;
                const isWinner = state.winner === pid;
                const isHuman = pid === HUMAN_PLAYER;
                return (
                  <div key={pid} className={`score-item ${isWinner ? 'winner' : ''}`}>
                    <div className="score-name" style={{ color: PLAYER_COLORS[pid] }}>
                      {PLAYER_NAMES[pid]}{isHuman ? ' (你)' : ''}
                    </div>
                    <div className="score-value" style={{ color: PLAYER_COLORS[pid] }}>{count}</div>
                  </div>
                );
              })}
            </div>
            <button className="restart-btn" onClick={resetGame}>
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BuildMenu: React.FC<{
  menuState: { x: number; y: number };
  onPlace: (type: BuildingType) => void;
  onClose: () => void;
  resources: number;
}> = ({ menuState, onPlace, onClose, resources }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const el = document.querySelector(
      `[data-coords="${menuState.x},${menuState.y}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuW = 200;
    let left = rect.right + 12;
    let top = rect.top;
    if (left + menuW > window.innerWidth - 16) {
      left = rect.left - menuW - 12;
    }
    if (top + 260 > window.innerHeight - 16) {
      top = window.innerHeight - 276;
    }
    setPos({ top, left });
  }, [menuState]);

  const towerCost = BUILDING_COSTS.tower;
  const barracksCost = BUILDING_COSTS.barracks;

  return (
    <div
      ref={ref}
      className="build-menu"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`build-option ${resources < towerCost ? 'disabled' : ''}`}
        onClick={() => {
          if (resources >= towerCost) onPlace('tower');
        }}
      >
        <div className="build-option-label">
          <Shield size={18} style={{ color: '#94a3b8' }} />
          防御塔
        </div>
        <div className="build-cost">{towerCost}⚡</div>
      </div>
      <div
        className={`build-option ${resources < barracksCost ? 'disabled' : ''}`}
        onClick={() => {
          if (resources >= barracksCost) onPlace('barracks');
        }}
      >
        <div className="build-option-label">
          <Castle size={18} style={{ color: '#a78bfa' }} />
          兵营
        </div>
        <div className="build-cost">{barracksCost}⚡</div>
      </div>
      <div
        className="build-option"
        style={{ fontSize: 12, opacity: 0.6, justifyContent: 'center' }}
        onClick={onClose}
      >
        取消
      </div>
    </div>
  );
};

const UpgradeMenu: React.FC<{
  cell: { x: number; y: number };
  onUpgrade: () => void;
  onClose: () => void;
  resources: number;
}> = ({ cell, onUpgrade, onClose, resources }) => {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const el = document.querySelector(
      `[data-coords="${cell.x},${cell.y}"]`
    ) as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuW = 200;
    let left = rect.right + 12;
    let top = rect.top;
    if (left + menuW > window.innerWidth - 16) left = rect.left - menuW - 12;
    if (top + 180 > window.innerHeight - 16) top = window.innerHeight - 196;
    setPos({ top, left });
  }, [cell]);

  const canUp = resources >= BARRACKS_UPGRADE_COST;

  return (
    <div
      className="build-menu"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`build-option ${canUp ? '' : 'disabled'}`}
        onClick={() => canUp && onUpgrade()}
      >
        <div className="build-option-label">
          <ArrowUp size={18} style={{ color: '#fbbf24' }} />
          <Hammer size={16} style={{ color: '#a78bfa', marginLeft: -8 }} />
          升级兵营至 Lv.2
        </div>
        <div className="build-cost">{BARRACKS_UPGRADE_COST}⚡</div>
      </div>
      <div
        className="build-option"
        style={{ fontSize: 12, opacity: 0.6, justifyContent: 'center' }}
        onClick={onClose}
      >
        关闭
      </div>
    </div>
  );
};

export default App;
