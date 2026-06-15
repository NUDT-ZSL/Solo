import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Direction,
  Player,
  TileType,
  ItemType,
  Particle,
  MAP_SIZE,
  TILE_SIZE,
  DEFAULT_TORCH_RADIUS,
  BOOSTED_TORCH_RADIUS,
  TORCH_BOOST_DURATION,
  PLAYER_MOVE_INTERVAL,
  ROTATION_DURATION,
  MONSTER_MOVE_INTERVAL,
  DOOR_ANIMATION_DURATION,
  PICKUP_EFFECT_DURATION,
  DAMAGE_FLASH_DURATION,
} from './types';
import { generateDungeon, findPath } from './MapGenerator';
import { Renderer } from './Renderer';

const CANVAS_SIZE = 800;

const DIRECTION_ROTATION: Record<Direction, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

const createInitialState = (): GameState => {
  const dungeon = generateDungeon();
  const player: Player = {
    x: dungeon.playerStart.x,
    y: dungeon.playerStart.y,
    hp: 100,
    maxHp: 100,
    direction: 'up',
    torchRadius: DEFAULT_TORCH_RADIUS,
    torchBoostTimer: 0,
    moveCooldown: 0,
    rotation: 0,
    targetRotation: 0,
    rotationProgress: 1,
  };

  const state: GameState = {
    map: dungeon.map,
    player,
    monsters: dungeon.monsters,
    items: dungeon.items,
    doors: dungeon.doors,
    rooms: dungeon.rooms,
    exploredCount: 0,
    totalFloorCount: dungeon.totalFloorCount,
    damageFlash: 0,
    pickupEffect: null,
    particles: [],
    gameOver: false,
    visitedTiles: new Set<string>(),
  };

  for (let dy = -player.torchRadius; dy <= player.torchRadius; dy++) {
    for (let dx = -player.torchRadius; dx <= player.torchRadius; dx++) {
      const tx = player.x + dx;
      const ty = player.y + dy;
      if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= player.torchRadius) {
          if (!state.map[ty][tx].type === TileType.FLOOR || state.map[ty][tx].type === TileType.DOOR) {
            if (!state.visitedTiles.has(`${tx},${ty}`)) {
              state.visitedTiles.add(`${tx},${ty}`);
              state.exploredCount++;
            }
          }
          state.map[ty][tx].explored = true;
        }
      }
    }
  }

  return state;
};

