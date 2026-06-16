import React, { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import {
  CellType,
  Direction,
  PlayerStatus,
  RenderData,
  VisibilityLevel,
} from '../game/types';

interface GameBoardProps {
  engine: GameEngine;
  onWin: () => void;
  onLose: () => void;
}

const COLORS = {
  background: '#0B0C10',
  hidden: '#000000',
  permanent: '#2C3E50',
  flash: '#FFFFE0',
  echo: '#00BFFF',
  player: '#FFFFFF',
  trapSpike: '#E74C3C',
  trapRock: '#C0392B',
  trapPoison: '#9B59B6',
  exit: '#00FF00',
  wall: '#1C2833',
  trapHighlight: '#FF4444',
  statusBg: 'rgba(15, 15, 25, 0.85)',
  statusBorder: '#4A0000',
  healthRed: '#C0392B',
  healthBg: '#3A0000',
  goldText: '#FFD700',
  darkRedText: '#8B0000',
  cooldownGray: '#555555',
  cooldownText: '#888888',
  flashIcon: '#FFD700',
  echoIcon: '#00BFFF',
};

function directionToArrow(dir: Direction): string {
  switch (dir) {
    case Direction.UP: return '▲';
    case Direction.DOWN: return '▼';
    case Direction.LEFT: return '◄';
    case Direction.RIGHT: return '►';
  }
}

export default function GameBoard({ engine, onWin, onLose }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderDataRef = useRef<RenderData | null>(null);
  const statusRef = useRef<PlayerStatus | null>(null);
  const shakeOffsetRef = useRef({ x: 0, y: 0 });
  const keyFeedbackRef = useRef<Record<string, number>>({});
  const prevStatusRef = useRef<GameEngine['status']>('playing');

  const cellSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderDataRef.current) return 40;
    const map = renderDataRef.current.map;
    const minDim = Math.min(canvas.width, canvas.height);
    return Math.floor(minDim / Math.max(map.width, map.height));
  }, []);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, data: RenderData, now: number) => {
      const { map, visibility, player } = data;
      const cs = cellSize();
      const offsetX = Math.floor((ctx.canvas.width - map.width * cs) / 2) + shakeOffsetRef.current.x;
      const offsetY = Math.floor((ctx.canvas.height - map.height * cs) / 2) + shakeOffsetRef.current.y;

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const px = offsetX + x * cs;
          const py = offsetY + y * cs;
          const vis = visibility[y][x];
          const cellType = map.grid[y][x];

          ctx.fillStyle = getCellColor(vis.level, cellType, now);
          ctx.fillRect(px, py, cs, cs);

          if (vis.level !== 'hidden') {
            drawCellContent(ctx, px, py, cs, cellType, vis.level, now, data);
          }

          ctx.strokeStyle = vis.level === 'hidden' ? '#0A0A0A' : '#1A1A2E';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cs, cs);
        }
      }

      drawPlayer(ctx, offsetX, offsetY, cs, player, now, data);

      const isShaking = now < data.screenShakeUntil;
      if (isShaking) {
        shakeOffsetRef.current = {
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 6,
        };
      } else {
        shakeOffsetRef.current = { x: 0, y: 0 };
      }
    },
    [cellSize]
  );

  const getCellColor = (visLevel: VisibilityLevel, cellType: CellType, now: number): string => {
    if (visLevel === 'hidden') return COLORS.hidden;
    if (visLevel === 'flash') return COLORS.flash;
    if (visLevel === 'echo') return COLORS.echo;
    if (cellType === CellType.WALL) return COLORS.wall;
    return COLORS.permanent;
  };

  const drawCellContent = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    cellType: CellType,
    visLevel: VisibilityLevel,
    now: number,
    data: RenderData
  ) => {
    const cx = px + cs / 2;
    const cy = py + cs / 2;
    const r = cs * 0.3;

    if (cellType === CellType.TRAP_SPIKE) {
      ctx.fillStyle = COLORS.trapSpike;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    } else if (cellType === CellType.TRAP_ROCK) {
      ctx.fillStyle = COLORS.trapRock;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (cellType === CellType.TRAP_POISON) {
      ctx.fillStyle = COLORS.trapPoison;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - r * 0.15, cy - r, r * 0.3, r * 0.6);
    } else if (cellType === CellType.EXIT) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 200);
      ctx.fillStyle = `rgba(0, 255, 0, ${0.3 + pulse * 0.7})`;
      ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
      ctx.strokeStyle = COLORS.exit;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
    }

    if (visLevel === 'echo') {
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(0, 191, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
    }

    const isHighlighted = data.trapHighlightPositions.some(
      (p) => p.x === (px - Math.floor((ctx.canvas.width - data.map.width * cs) / 2)) / cs &&
             p.y === (py - Math.floor((ctx.canvas.height - data.map.height * cs) / 2)) / cs
    );
    if (isHighlighted) {
      const flash = 0.5 + 0.5 * Math.sin(now / 80);
      ctx.fillStyle = `rgba(255, 68, 68, ${flash * 0.5})`;
      ctx.fillRect(px, py, cs, cs);
    }
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cs: number,
    player: RenderData['player'],
    now: number,
    data: RenderData
  ) => {
    const px = offsetX + player.position.x * cs + cs / 2;
    const py = offsetY + player.position.y * cs + cs / 2;
    const arrow = directionToArrow(player.direction);

    ctx.font = `bold ${cs * 0.7}px Cinzel Decorative, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.player;
    ctx.fillText(arrow, px, py);
  };

  const drawStatusPanel = useCallback(
    (ctx: CanvasRenderingContext2D, status: PlayerStatus, now: number) => {
      const canvasW = ctx.canvas.width;
      const panelW = 180;
      const panelH = 160;
      const margin = 12;
      const px = margin;
      const py = margin;

      ctx.fillStyle = COLORS.statusBg;
      ctx.fillRect(px, py, panelW, panelH);
      ctx.strokeStyle = COLORS.statusBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, panelW, panelH);

      ctx.font = 'bold 13px Cinzel Decorative, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const hpBarW = panelW - 50;
      const hpBarH = 14;
      let curY = py + 12;

      ctx.fillStyle = COLORS.goldText;
      ctx.fillText('HP', px + 10, curY);
      ctx.fillStyle = COLORS.healthBg;
      ctx.fillRect(px + 38, curY, hpBarW, hpBarH);
      const hpRatio = status.health / status.maxHealth;
      ctx.fillStyle = COLORS.healthRed;
      ctx.fillRect(px + 38, curY, hpBarW * hpRatio, hpBarH);
      ctx.strokeStyle = '#5A0000';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 38, curY, hpBarW, hpBarH);
      ctx.fillStyle = COLORS.goldText;
      ctx.font = 'bold 11px Cinzel Decorative, serif';
      ctx.fillText(`${status.health}/${status.maxHealth}`, px + 38 + hpBarW / 2 - 12, curY + 1);

      curY += 28;

      const flashOnCooldown = status.flashCooldown > 0;
      const flashAvailable = status.flashbangs > 0 && !flashOnCooldown;
      ctx.font = 'bold 14px Cinzel Decorative, serif';
      ctx.fillStyle = flashAvailable ? COLORS.flashIcon : COLORS.cooldownGray;
      ctx.fillText('⚡', px + 10, curY);
      ctx.font = 'bold 13px Cinzel Decorative, serif';
      ctx.fillStyle = flashAvailable ? COLORS.goldText : COLORS.cooldownText;
      ctx.fillText(`x${status.flashbangs}`, px + 30, curY + 1);
      if (flashOnCooldown) {
        ctx.font = 'bold 11px Cinzel Decorative, serif';
        ctx.fillStyle = COLORS.cooldownText;
        ctx.fillText(`${(status.flashCooldown / 1000).toFixed(1)}s`, px + 65, curY + 2);
      } else if (status.flashbangs <= 0) {
        ctx.font = 'bold 11px Cinzel Decorative, serif';
        ctx.fillStyle = '#660000';
        ctx.fillText('DEPLETED', px + 65, curY + 2);
      }

      curY += 28;

      const echoOnCooldown = status.echoCooldown > 0;
      const echoAvailable = status.echoScans > 0 && !echoOnCooldown;
      ctx.font = 'bold 14px Cinzel Decorative, serif';
      ctx.fillStyle = echoAvailable ? COLORS.echoIcon : COLORS.cooldownGray;
      ctx.fillText('👂', px + 10, curY);
      ctx.font = 'bold 13px Cinzel Decorative, serif';
      ctx.fillStyle = echoAvailable ? COLORS.goldText : COLORS.cooldownText;
      ctx.fillText(`x${status.echoScans}`, px + 30, curY + 1);
      if (echoOnCooldown) {
        ctx.font = 'bold 11px Cinzel Decorative, serif';
        ctx.fillStyle = COLORS.cooldownText;
        ctx.fillText(`${(status.echoCooldown / 1000).toFixed(1)}s`, px + 65, curY + 2);
      } else if (status.echoScans <= 0) {
        ctx.font = 'bold 11px Cinzel Decorative, serif';
        ctx.fillStyle = '#660000';
        ctx.fillText('DEPLETED', px + 65, curY + 2);
      }

      curY += 28;
      ctx.font = 'bold 11px Cinzel Decorative, serif';
      ctx.fillStyle = COLORS.darkRedText;
      ctx.fillText('[F] Flash  [E] Echo', px + 10, curY);
    },
    []
  );

  const drawDeathScreen = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const pulse = 0.5 + 0.5 * Math.sin(now / 300);
    ctx.font = `bold 48px Cinzel Decorative, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(200, 0, 0, ${0.5 + pulse * 0.5})`;
    ctx.fillText('魂已消散', ctx.canvas.width / 2, ctx.canvas.height / 2);
  }, []);

  const drawWinScreen = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = 0; i < 30; i++) {
      const angle = (now / 1000 + i * 0.21) * 2;
      const radius = 80 + i * 5;
      const px = ctx.canvas.width / 2 + Math.cos(angle) * radius;
      const py = ctx.canvas.height / 2 + Math.sin(angle) * radius;
      const size = 2 + Math.random() * 3;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.random() * 0.7})`;
      ctx.fillRect(px, py, size, size);
    }

    ctx.font = `bold 42px Cinzel Decorative, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.goldText;
    ctx.fillText('通关成功', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(parent.clientWidth, 500);
      const h = Math.max(parent.clientHeight, 500);
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    const unsubscribe = engine.onChange((data: RenderData) => {
      renderDataRef.current = data;
      statusRef.current = engine.getPlayerStatus();

      if (prevStatusRef.current === 'playing' && data.status === 'won') {
        onWin();
      }
      if (prevStatusRef.current === 'playing' && data.status === 'lost') {
        onLose();
      }
      prevStatusRef.current = data.status;
    });

    let rafId: number;
    const renderLoop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const now = performance.now();

      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const data = renderDataRef.current;
      if (data) {
        drawGrid(ctx, data, now);

        const status = statusRef.current;
        if (status) {
          drawStatusPanel(ctx, status, now);
        }

        if (data.status === 'lost') {
          drawDeathScreen(ctx, now);
        }
        if (data.status === 'won') {
          drawWinScreen(ctx, now);
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', resize);
      unsubscribe();
      cancelAnimationFrame(rafId);
    };
  }, [engine, drawGrid, drawStatusPanel, drawDeathScreen, drawWinScreen, onWin, onLose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const now = performance.now();
      const data = renderDataRef.current;
      if (!data || data.status !== 'playing') return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          engine.movePlayer(Direction.UP);
          keyFeedbackRef.current['w'] = now + 100;
          break;
        case 's':
        case 'arrowdown':
          engine.movePlayer(Direction.DOWN);
          keyFeedbackRef.current['s'] = now + 100;
          break;
        case 'a':
        case 'arrowleft':
          engine.movePlayer(Direction.LEFT);
          keyFeedbackRef.current['a'] = now + 100;
          break;
        case 'd':
        case 'arrowright':
          engine.movePlayer(Direction.RIGHT);
          keyFeedbackRef.current['d'] = now + 100;
          break;
        case 'f':
          engine.useFlashbang();
          keyFeedbackRef.current['f'] = now + 100;
          break;
        case 'e':
          engine.useEchoScan();
          keyFeedbackRef.current['e'] = now + 100;
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [engine]);

  return (
    <div className="game-board-container">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
