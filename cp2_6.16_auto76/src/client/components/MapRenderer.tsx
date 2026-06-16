import React, { useRef, useEffect, useState } from 'react';
import { TileType, Position, Chest, Monster, Room } from '../../types';

interface MapRendererProps {
  mapData: TileType[][];
  explored: boolean[][];
  playerPosition: Position;
  playerRenderPos: Position;
  chests: Chest[];
  monsters: Monster[];
  rooms: Room[];
  tileSize?: number;
  onTileClick?: (x: number, y: number) => void;
  playerDirection?: string;
}

const TILE_SIZE = 32;

const MapRenderer: React.FC<MapRendererProps> = ({
  mapData,
  explored,
  playerPosition,
  playerRenderPos,
  chests,
  monsters,
  tileSize = TILE_SIZE,
  playerDirection = 'down'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chestBlink, setChestBlink] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setChestBlink(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapWidth = mapData[0].length;
    const mapHeight = mapData.length;

    canvas.width = mapWidth * tileSize;
    canvas.height = mapHeight * tileSize;

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = mapData[y][x];
        const px = x * tileSize;
        const py = y * tileSize;

        if (!explored[y][x]) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(px, py, tileSize, tileSize);
          continue;
        }

        if (tile === 'wall') {
          ctx.fillStyle = '#5c4033';
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.fillStyle = '#4a3429';
          ctx.fillRect(px, py + tileSize - 4, tileSize, 4);
          ctx.fillStyle = '#6b4c3d';
          ctx.fillRect(px + 2, py + 2, tileSize - 4, 2);

          ctx.strokeStyle = '#3d2817';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        } else {
          const floorColor = tile === 'corridor' ? '#7a6548' : '#8b7355';
          ctx.fillStyle = floorColor;
          ctx.fillRect(px, py, tileSize, tileSize);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          if ((x + y) % 2 === 0) {
            ctx.fillRect(px, py, tileSize, tileSize);
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(px + 4, py + 8, 2, 2);
          ctx.fillRect(px + 20, py + 16, 3, 2);
          ctx.fillRect(px + 12, py + 24, 2, 2);

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
        }
      }
    }

    chests.forEach(chest => {
      const cx = chest.position.x * tileSize;
      const cy = chest.position.y * tileSize;

      if (!explored[chest.position.y]?.[chest.position.x]) return;

      if (!chest.opened) {
        const glowIntensity = chestBlink ? 0.6 : 0.3;
        ctx.fillStyle = `rgba(255, 215, 0, ${glowIntensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          cx + tileSize / 2,
          cy + tileSize / 2,
          tileSize * 0.6,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = chestBlink ? '#ffd700' : '#daa520';
        ctx.fillRect(cx + 6, cy + 10, tileSize - 12, tileSize - 16);
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(cx + 6, cy + 10, tileSize - 12, 4);
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cx + 6, cy + tileSize - 10, tileSize - 12, 4);

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx + tileSize / 2 - 2, cy + 14, 4, 6);
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(cx + tileSize / 2 - 3, cy + 17, 6, 2);
      } else {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(cx + 6, cy + 14, tileSize - 12, tileSize - 18);
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(cx + 6, cy + 14, tileSize - 12, 2);
      }
    });

    monsters.forEach(monster => {
      const mx = monster.position.x * tileSize;
      const my = monster.position.y * tileSize;

      if (!explored[monster.position.y]?.[monster.position.x]) return;

      const bobOffset = Math.sin(animationFrame * 0.1) * 1;
      const drawY = my + bobOffset;

      if (monster.isBoss) {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(mx + 4, drawY + 2, tileSize - 8, tileSize - 6);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(mx + 8, drawY + 8, 4, 4);
        ctx.fillRect(mx + tileSize - 12, drawY + 8, 4, 4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(mx + 9, drawY + 9, 2, 2);
        ctx.fillRect(mx + tileSize - 11, drawY + 9, 2, 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(mx + 10, drawY + 16, 12, 2);
        ctx.fillRect(mx + 12, drawY + 18, 2, 2);
        ctx.fillRect(mx + 18, drawY + 18, 2, 2);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(mx + 6, drawY, tileSize - 12, 3);
        ctx.fillRect(mx + 8, drawY - 2, 4, 2);
        ctx.fillRect(mx + tileSize - 12, drawY - 2, 4, 2);
        ctx.fillRect(mx + tileSize / 2 - 2, drawY - 3, 4, 3);
      } else {
        const bodyColor = monster.attack > 10 ? '#ef4444' : '#22c55e';
        const darkColor = monster.attack > 10 ? '#b91c1c' : '#15803d';

        ctx.fillStyle = bodyColor;
        ctx.fillRect(mx + 6, drawY + 8, tileSize - 12, tileSize - 12);
        ctx.fillRect(mx + 4, drawY + 10, 4, tileSize - 14);
        ctx.fillRect(mx + tileSize - 8, drawY + 10, 4, tileSize - 14);
        ctx.fillStyle = darkColor;
        ctx.fillRect(mx + 6, drawY + tileSize - 8, tileSize - 12, 4);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + 9, drawY + 12, 4, 4);
        ctx.fillRect(mx + tileSize - 13, drawY + 12, 4, 4);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(mx + 10, drawY + 13, 2, 2);
        ctx.fillRect(mx + tileSize - 12, drawY + 13, 2, 2);
      }

      const hpPercent = monster.hp / monster.maxHp;
      const barWidth = tileSize - 8;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(mx + 4, drawY - 6, barWidth, 4);
      ctx.fillStyle = monster.isBoss ? '#a855f7' : '#ef4444';
      ctx.fillRect(mx + 4, drawY - 6, barWidth * hpPercent, 4);
    });

    const playerPx = playerRenderPos.x * tileSize;
    const playerPy = playerRenderPos.y * tileSize;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      playerPx + tileSize / 2,
      playerPy + tileSize - 4,
      tileSize / 3,
      4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#ffd4a3';
    ctx.fillRect(playerPx + 10, playerPy + 4, 12, 10);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(playerPx + 9, playerPy + 2, 14, 4);

    ctx.fillStyle = '#1a1a2e';
    if (playerDirection === 'left') {
      ctx.fillRect(playerPx + 11, playerPy + 8, 2, 2);
    } else if (playerDirection === 'right') {
      ctx.fillRect(playerPx + 19, playerPy + 8, 2, 2);
    } else {
      ctx.fillRect(playerPx + 12, playerPy + 8, 2, 2);
      ctx.fillRect(playerPx + 18, playerPy + 8, 2, 2);
    }

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(playerPx + 8, playerPy + 14, 16, 10);
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(playerPx + 8, playerPy + 20, 16, 4);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(playerPx + 6, playerPy + 14, 3, 8);
    ctx.fillRect(playerPx + 23, playerPy + 14, 3, 8);

    ctx.fillStyle = '#c0c0c0';
    if (playerDirection === 'left') {
      ctx.fillRect(playerPx + 2, playerPy + 12, 6, 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(playerPx + 6, playerPy + 11, 2, 4);
    } else {
      ctx.fillRect(playerPx + 24, playerPy + 12, 6, 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(playerPx + 24, playerPy + 11, 2, 4);
    }

    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(playerPx + 10, playerPy + 24, 4, 6);
    ctx.fillRect(playerPx + 18, playerPy + 24, 4, 6);

    ctx.fillStyle = '#5c4033';
    ctx.fillRect(playerPx + 9, playerPy + 28, 6, 3);
    ctx.fillRect(playerPx + 17, playerPy + 28, 6, 3);
  }, [
    mapData,
    explored,
    playerRenderPos,
    chests,
    monsters,
    tileSize,
    chestBlink,
    animationFrame,
    playerDirection
  ]);

  const mapWidth = mapData[0]?.length || 0;
  const mapHeight = mapData.length;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        border: '4px solid #5c4033'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
};

export default MapRenderer;
