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
  playerHurt: '#E74C3C',
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
  explored: '#0D0D12',
  exploredGrid: '#151520',
  flashGlow: 'rgba(255, 250, 205, 0.3)',
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
  const exploredCellsRef = useRef<Set<string>>(new Set());
  const trapTriggeredRef = useRef<number>(0);
  const trapFlashStartRef = useRef<number>(0);

  const cellSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderDataRef.current) return 40;
    const map = renderDataRef.current.map;
    const minDim = Math.min(canvas.width, canvas.height);
    return Math.floor(minDim / Math.max(map.width, map.height));
  }, []);

  const getCellColor = useCallback((visLevel: VisibilityLevel, cellType: CellType, _now: number, x: number, y: number): string => {
    if (visLevel === 'hidden') {
      const key = `${x},${y}`;
      if (exploredCellsRef.current.has(key)) {
        return COLORS.explored;
      }
      return COLORS.hidden;
    }
    if (visLevel === 'flash') return COLORS.flash;
    if (visLevel === 'echo') return COLORS.echo;
    if (cellType === CellType.WALL) return COLORS.wall;
    return COLORS.permanent;
  }, []);

  const drawFlashGlow = useCallback((
    ctx: CanvasRenderingContext2D,
    data: RenderData,
    now: number,
    offsetX: number,
    offsetY: number,
    cs: number
  ) => {
    const flashCells = data.activeEffects.flashCells;
    if (flashCells.length === 0) return;

    const flashProgress = data.activeEffects.flashExpireAt > now
      ? 1 - (now - (data.activeEffects.flashExpireAt - 4000)) / 4000
      : 0;
    const glowAlpha = 0.25 * flashProgress;

    for (const cell of flashCells) {
      const px = offsetX + cell.x * cs;
      const py = offsetY + cell.y * cs;

      const gradient = ctx.createRadialGradient(
        px + cs / 2, py + cs / 2, cs * 0.2,
        px + cs / 2, py + cs / 2, cs * 0.9
      );
      gradient.addColorStop(0, `rgba(255, 250, 205, ${glowAlpha * 0.6})`);
      gradient.addColorStop(0.5, `rgba(255, 245, 180, ${glowAlpha * 0.3})`);
      gradient.addColorStop(1, `rgba(255, 240, 160, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(px - cs * 0.1, py - cs * 0.1, cs * 1.2, cs * 1.2);
    }
  }, []);

  const drawCellContent = useCallback((
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cs: number,
    cellType: CellType,
    visLevel: VisibilityLevel,
    now: number,
    data: RenderData,
    cellX: number,
    cellY: number
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
      const breathe = 0.5 + 0.5 * Math.sin(now / 1000 * Math.PI);
      const alpha = 0.6 + breathe * 0.4;
      ctx.fillStyle = `rgba(0, 255, 0, ${0.3 + breathe * 0.4})`;
      ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);

      ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);

      const pulseGradient = ctx.createRadialGradient(
        cx, cy, cs * 0.2,
        cx, cy, cs * 0.8
      );
      pulseGradient.addColorStop(0, `rgba(0, 255, 0, ${0.3 * alpha})`);
      pulseGradient.addColorStop(1, `rgba(0, 255, 0, 0)`);
      ctx.fillStyle = pulseGradient;
      ctx.fillRect(px, py, cs, cs);
    }

    if (visLevel === 'echo') {
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(now / 100));
      ctx.strokeStyle = `rgba(0, 191, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
    }

    const isHighlighted = data.trapHighlightPositions.some(
      (p) => p.x === cellX && p.y === cellY
    );
    if (isHighlighted && trapFlashStartRef.current > 0) {
      const timeSince = now - trapFlashStartRef.current;
      if (timeSince < 500) {
        const flashPhase = timeSince / 500;
        const flashIntensity = 0.8 * Math.abs(Math.sin(flashPhase * Math.PI * 4));
        ctx.fillStyle = `rgba(255, 30, 30, ${0.4 + flashIntensity * 0.4})`;
        ctx.fillRect(px, py, cs, cs);

        ctx.strokeStyle = `rgba(255, 60, 60, ${0.8 + flashIntensity * 0.2})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
      }
    }
  }, []);

  const drawPlayer = useCallback((
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cs: number,
    player: RenderData['player'],
    now: number,
    _data: RenderData
  ) => {
    const px = offsetX + player.position.x * cs + cs / 2;
    const py = offsetY + player.position.y * cs + cs / 2;
    const arrow = directionToArrow(player.direction);

    ctx.font = `bold ${cs * 0.7}px Cinzel Decorative, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let playerColor = COLORS.player;
    if (trapFlashStartRef.current > 0) {
      const timeSince = now - trapFlashStartRef.current;
      if (timeSince < 500) {
        const hurtPhase = timeSince / 500;
        const hurtIntensity = Math.abs(Math.sin(hurtPhase * Math.PI * 4));
        if (hurtIntensity > 0.5) {
          playerColor = COLORS.playerHurt;
        }
      }
    }

    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = playerColor;
    ctx.fillText(arrow, px, py);
    ctx.shadowBlur = 0;
  }, []);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, data: RenderData, now: number) => {
      const { map, visibility, player } = data;
      const cs = cellSize();
      const offsetX = Math.floor((ctx.canvas.width - map.width * cs) / 2) + shakeOffsetRef.current.x;
      const offsetY = Math.floor((ctx.canvas.height - map.height * cs) / 2) + shakeOffsetRef.current.y;

      if (trapTriggeredRef.current > 0 && data.trapHighlightPositions.length > 0) {
        if (trapFlashStartRef.current === 0) {
          trapFlashStartRef.current = now;
        }
      } else {
        trapFlashStartRef.current = 0;
      }

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const px = offsetX + x * cs;
          const py = offsetY + y * cs;
          const vis = visibility[y][x];
          const cellType = map.grid[y][x];
          const key = `${x},${y}`;

          if (vis.level !== 'hidden') {
            exploredCellsRef.current.add(key);
          }

          ctx.fillStyle = getCellColor(vis.level, cellType, now, x, y);
          ctx.fillRect(px, py, cs, cs);

          if (vis.level !== 'hidden') {
            drawCellContent(ctx, px, py, cs, cellType, vis.level, now, data, x, y);
          } else if (exploredCellsRef.current.has(key)) {
            ctx.strokeStyle = COLORS.exploredGrid;
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
          }

          if (vis.level === 'hidden' && !exploredCellsRef.current.has(key)) {
            ctx.strokeStyle = '#0A0A0A';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, cs, cs);
          } else if (vis.level !== 'hidden') {
            ctx.strokeStyle = '#1A1A2E';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, cs, cs);
          }
        }
      }

      drawFlashGlow(ctx, data, now, offsetX, offsetY, cs);

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

      trapTriggeredRef.current = data.trapHighlightPositions.length;
    },
    [cellSize, getCellColor, drawCellContent, drawFlashGlow, drawPlayer]
  );

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
