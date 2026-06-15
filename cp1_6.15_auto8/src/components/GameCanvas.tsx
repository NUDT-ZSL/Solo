import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '../gameEngine';
import { updateDoorAnimations, Maze, Room, Door, isDoorOpen } from '../mazeGenerator';
import { isInLight } from '../gameEngine';

interface GameCanvasProps {
  engine: GameEngine;
  onFPSUpdate?: (fps: number) => void;
}

const COLORS = {
  FLOOR: '#3A3A3A',
  FLOOR_LIT: '#505050',
  WALL: '#8B4513',
  DOOR: '#D2B48C',
  DOOR_FRAME: '#654321',
  PLAYER: '#FFD700',
  MONSTER: '#FF4500',
  CHEST: '#FFD700',
  CHEST_DIAMOND: '#DAA520',
  CHEST_OPENED: '#4A4A4A',
  FOG: '#000000',
  EXIT: '#00FF00',
  ENTRANCE: '#4169E1'
} as const;

const WALL_THICKNESS = 6;
const DOOR_WIDTH_RATIO = 0.6;

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onFPSUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [, setRenderTrigger] = useState(0);

  const render = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, deltaTime: number) => {
    const maze = engine.getMaze();
    const player = engine.getPlayer();
    const monsters = engine.getMonsters();
    const size = maze.length;

    updateDoorAnimations(maze, deltaTime);
    engine.updateMonsters(Date.now());

    const roomSize = Math.min(canvas.width, canvas.height) / size;
    const offsetX = (canvas.width - roomSize * size) / 2;
    const offsetY = (canvas.height - roomSize * size) / 2;

    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const room = maze[y][x];
        const explored = player.exploredRooms.has(`${x},${y}`);
        const inLight = isInLight(player.position, x, y);

        if (!explored && !inLight) {
          continue;
        }

        drawFloor(ctx, x, y, roomSize, offsetX, offsetY, inLight, room);
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const room = maze[y][x];
        const explored = player.exploredRooms.has(`${x},${y}`);
        const inLight = isInLight(player.position, x, y);

        if (!explored && !inLight) {
          continue;
        }

        drawWalls(ctx, room, roomSize, offsetX, offsetY, size);

        if (room.hasChest) {
          drawChest(ctx, x, y, roomSize, offsetX, offsetY, room.chestOpened, inLight);
        }

        if (room.isExit) {
          drawExitMarker(ctx, x, y, roomSize, offsetX, offsetY, inLight);
        }
        if (room.isEntrance) {
          drawEntranceMarker(ctx, x, y, roomSize, offsetX, offsetY, inLight);
        }
      }
    }

    for (const monster of monsters) {
      const explored = player.exploredRooms.has(`${monster.position.x},${monster.position.y}`);
      const inLight = isInLight(player.position, monster.position.x, monster.position.y);
      if (explored || inLight) {
        drawMonster(ctx, monster.position.x, monster.position.y, roomSize, offsetX, offsetY, inLight);
      }
    }

    drawPlayer(ctx, player.position.x, player.position.y, roomSize, offsetX, offsetY);
    drawFog(ctx, canvas, maze, player, roomSize, offsetX, offsetY);

  }, [engine]);

  const drawFloor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    inLight: boolean,
    _room: Room
  ) => {
    ctx.fillStyle = inLight ? COLORS.FLOOR_LIT : COLORS.FLOOR;
    ctx.fillRect(
      offsetX + x * roomSize,
      offsetY + y * roomSize,
      roomSize,
      roomSize
    );

    const alpha = inLight ? 0.3 : 0.15;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      offsetX + x * roomSize + 0.5,
      offsetY + y * roomSize + 0.5,
      roomSize - 1,
      roomSize - 1
    );
  };

  const drawWalls = (
    ctx: CanvasRenderingContext2D,
    room: Room,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    mazeSize: number
  ) => {
    const x = room.x * roomSize + offsetX;
    const y = room.y * roomSize + offsetY;

    const drawWall = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      wall: boolean | Door,
      isHorizontal: boolean
    ) => {
      if (typeof wall === 'boolean' && !wall) return;
      
      const door = typeof wall !== 'boolean' ? wall : null;
      
      if (door && isDoorOpen(wall)) {
        if (door.state === 'opening') {
          drawDoorAnimation(ctx, startX, startY, endX, endY, door.openProgress, isHorizontal, roomSize);
        }
        return;
      }

      ctx.fillStyle = COLORS.WALL;
      ctx.strokeStyle = '#5C3317';
      ctx.lineWidth = 1;

      if (isHorizontal) {
        const wallY = startY - WALL_THICKNESS / 2;
        ctx.fillRect(startX, wallY, endX - startX, WALL_THICKNESS);
        ctx.strokeRect(startX + 0.5, wallY + 0.5, endX - startX - 1, WALL_THICKNESS - 1);
      } else {
        const wallX = startX - WALL_THICKNESS / 2;
        ctx.fillRect(wallX, startY, WALL_THICKNESS, endY - startY);
        ctx.strokeRect(wallX + 0.5, startY + 0.5, WALL_THICKNESS - 1, endY - startY - 1);
      }

      if (door && door.state === 'closed') {
        drawClosedDoor(ctx, startX, startY, endX, endY, isHorizontal, roomSize);
      }
    };

    if (room.y === 0 || typeof room.walls.north !== 'boolean' || room.walls.north) {
      drawWall(x, y, x + roomSize, y, room.walls.north, true);
    }
    if (room.y === mazeSize - 1 || typeof room.walls.south !== 'boolean' || room.walls.south) {
      drawWall(x, y + roomSize, x + roomSize, y + roomSize, room.walls.south, true);
    }
    if (room.x === 0 || typeof room.walls.west !== 'boolean' || room.walls.west) {
      drawWall(x, y, x, y + roomSize, room.walls.west, false);
    }
    if (room.x === mazeSize - 1 || typeof room.walls.east !== 'boolean' || room.walls.east) {
      drawWall(x + roomSize, y, x + roomSize, y + roomSize, room.walls.east, false);
    }
  };

  const drawClosedDoor = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isHorizontal: boolean,
    roomSize: number
  ) => {
    const doorWidth = roomSize * DOOR_WIDTH_RATIO;
    const doorThickness = WALL_THICKNESS * 0.8;

    ctx.fillStyle = COLORS.DOOR;
    ctx.strokeStyle = COLORS.DOOR_FRAME;
    ctx.lineWidth = 2;

    if (isHorizontal) {
      const centerX = (startX + endX) / 2;
      const doorY = startY - doorThickness / 2;
      ctx.fillRect(centerX - doorWidth / 2, doorY, doorWidth, doorThickness);
      ctx.strokeRect(centerX - doorWidth / 2 + 0.5, doorY + 0.5, doorWidth - 1, doorThickness - 1);
    } else {
      const centerY = (startY + endY) / 2;
      const doorX = startX - doorThickness / 2;
      ctx.fillRect(doorX, centerY - doorWidth / 2, doorThickness, doorWidth);
      ctx.strokeRect(doorX + 0.5, centerY - doorWidth / 2 + 0.5, doorThickness - 1, doorWidth - 1);
    }
  };

  const drawDoorAnimation = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    progress: number,
    isHorizontal: boolean,
    roomSize: number
  ) => {
    const doorWidth = roomSize * DOOR_WIDTH_RATIO;
    const doorThickness = WALL_THICKNESS * 0.8;

    ctx.fillStyle = COLORS.DOOR;
    ctx.strokeStyle = COLORS.DOOR_FRAME;
    ctx.lineWidth = 2;

    if (isHorizontal) {
      const centerX = (startX + endX) / 2;
      const doorY = startY - doorThickness / 2;
      const angle = progress * Math.PI / 2;

      ctx.save();
      ctx.translate(centerX - doorWidth / 2, doorY + doorThickness / 2);
      ctx.rotate(-angle);
      ctx.fillRect(0, -doorThickness / 2, doorWidth, doorThickness);
      ctx.strokeRect(0.5, -doorThickness / 2 + 0.5, doorWidth - 1, doorThickness - 1);
      ctx.restore();
    } else {
      const centerY = (startY + endY) / 2;
      const doorX = startX - doorThickness / 2;
      const angle = progress * Math.PI / 2;

      ctx.save();
      ctx.translate(doorX + doorThickness / 2, centerY - doorWidth / 2);
      ctx.rotate(angle);
      ctx.fillRect(-doorThickness / 2, 0, doorThickness, doorWidth);
      ctx.strokeRect(-doorThickness / 2 + 0.5, 0.5, doorThickness - 1, doorWidth - 1);
      ctx.restore();
    }
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number
  ) => {
    const centerX = offsetX + x * roomSize + roomSize / 2;
    const centerY = offsetY + y * roomSize + roomSize / 2;
    const radius = roomSize * 0.35;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#FFEC8B');
    gradient.addColorStop(0.7, COLORS.PLAYER);
    gradient.addColorStop(1, '#B8860B');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawMonster = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    inLight: boolean
  ) => {
    const centerX = offsetX + x * roomSize + roomSize / 2;
    const centerY = offsetY + y * roomSize + roomSize / 2;
    const radius = roomSize * 0.3;

    const alpha = inLight ? 1 : 0.6;
    const globalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#FF6347');
    gradient.addColorStop(0.7, COLORS.MONSTER);
    gradient.addColorStop(1, '#8B0000');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    const eyeRadius = radius * 0.2;
    const eyeOffset = radius * 0.3;
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
    ctx.arc(centerX + eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset, centerY - eyeOffset * 0.5, eyeRadius * 0.5, 0, Math.PI * 2);
    ctx.arc(centerX + eyeOffset, centerY - eyeOffset * 0.5, eyeRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = globalAlpha;
  };

  const drawChest = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    opened: boolean,
    inLight: boolean
  ) => {
    const centerX = offsetX + x * roomSize + roomSize / 2;
    const centerY = offsetY + y * roomSize + roomSize / 2;
    const size = roomSize * 0.35;

    const alpha = inLight ? 1 : 0.7;
    const globalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;

    if (opened) {
      ctx.fillStyle = COLORS.CHEST_OPENED;
      ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);
      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - size / 2 + 0.5, centerY - size / 2 + 0.5, size - 1, size - 1);
    } else {
      ctx.fillStyle = COLORS.CHEST;
      ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - size / 2 + 0.5, centerY - size / 2 + 0.5, size - 1, size - 1);

      ctx.fillStyle = COLORS.CHEST_DIAMOND;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size * 0.3);
      ctx.lineTo(centerX + size * 0.25, centerY);
      ctx.lineTo(centerX, centerY + size * 0.3);
      ctx.lineTo(centerX - size * 0.25, centerY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.globalAlpha = globalAlpha;
  };

  const drawExitMarker = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    inLight: boolean
  ) => {
    const centerX = offsetX + x * roomSize + roomSize / 2;
    const centerY = offsetY + y * roomSize + roomSize / 2;
    const pulse = (Math.sin(Date.now() / 300) + 1) / 2;

    const alpha = (inLight ? 0.8 : 0.4) * (0.3 + pulse * 0.3);
    const size = roomSize * 0.4;

    ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * (0.8 + pulse * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.EXIT;
    ctx.font = `bold ${roomSize * 0.35}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出', centerX, centerY);
  };

  const drawEntranceMarker = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roomSize: number,
    offsetX: number,
    offsetY: number,
    inLight: boolean
  ) => {
    const centerX = offsetX + x * roomSize + roomSize / 2;
    const centerY = offsetY + y * roomSize + roomSize / 2;

    const alpha = inLight ? 0.6 : 0.3;
    ctx.fillStyle = `rgba(65, 105, 225, ${alpha})`;
    ctx.font = `bold ${roomSize * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('入', centerX, centerY);
  };

  const drawFog = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    maze: Maze,
    player: ReturnType<GameEngine['getPlayer']>,
    roomSize: number,
    offsetX: number,
    offsetY: number
  ) => {
    const size = maze.length;
    
    ctx.save();
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const explored = player.exploredRooms.has(`${x},${y}`);
        const inLight = isInLight(player.position, x, y);

        if (explored && !inLight) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(
            offsetX + x * roomSize,
            offsetY + y * roomSize,
            roomSize,
            roomSize
          );
        } else if (!explored && !inLight) {
          ctx.fillStyle = COLORS.FOG;
          ctx.fillRect(
            offsetX + x * roomSize,
            offsetY + y * roomSize,
            roomSize,
            roomSize
          );
        }
      }
    }

    const gradientOffset = 50;
    const edgeGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
    );
    edgeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(-gradientOffset, -gradientOffset, canvas.width + gradientOffset * 2, canvas.height + gradientOffset * 2);

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      setRenderTrigger(prev => prev + 1);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
        fpsTimeRef.current = currentTime;
      }

      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      frameCountRef.current++;
      if (currentTime - fpsTimeRef.current >= 1000) {
        const fps = Math.round(frameCountRef.current * 1000 / (currentTime - fpsTimeRef.current));
        if (onFPSUpdate) {
          onFPSUpdate(fps);
        }
        frameCountRef.current = 0;
        fpsTimeRef.current = currentTime;
      }

      const rect = canvas.getBoundingClientRect();
      render(ctx, { ...canvas, width: rect.width, height: rect.height }, deltaTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = 0;
    };
  }, [render, onFPSUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};
