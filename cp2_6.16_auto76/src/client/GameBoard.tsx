import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Monster, Chest, GameStats, BattleState, GamePhase, Item, Position } from '../types';
import { createDungeon, DungeonGenerator } from './DungeonGenerator';
import { battleStep, useItem, generateChestLoot } from './BattleSystem';
import { movePlayer, getAdjacentMonsters } from './PlayerController';
import { getNextStepTowards } from './pathfinding';
import { playChestSound, playBossWarningSound, playHitSound } from './audioUtils';

import MapRenderer from './components/MapRenderer';
import MiniMap from './components/MiniMap';
import PlayerPanel from './components/PlayerPanel';
import BattlePanel from './components/BattlePanel';
import EndScreen from './components/EndScreen';
import ParticleEffect from './components/ParticleEffect';

interface GameBoardProps {
  onBackToMenu: () => void;
  onViewLeaderboard: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ onBackToMenu, onViewLeaderboard }) => {
  const [dungeon, setDungeon] = useState<DungeonGenerator | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [chests, setChests] = useState<Chest[]>([]);
  const [playerRenderPos, setPlayerRenderPos] = useState<Position>({ x: 0, y: 0 });
  const [playerDirection, setPlayerDirection] = useState<string>('down');
  const [isMoving, setIsMoving] = useState(false);

  const [battleState, setBattleState] = useState<BattleState>({
    isActive: false,
    monster: null,
    turn: 'player',
    playerAnimation: 'idle',
    monsterAnimation: 'idle',
    bossAttackTurn: 0,
    screenShake: false
  });
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [currentMonsterIndex, setCurrentMonsterIndex] = useState<number>(-1);

  const [gameStats, setGameStats] = useState<GameStats>({
    steps: 0,
    kills: 0,
    chestsOpened: 0,
    victory: false,
    playerName: '',
    timestamp: 0
  });

  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [screenShake, setScreenShake] = useState(false);
  const [particles, setParticles] = useState<{ id: string; x: number; y: number; type: string }[]>([]);
  const moveAnimationRef = useRef<number>();
  const lastMoveTimeRef = useRef<number>(0);

  const initGame = useCallback(() => {
    const newDungeon = createDungeon();
    const startPos = newDungeon.getPlayerStartPosition();

    const newPlayer: Player = {
      position: { ...startPos },
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 5,
      hunger: 100,
      maxHunger: 100,
      gold: 0,
      inventory: [],
      isDefending: false
    };

    newDungeon.markExplored(startPos.x, startPos.y, 4);

    setDungeon(newDungeon);
    setPlayer(newPlayer);
    setPlayerRenderPos({ ...startPos });
    setMonsters([...newDungeon.getMonsters()]);
    setChests([...newDungeon.getChests()]);
    setGameStats({
      steps: 0,
      kills: 0,
      chestsOpened: 0,
      victory: false,
      playerName: '',
      timestamp: 0
    });
    setBattleState({
      isActive: false,
      monster: null,
      turn: 'player',
      playerAnimation: 'idle',
      monsterAnimation: 'idle',
      bossAttackTurn: 0,
      screenShake: false
    });
    setBattleLog([]);
    setCurrentMonsterIndex(-1);
    setGamePhase('playing');
    setPlayerDirection('down');
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const addParticles = (x: number, y: number, type: string) => {
    const id = Math.random().toString(36);
    setParticles(prev => [...prev, { id, x, y, type }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const checkChestPickup = useCallback((pos: Position) => {
    if (!dungeon) return;

    const chestIndex = chests.findIndex(
      c => c.position.x === pos.x && c.position.y === pos.y && !c.opened
    );

    if (chestIndex >= 0) {
      const chest = chests[chestIndex];
      const loot = generateChestLoot();

      playChestSound();
      addParticles(pos.x * 32 + 16, pos.y * 32 + 16, 'chest');

      setChests(prev => {
        const updated = [...prev];
        updated[chestIndex] = { ...updated[chestIndex], opened: true };
        return updated;
      });

      if (loot.type === 'coin') {
        setPlayer(prev => {
          if (!prev) return prev;
          return { ...prev, gold: prev.gold + loot.value };
        });
      } else {
        setPlayer(prev => {
          if (!prev) return prev;
          return { ...prev, inventory: [...prev.inventory, loot] };
        });
      }

      setGameStats(prev => ({ ...prev, chestsOpened: prev.chestsOpened + 1 }));
    }
  }, [dungeon, chests]);

  const triggerBattle = useCallback((monsterIndex: number) => {
    const monster = monsters[monsterIndex];
    if (!monster) return;

    if (monster.isBoss) {
      playBossWarningSound();
    }

    setCurrentMonsterIndex(monsterIndex);
    setBattleState({
      isActive: true,
      monster: { ...monster },
      turn: 'player',
      playerAnimation: 'idle',
      monsterAnimation: 'idle',
      bossAttackTurn: 0,
      screenShake: false
    });
    setBattleLog([`遭遇了 ${monster.name}！`]);
    setGamePhase('battle');
  }, [monsters]);

  const movePlayerHandler = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!dungeon || !player || battleState.isActive || isMoving || gamePhase !== 'playing') return;

    const now = Date.now();
    if (now - lastMoveTimeRef.current < 150) return;
    lastMoveTimeRef.current = now;

    const result = movePlayer(player, direction, dungeon);

    if (result.moved) {
      setIsMoving(true);
      setPlayerDirection(direction);

      const startPos = { ...player.position };
      const endPos = result.newPosition;
      const startTime = performance.now();
      const duration = 150;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        setPlayerRenderPos({
          x: startPos.x + (endPos.x - startPos.x) * easeProgress,
          y: startPos.y + (endPos.y - startPos.y) * easeProgress
        });

        if (progress < 1) {
          moveAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setIsMoving(false);
        }
      };

      moveAnimationRef.current = requestAnimationFrame(animate);

      setPlayer(result.player);
      dungeon.markExplored(result.newPosition.x, result.newPosition.y, 4);
      setDungeon({ ...dungeon });

      setGameStats(prev => ({ ...prev, steps: prev.steps + 1 }));

      setTimeout(() => checkChestPickup(result.newPosition), 100);

      const adjacent = getAdjacentMonsters(result.newPosition, monsters);
      if (adjacent.length > 0) {
        setTimeout(() => {
          triggerBattle(adjacent[0]);
        }, 200);
      }

      if (result.player.hp <= 0) {
        setGamePhase('defeat');
      }
    }
  }, [dungeon, player, battleState.isActive, isMoving, gamePhase, monsters, checkChestPickup, triggerBattle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== 'playing' && gamePhase !== 'battle') return;

      const key = e.key.toLowerCase();

      if (gamePhase === 'playing') {
        switch (key) {
          case 'w':
          case 'arrowup':
            e.preventDefault();
            movePlayerHandler('up');
            break;
          case 's':
          case 'arrowdown':
            e.preventDefault();
            movePlayerHandler('down');
            break;
          case 'a':
          case 'arrowleft':
            e.preventDefault();
            movePlayerHandler('left');
            break;
          case 'd':
          case 'arrowright':
            e.preventDefault();
            movePlayerHandler('right');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayerHandler, gamePhase]);

  useEffect(() => {
    if (!dungeon || !player || battleState.isActive || gamePhase !== 'playing') return;

    const moveInterval = setInterval(() => {
      setMonsters(prevMonsters => {
        const updated = [...prevMonsters];

        for (let i = 0; i < updated.length; i++) {
          const monster = updated[i];
          if (monster.hp <= 0) continue;

          const playerRoom = dungeon.getRoomAtPosition(player.position);
          const monsterRoom = dungeon.getRoomAtPosition(monster.position);

          const inSameRoomOrCorridor =
            playerRoom && monsterRoom && playerRoom.id === monsterRoom.id;

          const dist = Math.abs(player.position.x - monster.position.x) +
                       Math.abs(player.position.y - monster.position.y);

          if (inSameRoomOrCorridor || dist < 8) {
            const nextStep = getNextStepTowards(
              monster.position,
              player.position,
              dungeon.getMapData()
            );

            if (nextStep) {
              const isAdjacent =
                Math.abs(player.position.x - nextStep.x) +
                Math.abs(player.position.y - nextStep.y) === 1;

              if (!isAdjacent) {
                const occupied = updated.some(
                  (m, idx) => idx !== i && m.hp > 0 &&
                    m.position.x === nextStep.x && m.position.y === nextStep.y
                );

                if (!occupied) {
                  updated[i] = {
                    ...monster,
                    position: nextStep
                  };
                }
              } else if (dist > 1) {
                // Monster is adjacent after moving - trigger battle
                setTimeout(() => triggerBattle(i), 100);
              }
            }
          }
        }

        return updated;
      });
    }, 2000);

    return () => clearInterval(moveInterval);
  }, [dungeon, player, battleState.isActive, gamePhase, triggerBattle]);

  const handleAttack = () => {
    if (!player || !battleState.monster || currentMonsterIndex < 0) return;

    playHitSound();

    const result = battleStep(
      player,
      battleState.monster,
      'attack',
      undefined,
      battleState.bossAttackTurn
    );

    setPlayer(result.player);
    setBattleLog(prev => [...prev, ...result.log]);

    if (result.screenShake) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }

    if (result.monsterDefeated) {
      setMonsters(prev => {
        const updated = [...prev];
        if (currentMonsterIndex < updated.length) {
          updated[currentMonsterIndex] = {
            ...updated[currentMonsterIndex],
            hp: 0
          };
        }
        return updated;
      });

      setGameStats(prev => ({ ...prev, kills: prev.kills + 1 }));
      setBattleState(prev => ({ ...prev, isActive: false, monster: null }));

      const defeatedMonster = monsters[currentMonsterIndex];
      if (defeatedMonster?.isBoss) {
        setTimeout(() => {
          setGameStats(prev => ({ ...prev, victory: true }));
          setGamePhase('victory');
        }, 500);
      } else {
        setTimeout(() => setGamePhase('playing'), 800);
      }
    } else {
      setBattleState(prev => ({
        ...prev,
        monster: result.monster,
        playerAnimation: 'attack',
        monsterAnimation: 'hit',
        bossAttackTurn: result.battleState.bossAttackTurn,
        screenShake: result.screenShake
      }));
    }

    if (result.playerDefeated) {
      setTimeout(() => setGamePhase('defeat'), 500);
    }
  };

  const handleDefend = () => {
    if (!player || !battleState.monster) return;

    const result = battleStep(
      player,
      battleState.monster,
      'defend',
      undefined,
      battleState.bossAttackTurn
    );

    setPlayer(result.player);
    setBattleLog(prev => [...prev, ...result.log]);

    if (result.screenShake) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }

    setBattleState(prev => ({
      ...prev,
      monster: result.monster,
      playerAnimation: 'defend',
      monsterAnimation: 'attack',
      bossAttackTurn: result.battleState.bossAttackTurn,
      screenShake: result.screenShake
    }));

    if (result.playerDefeated) {
      setTimeout(() => setGamePhase('defeat'), 500);
    }
  };

  const handleUseItem = (item: Item) => {
    if (!player || !battleState.monster) return;

    const result = battleStep(
      player,
      battleState.monster,
      'item',
      item,
      battleState.bossAttackTurn
    );

    setPlayer(result.player);
    setBattleLog(prev => [...prev, ...result.log]);

    if (result.screenShake) {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    }

    setBattleState(prev => ({
      ...prev,
      monster: result.monster,
      playerAnimation: 'idle',
      monsterAnimation: 'attack',
      bossAttackTurn: result.battleState.bossAttackTurn,
      screenShake: result.screenShake
    }));

    if (result.playerDefeated) {
      setTimeout(() => setGamePhase('defeat'), 500);
    }
  };

  const handleSaveScore = (name: string) => {
    const stats = {
      ...gameStats,
      playerName: name,
      timestamp: Date.now()
    };

    fetch('/api/saveScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats)
    }).catch(err => console.error('Failed to save score:', err));
  };

  if (!dungeon || !player) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4a373',
          fontFamily: 'monospace'
        }}
      >
        正在生成地牢...
      </div>
    );
  }

  const mapSize = dungeon.getMapSize();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#2d2d2d',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        transform: screenShake ? 'translate(3px, -2px)' : 'translate(0, 0)',
        transition: screenShake ? 'none' : 'transform 0.1s ease'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50
        }}
      >
        <PlayerPanel player={player} />
        <button
          onClick={onBackToMenu}
          style={{
            marginTop: 10,
            width: 200,
            padding: '8px',
            borderRadius: 8,
            backgroundColor: '#3d3d3d',
            color: '#f5e6d3',
            border: '1px solid #555',
            fontSize: 12,
            fontFamily: 'monospace',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4d4d4d';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3d3d3d';
          }}
        >
          ← 返回主菜单
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <MiniMap
          mapData={dungeon.getMapData()}
          explored={dungeon.getExploredMap()}
          playerPosition={player.position}
          monsters={monsters.filter(m => m.hp > 0)}
          rooms={dungeon.getRoomList()}
          mapSize={mapSize}
        />

        <div style={{ position: 'relative' }}>
          <MapRenderer
            mapData={dungeon.getMapData()}
            explored={dungeon.getExploredMap()}
            playerPosition={player.position}
            playerRenderPos={playerRenderPos}
            chests={chests}
            monsters={monsters.filter(m => m.hp > 0)}
            rooms={dungeon.getRoomList()}
            playerDirection={playerDirection}
          />

          {particles.map(p => (
            <ParticleEffect
              key={p.id}
              active={true}
              x={p.x}
              y={p.y}
              type={p.type as any}
              count={15}
            />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#888',
            fontSize: 11,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '6px 12px',
            borderRadius: 6
          }}
        >
          WASD / 方向键移动 | 走向怪物触发战斗 | 找到右下角的BOSS
        </div>
      </div>

      {battleState.isActive && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 50
          }}
        >
          <BattlePanel
            player={player}
            monster={battleState.monster}
            battleState={battleState}
            onAttack={handleAttack}
            onDefend={handleDefend}
            onUseItem={handleUseItem}
            onClose={() => {}}
            battleLog={battleLog}
          />
        </div>
      )}

      {(gamePhase === 'victory' || gamePhase === 'defeat') && (
        <EndScreen
          victory={gamePhase === 'victory'}
          stats={gameStats}
          onRestart={initGame}
          onLeaderboard={onViewLeaderboard}
          onSaveScore={handleSaveScore}
        />
      )}
    </div>
  );
};

export default GameBoard;