export default function Game(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState({});
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    stateRef.current = createInitialState();
  }, [restartKey]);

  const updateExplored = useCallback(() => {
      const state = stateRef.current;
      const { player } = state;
      for (let dy = -player.torchRadius; dy <= player.torchRadius; dy++) {
        for (let dx = -player.torchRadius; dx <= player.torchRadius; dx++) {
          const tx = player.x + dx;
          const ty = player.y + dy;
          if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= player.torchRadius) {
              if (!state.map[ty][tx].explored) {
                state.map[ty][tx].explored = true;
                if (state.map[ty][tx].type === TileType.FLOOR || state.map[ty][tx].type === TileType.DOOR) {
                  if (!state.visitedTiles.has(`${tx},${ty}`)) {
                    state.visitedTiles.add(`${tx},${ty}`);
                    state.exploredCount++;
                    if (state.player.hp < state.player.maxHp) {
                      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, []);

  const isPassable = useCallback((x: number, y: number): boolean => {
      const state = stateRef.current;
      if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
      const tile = state.map[y][x];
      if (tile.type === TileType.FLOOR) return true;
      if (tile.type === TileType.DOOR) {
        const door = state.doors.find((d) => d.x === x && d.y === y);
        return door ? door.open : false;
      }
      return false;
    }, []);

  const tryMovePlayer = useCallback((direction: Direction) => {
      const state = stateRef.current;
      const { player } = state;
      if (player.moveCooldown > 0) return;

      let dx = 0;
      let dy = 0;
      switch (direction) {
        case 'up':
          dy = -1;
          break;
        case 'down':
          dy = 1;
          break;
        case 'left':
          dx = -1;
          break;
        case 'right':
          dx = 1;
          break;
      }

      const newX = player.x + dx;
      const newY = player.y + dy;

      if (player.direction !== direction) {
        player.rotation = player.rotation + (player.targetRotation - player.rotation) * player.rotationProgress;
        player.targetRotation = DIRECTION_ROTATION[direction];
        player.rotationProgress = 0;
        player.direction = direction;
        player.moveCooldown = PLAYER_MOVE_INTERVAL;
        return;
      }

      if (!isPassable(newX, newY) return;

      player.x = newX;
      player.y = newY;
      player.moveCooldown = PLAYER_MOVE_INTERVAL;

      updateExplored();
    }, [isPassable, updateExplored]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
      const state = stateRef.current;
      const screenX = x * TILE_SIZE + TILE_SIZE / 2;
      const screenY = y * TILE_SIZE + TILE_SIZE / 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const particle: Particle = {
          x: screenX,
          y: screenY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 500 + Math.random() * 500,
          maxLife: 1000,
          color,
          size: 2 + Math.random() * 3,
        };
        state.particles.push(particle);
      }
    }, []);

  const checkItemPickup = useCallback(() => {
      const state = stateRef.current;
      const { player } = state;
      const pickedItems: number[] = [];

      for (const item of state.items) {
        if (item.x === player.x && item.y === player.y) {
          pickedItems.push(item.id);
          if (item.type === ItemType.TORCH_BOOST) {
            player.torchRadius = BOOSTED_TORCH_RADIUS;
            player.torchBoostTimer = TORCH_BOOST_DURATION;
            state.pickupEffect = {
              type: item.type,
              x: item.x,
              y: item.y,
              timer: PICKUP_EFFECT_DURATION,
            };
            spawnParticles(item.x, item.y, '#FFD700', 20);
          } else if (item.type === ItemType.HEALTH_POTION) {
            player.hp = Math.min(player.maxHp, player.hp + 30);
            state.pickupEffect = {
              type: item.type,
              x: item.x,
              y: item.y,
              timer: PICKUP_EFFECT_DURATION,
            };
            spawnParticles(item.x, item.y, '#228B22', 15);
          }
        }
      }

      if (pickedItems.length > 0) {
        state.items = state.items.filter((i) => !pickedItems.includes(i.id));
      }
    }, [spawnParticles]);

  const checkCombat = useCallback(() => {
      const state = stateRef.current;
      const { player } = state;
      const killedMonsters: number[] = [];

      for (const monster of state.monsters) {
        const dx = Math.abs(monster.x - player.x);
        const dy = Math.abs(monster.y - player.y);
        if (dx <= 1 && dy <= 1 && (dx + dy <= 1) {
          player.hp -= 10;
          state.damageFlash = DAMAGE_FLASH_DURATION;
          killedMonsters.push(monster.id);
          spawnParticles(monster.x, monster.y, '#DC143C', 10);
          if (player.hp <= 0) {
            state.gameOver = true;
          }
        }
      }

      if (killedMonsters.length > 0) {
        state.monsters = state.monsters.filter((m) => !killedMonsters.includes(m.id));
      }
    }, [spawnParticles]);

  const updateMonsters = useCallback((deltaTime: number) => {
      const state = stateRef.current;
      const { player, map, doors, monsters } = state;

      for (const monster of monsters) {
        monster.blinkTimer += deltaTime;
        monster.moveCooldown -= deltaTime;

        if (monster.moveCooldown <= 0) {
          monster.moveCooldown = MONSTER_MOVE_INTERVAL;

          const path = findPath(map, doors, monster.x, monster.y, player.x, player.y);
          if (path && path.length > 0) {
            const next = path[0];
            const occupied = monsters.some(
              (m) => m.id !== monster.id && m.x === next.x && m.y === next.y
            );
            if (!occupied) {
              monster.x = next.x;
              monster.y = next.y;
            }
          }
        }
      }
    }, []);

  const updateParticles = useCallback((deltaTime: number) => {
      const state = stateRef.current;
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= deltaTime;
        return p.life > 0;
      });
    }, []);

  const updateDoors = useCallback((deltaTime: number) => {
      const state = stateRef.current;
      for (const door of state.doors) {
        if (door.open && door.rotation < 90) {
          door.rotation = Math.min(90, door.rotation + (deltaTime / DOOR_ANIMATION_DURATION) * 90);
        }
      }
    }, []);

  const gameLoop = useCallback((currentTime: number) => {
      if (!rendererRef.current && canvasRef.current) {
        const deltaTime = Math.min(32, currentTime - lastTimeRef.current);
        lastTimeRef.current = currentTime;

        const state = stateRef.current;

        if (!state.gameOver) {
          const { player } = state;

          if (player.moveCooldown > 0) {
            player.moveCooldown -= deltaTime;
          }

          if (player.rotationProgress < 1) {
            player.rotationProgress = Math.min(1, player.rotationProgress + deltaTime / ROTATION_DURATION);
          }

          if (player.torchBoostTimer > 0) {
            player.torchBoostTimer -= deltaTime;
            if (player.torchBoostTimer <= 0) {
              player.torchRadius = DEFAULT_TORCH_RADIUS;
            }
          }

          if (state.damageFlash > 0) {
            state.damageFlash -= deltaTime;
          }

          if (state.pickupEffect) {
            state.pickupEffect.timer -= deltaTime;
            if (state.pickupEffect.timer <= 0) {
              state.pickupEffect = null;
            }
          }

          if (keysRef.current.has('KeyW') || keysRef.current.has('w')) {
            tryMovePlayer('up');
          } else if (keysRef.current.has('KeyS') || keysRef.current.has('s')) {
            tryMovePlayer('down');
          } else if (keysRef.current.has('KeyA') || keysRef.current.has('a')) {
            tryMovePlayer('left');
          } else if (keysRef.current.has('KeyD') || keysRef.current.has('d')) {
            tryMovePlayer('right');
          }

          updateDoors(deltaTime);
          updateMonsters(deltaTime);
          checkCombat();
          checkItemPickup();
          updateParticles(deltaTime);
        }

        rendererRef.current.render(state);
        forceUpdate({});
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    }, [tryMovePlayer, updateDoors, updateMonsters, checkCombat, checkItemPickup, updateParticles]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX / TILE_SIZE);
      const y = Math.floor(((e.clientY - rect.top) * scaleY / TILE_SIZE);

      for (const door of state.doors) {
        if (door.x === x && door.y === y && !door.open) {
          const dx = Math.abs(door.x - state.player.x);
          const dy = Math.abs(door.y - state.player.y);
          if (dx <= 2 && dy <= 2) {
            door.open = true;
          }
        }
      }
    }, []);

  useEffect(() => {
    if (canvasRef.current) {
      rendererRef.current = new Renderer(canvasRef.current);
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop, restartKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      keysRef.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const state = stateRef.current;
  const { player, rooms, exploredCount, totalFloorCount } = state;

  let currentRoomId = -1;
  for (const room of rooms) {
    if (
      player.x >= room.x && player.x < room.x + room.width &&
      player.y >= room.y && player.y < room.y + room.height
    ) {
      currentRoomId = room.id;
      break;
    }
  }

  const hpPercent = (player.hp / player.maxHp;
  const torchPercent = player.torchBoostTimer > 0 ? player.torchBoostTimer / TORCH_BOOST_DURATION : 0;
  const explorePercent = totalFloorCount > 0 ? Math.round((exploredCount / totalFloorCount) * 100) : 0;

  const handleRestart = () => {
    setRestartKey((k) => k + 1;
  };

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '200px',
          background: '#1a1a2a',
          borderRadius: '8px',
          padding: '16px',
          fontFamily: '"Courier New", monospace',
          color: '#e8d8a0',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#ffee88' }}>
          状态面板
        </h3>

        <div style={{ marginBottom: '16px 0' }}>
          <div style={{ marginBottom: '6px 0' }}>生命值</div>
          <div
            style={{
              width: '180px',
              height: '12px',
              background: '#333',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${hpPercent * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, #ff4444, #ff8888)`,
                borderRadius: '6px',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {player.hp} / {player.maxHp}
          </div>
        </div>

        <div style={{ marginBottom: '16px 0' }}>
          <div style={{ marginBottom: '6px 0' }}>火炬强化</div>
          <div
            style={{
              width: '180px',
              height: '8px',
              background: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${torchPercent * 100}%`,
                height: '100%',
                background: '#ffee88',
                borderRadius: '4px',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {player.torchBoostTimer > 0
              ? `${Math.ceil(player.torchBoostTimer / 1000}s`
              : '未激活'}
          </div>
        </div>

        <div style={{ marginBottom: '12px 0' }}>
          <div>当前房间: #{currentRoomId + 1}</div>
        </div>

        <div style={{ marginBottom: '12px 0' }}>
          <div>探索进度: {explorePercent}%</div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '11px', color: '#888', lineHeight: '1.6' }}>
          <div>WASD - 移动</div>
          <div>点击门 - 打开</div>
        </div>

        <button
          onClick={handleRestart}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '8px',
            background: '#8B4513',
            color: '#e8d8a0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          重新开始
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            borderRadius: '4px',
            cursor: 'pointer',
            imageRendering: 'pixelated',
          }}
        />
        {state.gameOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#ff4444',
              fontFamily: '"Courier New", monospace',
              fontSize: '48px',
              fontWeight: 'bold',
            }}
          >
            <div>游戏结束</div>
            <div style={{ fontSize: '20px', marginTop: '16px', color: '#e8d8a0' }}>
              探索进度: {explorePercent}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
