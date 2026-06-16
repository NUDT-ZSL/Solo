import React, { useEffect, useState } from 'react';
import { Position, Monster, TileType, Room } from '../../types';

interface MiniMapProps {
  mapData: TileType[][];
  explored: boolean[][];
  playerPosition: Position;
  monsters: Monster[];
  rooms: Room[];
  mapSize: { width: number; height: number };
}

const MiniMap: React.FC<MiniMapProps> = ({
  mapData,
  explored,
  playerPosition,
  monsters,
  mapSize
}) => {
  const [blinkState, setBlinkState] = useState(true);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = 160 / mapSize.width;
    const cellHeight = 160 / mapSize.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 160, 160);

    for (let y = 0; y < mapSize.height; y++) {
      for (let x = 0; x < mapSize.width; x++) {
        if (explored[y][x]) {
          if (mapData[y][x] !== 'wall') {
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(
              x * cellWidth + 0.5,
              y * cellHeight + 0.5,
              cellWidth - 1,
              cellHeight - 1
            );
          } else {
            ctx.fillStyle = '#3d3d3d';
            ctx.fillRect(
              x * cellWidth,
              y * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        }
      }
    }

    monsters.forEach(monster => {
      const mx = monster.position.x;
      const my = monster.position.y;
      if (explored[my] && explored[my][mx]) {
        ctx.fillStyle = monster.isBoss ? '#ff00ff' : '#ff0000';
        ctx.beginPath();
        ctx.arc(
          mx * cellWidth + cellWidth / 2,
          my * cellHeight + cellHeight / 2,
          monster.isBoss ? cellWidth * 0.8 : cellWidth * 0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    if (blinkState) {
      ctx.fillStyle = '#00bfff';
      ctx.beginPath();
      ctx.arc(
        playerPosition.x * cellWidth + cellWidth / 2,
        playerPosition.y * cellHeight + cellHeight / 2,
        cellWidth * 0.7,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [mapData, explored, playerPosition, monsters, mapSize, blinkState]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 160,
        height: 160,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
        padding: 4,
        boxSizing: 'border-box',
        border: '2px solid #d4a373',
        zIndex: 100
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        style={{ display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#d4a373',
          fontSize: 10,
          fontFamily: 'monospace'
        }}
      >
        小地图
      </div>
    </div>
  );
};

export default MiniMap;
