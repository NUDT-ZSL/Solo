import React, { useEffect, useRef, useState } from 'react';
import {
  MAP_SIZE,
  TILE_SIZE,
  TORCH_BOOST_DURATION,
} from './types';
import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';

const CANVAS_SIZE = 800;

export default function Game(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new GameEngine();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !engineRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new Renderer(canvasRef.current);
    }

    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const engine = engineRef.current;
      const renderer = rendererRef.current;
      if (!engine || !renderer) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = Math.min(32, currentTime - lastTimeRef.current);
      lastTimeRef.current = currentTime;

      const state = engine.getState();

      if (!state.gameOver) {
        if (keysRef.current.has('KeyW') || keysRef.current.has('w')) {
          engine.tryMovePlayer('up');
        } else if (keysRef.current.has('KeyS') || keysRef.current.has('s')) {
          engine.tryMovePlayer('down');
        } else if (keysRef.current.has('KeyA') || keysRef.current.has('a')) {
          engine.tryMovePlayer('left');
        } else if (keysRef.current.has('KeyD') || keysRef.current.has('d')) {
          engine.tryMovePlayer('right');
        }

        engine.update(deltaTime);
      }

      renderer.render(state);
      setTick((t) => (t + 1) % 1000000);

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

    engine.openDoorAt(x, y);
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
    }
  };

  const engine = engineRef.current;
  if (!engine) {
    return <div style={{ color: '#e8d8a0' }}>加载中...</div>;
  }

  const state = engine.getState();
  const { player, rooms, exploredCount, totalFloorCount } = state;
  const exploredRoomCount = engine.getExploredRoomCount();

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

  const hpPercent = player.hp / player.maxHp;
  const torchPercent = player.torchBoostTimer > 0 ? player.torchBoostTimer / TORCH_BOOST_DURATION : 0;
  const explorePercent = totalFloorCount > 0 ? Math.round((exploredCount / totalFloorCount) * 100) : 0;

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

        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '6px' }}>生命值</div>
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
                background: 'linear-gradient(90deg, #ff4444, #ff8888)',
                borderRadius: '6px',
                transition: 'width 0.2s',
              }}
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {player.hp} / {player.maxHp}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '6px' }}>火炬强化</div>
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
              ? `${Math.ceil(player.torchBoostTimer / 1000)}s`
              : '未激活'}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div>当前房间: #{currentRoomId + 1}</div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div>探索进度: {explorePercent}%</div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div>已探索房间: {exploredRoomCount} / {rooms.length}</div>
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
