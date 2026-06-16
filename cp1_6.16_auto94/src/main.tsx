import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Direction, GameState, Player, Monster, Torch, TileType } from './types';
import {
  MAP_SIZE,
  TILE_SIZE,
  INITIAL_LIGHT_RADIUS,
  MONSTER_COUNT,
  TORCH_COUNT,
  generateBSPDungeon,
  findStartPosition,
  calculateVisibility,
  movePlayer,
  pickUpTorch,
  updateTorchTimer,
  placeRandomItems,
  moveMonsters,
  updateExploredCount,
  checkWinCondition,
  countFloorTiles
} from './core';
import './styles.css';

const COLORS = {
  WALL: '#2C3E50',
  FLOOR: '#7F8C8D',
  PLAYER: '#F1C40F',
  MONSTER: '#E74C3C',
  TORCH: '#FFD700',
  BORDER: '#34495E',
  DARK: '#000000',
  FOG: 'rgba(0, 0, 0, 0.8)'
};

function initGame(): GameState {
  const map = generateBSPDungeon(MAP_SIZE);
  const startPos = findStartPosition(map);

  const player: Player = {
    position: startPos,
    name: '探险者',
    health: 10,
    maxHealth: 10,
    lightRadius: INITIAL_LIGHT_RADIUS,
    baseLightRadius: INITIAL_LIGHT_RADIUS,
    torchesPickedUp: 0,
    torchTimer: 0,
    exploredCount: 0
  };

  const monsterPositions = placeRandomItems(map, startPos, MONSTER_COUNT);
  const monsters: Monster[] = monsterPositions.map((pos, i) => ({
    id: i,
    position: pos,
    alive: true,
    moveCounter: 0,
    path: []
  }));

  const torchPositions = placeRandomItems(map, startPos, TORCH_COUNT);
  const torches: Torch[] = torchPositions.map((pos, i) => ({
    id: i,
    position: pos,
    pickedUp: false
  }));

  const { visible, brightness } = calculateVisibility(map, startPos, player.lightRadius);
  
  const updatedMap = map.map(row => row.map(tile => {
    const key = `${tile.x},${tile.y}`;
    const b = brightness.get(key) || 0;
    return { ...tile, visible: visible.has(key), brightness: b };
  }));

  const { map: exploredMap, count } = updateExploredCount(updatedMap, visible, 0);

  return {
    map: exploredMap,
    player: { ...player, exploredCount: count },
    monsters,
    torches,
    turn: 1,
    visibleTiles: visible,
    gameWon: false,
    inBattle: false,
    battleMonsterId: null,
    battleTimer: 0
  };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => initGame());
  const [animatingValues, setAnimatingValues] = useState<Set<string>>(new Set());
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const brightnessCacheRef = useRef<Map<string, number>>(new Map());

  const totalTiles = MAP_SIZE * MAP_SIZE;

  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    const fogCanvas = fogCanvasRef.current;
    if (!canvas || !fogCanvas) return;

    const ctx = canvas.getContext('2d');
    const fogCtx = fogCanvas.getContext('2d');
    if (!ctx || !fogCtx) return;

    const { map, player, monsters, torches, visibleTiles, inBattle, battleTimer } = gameState;
    const width = MAP_SIZE * TILE_SIZE;
    const height = MAP_SIZE * TILE_SIZE;

    ctx.fillStyle = COLORS.DARK;
    ctx.fillRect(0, 0, width, height);

    fogCtx.clearRect(0, 0, width, height);

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = map[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const key = `${x},${y}`;

        if (visibleTiles.has(key)) {
          const brightness = tile.brightness;
          
          if (tile.type === TileType.WALL) {
            ctx.fillStyle = adjustBrightness(COLORS.WALL, brightness);
          } else {
            ctx.fillStyle = adjustBrightness(COLORS.FLOOR, brightness);
          }
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          ctx.strokeStyle = adjustBrightness(COLORS.BORDER, brightness);
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        } else if (tile.explored) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = COLORS.DARK;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const key = `${x},${y}`;
        if (visibleTiles.has(key)) {
          const tile = map[y][x];
          if (tile.type === TileType.FLOOR) {
            const dist = Math.sqrt(
              Math.pow(x - player.position.x, 2) + 
              Math.pow(y - player.position.y, 2)
            );
            if (dist > player.lightRadius - 1) {
              const alpha = (dist - (player.lightRadius - 1)) * 0.4;
              fogCtx.fillStyle = `rgba(0, 0, 0, ${Math.min(alpha, 0.8)})`;
              fogCtx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
    }

    torches.forEach(torch => {
      if (!torch.pickedUp) {
        const key = `${torch.position.x},${torch.position.y}`;
        if (visibleTiles.has(key)) {
          const px = torch.position.x * TILE_SIZE + TILE_SIZE / 2;
          const py = torch.position.y * TILE_SIZE + TILE_SIZE / 2;
          
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = COLORS.TORCH;
          ctx.shadowColor = COLORS.TORCH;
          ctx.shadowBlur = 10;
          ctx.fillText('★', px, py);
          ctx.shadowBlur = 0;
        }
      }
    });

    monsters.forEach(monster => {
      if (!monster.alive) return;
      
      const key = `${monster.position.x},${monster.position.y}`;
      if (visibleTiles.has(key)) {
        if (monster.path.length > 0) {
          ctx.strokeStyle = COLORS.MONSTER;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(
            monster.position.x * TILE_SIZE + TILE_SIZE / 2,
            monster.position.y * TILE_SIZE + TILE_SIZE / 2
          );
          monster.path.forEach(pos => {
            ctx.lineTo(
              pos.x * TILE_SIZE + TILE_SIZE / 2,
              pos.y * TILE_SIZE + TILE_SIZE / 2
            );
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const px = monster.position.x * TILE_SIZE + TILE_SIZE / 2;
        const py = monster.position.y * TILE_SIZE + TILE_SIZE / 2;
        
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.MONSTER;
        ctx.shadowColor = COLORS.MONSTER;
        ctx.shadowBlur = 8;
        ctx.fillText('☠', px, py);
        ctx.shadowBlur = 0;
      }
    });

    const playerPx = player.position.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPy = player.position.y * TILE_SIZE + TILE_SIZE / 2;
    
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.PLAYER;
    ctx.shadowColor = COLORS.PLAYER;
    ctx.shadowBlur = 15;
    ctx.fillText('▶', playerPx, playerPy);
    ctx.shadowBlur = 0;

    if (inBattle && battleTimer > 0) {
      const battleMonster = monsters.find(m => m.id === gameState.battleMonsterId);
      if (battleMonster) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.fillRect(
          battleMonster.position.x * TILE_SIZE,
          battleMonster.position.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }, [gameState]);

  const adjustBrightness = (hex: string, factor: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  const handleMove = useCallback((direction: Direction) => {
    if (gameState.inBattle || gameState.gameWon) return;

    const startTime = performance.now();

    setGameState(prev => {
      const newPosition = movePlayer(prev.player, direction, prev.map);
      
      if (newPosition.x === prev.player.position.x && 
          newPosition.y === prev.player.position.y) {
        return prev;
      }

      let newPlayer = { ...prev.player, position: newPosition };
      let newTorches = prev.torches;
      let newMonsters = prev.monsters;
      let battleMonsterId: number | null = null;

      const torchResult = pickUpTorch(newPlayer, newTorches);
      newPlayer = torchResult.player;
      newTorches = torchResult.torches;

      newPlayer = updateTorchTimer(newPlayer);

      const visStart = performance.now();
      const { visible, brightness } = calculateVisibility(prev.map, newPosition, newPlayer.lightRadius);
      const visTime = performance.now() - visStart;
      console.log(`视野计算耗时: ${visTime.toFixed(2)}ms`);

      brightnessCacheRef.current = brightness;

      const newMap = prev.map.map(row => row.map(tile => {
        const key = `${tile.x},${tile.y}`;
        const b = brightness.get(key) || 0;
        return { ...tile, visible: visible.has(key), brightness: b };
      }));

      const { map: exploredMap, count } = updateExploredCount(newMap, visible, newPlayer.exploredCount);
      newPlayer.exploredCount = count;

      const aiStart = performance.now();
      const monsterResult = moveMonsters(newMonsters, newPosition, exploredMap);
      newMonsters = monsterResult.monsters;
      battleMonsterId = monsterResult.battleMonsterId;
      const aiTime = performance.now() - aiStart;
      console.log(`怪物AI计算耗时: ${aiTime.toFixed(2)}ms`);

      if (battleMonsterId !== null) {
        const monsterIndex = newMonsters.findIndex(m => m.id === battleMonsterId);
        if (monsterIndex !== -1) {
          newMonsters = newMonsters.map((m, i) => 
            i === monsterIndex ? { ...m, alive: false } : m
          );
          
          const torchPos = newMonsters[monsterIndex].position;
          newTorches = [...newTorches, {
            id: newTorches.length,
            position: torchPos,
            pickedUp: false
          }];
        }
      }

      const totalFloor = countFloorTiles(exploredMap);
      const won = checkWinCondition(count, newMonsters, totalFloor);

      const totalTime = performance.now() - startTime;
      console.log(`回合总耗时: ${totalTime.toFixed(2)}ms`);

      return {
        ...prev,
        map: exploredMap,
        player: newPlayer,
        monsters: newMonsters,
        torches: newTorches,
        turn: prev.turn + 1,
        visibleTiles: visible,
        gameWon: won,
        inBattle: battleMonsterId !== null,
        battleMonsterId,
        battleTimer: battleMonsterId !== null ? 0.8 : 0
      };
    });

    setAnimatingValues(new Set(['turn', 'explored', 'health', 'light']));
    setTimeout(() => setAnimatingValues(new Set()), 300);
  }, [gameState.inBattle, gameState.gameWon]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          handleMove(Direction.UP);
          break;
        case 's':
        case 'arrowdown':
          handleMove(Direction.DOWN);
          break;
        case 'a':
        case 'arrowleft':
          handleMove(Direction.LEFT);
          break;
        case 'd':
        case 'arrowright':
          handleMove(Direction.RIGHT);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (gameState.inBattle && gameState.battleTimer > 0) {
        setGameState(prev => {
          const newTimer = prev.battleTimer - deltaTime;
          if (newTimer <= 0) {
            return { ...prev, inBattle: false, battleTimer: 0, battleMonsterId: null };
          }
          return { ...prev, battleTimer: newTimer };
        });
      }

      renderMap();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.inBattle, gameState.battleTimer, renderMap]);

  const handleReset = () => {
    setGameState(initGame());
  };

  const { player, turn, torches, gameWon, inBattle } = gameState;

  return (
    <div className="game-container">
      <div className="top-bar">
        <div className="turn-display">回合: {turn}</div>
        <button className="reset-button" onClick={handleReset}>
          重置地图
        </button>
      </div>

      <div className="main-content">
        <div className="side-panel">
          <div className="panel-title">角色状态</div>
          
          <div className="panel-item">
            <div className="panel-label">名称</div>
            <div className={`panel-value ${animatingValues.has('name') ? 'animate' : ''}`}>
              {player.name}
            </div>
          </div>

          <div className="panel-item">
            <div className="panel-label">生命值</div>
            <div className={`panel-value ${animatingValues.has('health') ? 'animate' : ''}`}>
              {player.health}/{player.maxHealth}
            </div>
            <div className="health-bar-container">
              <div 
                className="health-bar" 
                style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
              />
            </div>
          </div>

          <div className="panel-item">
            <div className="panel-label">光照半径</div>
            <div className={`panel-value ${animatingValues.has('light') ? 'animate' : ''}`}>
              {player.lightRadius} 格
            </div>
          </div>

          <div className="panel-item">
            <div className="panel-label">已拾取火炬</div>
            <div className={`panel-value ${animatingValues.has('torches') ? 'animate' : ''}`}>
              {player.torchesPickedUp} 个
            </div>
          </div>

          <div className="panel-item">
            <div className="panel-label">已探索</div>
            <div className={`panel-value ${animatingValues.has('explored') ? 'animate' : ''}`}>
              {player.exploredCount}/{totalTiles}格
            </div>
          </div>
        </div>

        <div className="game-area">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              width={MAP_SIZE * TILE_SIZE}
              height={MAP_SIZE * TILE_SIZE}
            />
            <canvas
              ref={fogCanvasRef}
              className="fog-overlay"
              width={MAP_SIZE * TILE_SIZE}
              height={MAP_SIZE * TILE_SIZE}
            />

            {player.torchTimer > 0 && (
              <div className="torch-panel">
                <span className="torch-icon">★</span>
                <span className={`torch-timer ${player.torchTimer <= 5 ? 'warning' : ''}`}>
                  火炬: {player.torchTimer} 回合
                </span>
              </div>
            )}

            {inBattle && (
              <div className="battle-overlay">
                <div className="battle-text">战斗中!</div>
              </div>
            )}

            {gameWon && (
              <div className="victory-overlay">
                <div className="victory-text">胜利!</div>
                <div className="victory-subtext">
                  你探索了整个迷宫并击败了所有怪物!
                </div>
                <button className="reset-button" onClick={handleReset}>
                  再来一局
                </button>
              </div>
            )}
          </div>

          <div className="controls-info">
            使用 <span>W A S D</span> 或 <span>方向键</span> 移动角色
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
