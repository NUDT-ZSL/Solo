import React, { useEffect, useRef, useCallback } from 'react';
import type { Board, Particle, Cell } from './gameLogic';
import { DIR_VECTORS } from './gameLogic';

interface GameBoardProps {
  board: Board;
  particles: Particle[];
  hintTimer: number;
  victory: boolean;
  victoryProgress: number;
  fading: boolean;
  fadeAlpha: number;
  onCellClick: (x: number, y: number) => void;
}

type HexPoint = { x: number; y: number };

function lerpColor(hex1: string, hex2: string, t: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return hex1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16),
      }
    : null;
}

function flatHexPoints(cx: number, cy: number, size: number): HexPoint[] {
  const pts: HexPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    pts.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return pts;
}

function drawPolygon(ctx: CanvasRenderingContext2D, pts: HexPoint[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function rgbaStr(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  particles,
  hintTimer,
  victory,
  victoryProgress,
  fading,
  fadeAlpha,
  onCellClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    canvasW: 0,
    canvasH: 0,
    dpr: 1,
    haloAngle: 0,
    time: 0,
  });

  const propsRef = useRef({
    board,
    particles,
    hintTimer,
    victory,
    victoryProgress,
    fading,
    fadeAlpha,
  });
  propsRef.current = {
    board,
    particles,
    hintTimer,
    victory,
    victoryProgress,
    fading,
    fadeAlpha,
  };

  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    let size = Math.min(700, Math.max(400, vw));
    const availH = window.innerHeight - 280;
    size = Math.min(size, availH);
    size = Math.max(400, size);
    const dpr = window.devicePixelRatio || 1;
    stateRef.current.canvasW = size;
    stateRef.current.canvasH = size + 120;
    stateRef.current.dpr = dpr;
    canvas.width = stateRef.current.canvasW * dpr;
    canvas.height = stateRef.current.canvasH * dpr;
    canvas.style.width = `${stateRef.current.canvasW}px`;
    canvas.style.height = `${stateRef.current.canvasH}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', resize);
      ro.disconnect();
    };
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let lastT = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      stateRef.current.time += dt;
      stateRef.current.haloAngle += 0.02 * dt * 60 / 60;
      render(ctx, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const render = (ctx: CanvasRenderingContext2D, dt: number) => {
    const W = stateRef.current.canvasW;
    const H = stateRef.current.canvasH;
    const {
      board,
      particles,
      hintTimer,
      victory,
      victoryProgress,
      fading,
      fadeAlpha,
    } = propsRef.current;

    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2 + 30;

    const haloR = Math.min(W, H) * 0.42;
    drawHalo(ctx, cx, cy, haloR, stateRef.current.haloAngle);

    const n = board.size;
    const padding = 40;
    const boardArea = Math.min(W, H - 120) - padding * 2;
    const cellSize = boardArea / n;
    const hexR = cellSize * 0.45;

    let liftY = 0;
    let explodeScale = 1;
    let boardAlpha = 1;
    if (victory) {
      const p = victoryProgress;
      if (p < 0.4) {
        liftY = -(p / 0.4) * 150;
      } else if (p < 0.7) {
        liftY = -150;
        explodeScale = 1 + ((p - 0.4) / 0.3) * 2;
        boardAlpha = 1 - (p - 0.4) / 0.3;
      } else {
        liftY = -150;
        explodeScale = 3;
        boardAlpha = 0;
      }
    }
    if (fading) {
      boardAlpha = Math.min(boardAlpha, fadeAlpha);
    }

    ctx.save();
    ctx.globalAlpha = boardAlpha;
    ctx.translate(0, liftY);

    drawGrid(ctx, cx, cy, n, cellSize, padding);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const cell = board.cells[y][x];
        const bx = cx - (n * cellSize) / 2 + x * cellSize + cellSize / 2;
        const by = cy - (n * cellSize) / 2 + y * cellSize + cellSize / 2;
        const s = explodeScale;
        const cex = cx + (bx - cx) * s;
        const cey = cy + (by - cy) * s;
        drawCell(ctx, cell, cex, cey, hexR, hintTimer, stateRef.current.time);
      }
    }
    ctx.restore();

    for (const p of particles) {
      drawParticle(ctx, p, stateRef.current.time);
    }

    if (victory && victoryProgress > 0.6) {
      const t = (victoryProgress - 0.6) / 0.4;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t);
      ctx.fillStyle = '#E0E0E0';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦ 魔法阵完全解锁 ✦', cx, 60);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#66FCF1';
      ctx.fillText('愿星辰指引你前行', cx, 92);
      ctx.restore();
    }
  };

  const drawHalo = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    angle: number
  ) => {
    const dots = 15;
    ctx.save();
    for (let i = 0; i < dots; i++) {
      const a = angle + (i / dots) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const pulse = 0.4 + 0.3 * Math.sin(stateRef.current.time * 2 + i);
      ctx.fillStyle = rgbaStr('#45A29E', pulse);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgbaStr('#66FCF1', pulse * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    n: number,
    cellSize: number,
    padding: number
  ) => {
    const left = cx - (n * cellSize) / 2;
    const top = cy - (n * cellSize) / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(69, 162, 158, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(left + i * cellSize, top);
      ctx.lineTo(left + i * cellSize, top + n * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, top + i * cellSize);
      ctx.lineTo(left + n * cellSize, top + i * cellSize);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawCell = (
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    cx: number,
    cy: number,
    r: number,
    hintTimer: number,
    time: number
  ) => {
    ctx.save();
    const scale = cell.scale || 1;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    let rotAng = (cell.direction * Math.PI) / 4;
    if (cell.rotating) {
      const t = cell.rotationProgress;
      rotAng = ((cell.direction - 2 + 2 * t) * Math.PI) / 4;
    }

    let baseColor = '#1F2833';
    let glowColor = '#45A29E';
    if (cell.unlocked) baseColor = '#1b3a3e';

    if (cell.unlocked) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 18;
      const hex = flatHexPoints(0, 0, r);
      ctx.fillStyle = rgbaStr('#45A29E', 0.25);
      drawPolygon(ctx, hex);
      ctx.fill();
      ctx.restore();
    }

    const hex = flatHexPoints(0, 0, r);
    ctx.fillStyle = baseColor;
    drawPolygon(ctx, hex);
    ctx.fill();
    ctx.strokeStyle = cell.unlocked ? '#66FCF1' : 'rgba(69, 162, 158, 0.6)';
    ctx.lineWidth = cell.unlocked ? 2 : 1.2;
    drawPolygon(ctx, hex);
    ctx.stroke();

    if (cell.highlighted && hintTimer > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 6);
      const alpha = 0.3 + 0.7 * pulse;
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 25 * pulse;
      ctx.strokeStyle = rgbaStr('#FFD700', alpha);
      ctx.lineWidth = 3.5;
      drawPolygon(ctx, flatHexPoints(0, 0, r + 2));
      ctx.stroke();
      ctx.restore();
    }

    if (cell.isCenter) {
      ctx.save();
      ctx.shadowColor = '#66FCF1';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#66FCF1';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const arrowColor = cell.unlocked ? '#66FCF1' : '#C5C6C7';
    ctx.save();
    ctx.rotate(rotAng);
    drawArrow(ctx, r * 0.55, arrowColor);
    ctx.restore();

    ctx.restore();
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    len: number,
    color: string
  ) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, len);
    ctx.lineTo(0, -len * 0.3);
    ctx.stroke();
    ctx.beginPath();
    const h = len * 0.45;
    ctx.moveTo(-h * 0.45, -len * 0.15);
    ctx.lineTo(0, -h);
    ctx.lineTo(h * 0.45, -len * 0.15);
    ctx.closePath();
    ctx.fill();
  };

  const drawParticle = (
    ctx: CanvasRenderingContext2D,
    p: Particle,
    _time: number
  ) => {
    const t = 1 - p.life;
    const color = lerpColor(p.hueStart, p.hueEnd, t);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.life), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = stateRef.current.canvasW;
    const H = stateRef.current.canvasH;
    const cx = W / 2;
    const cy = H / 2 + 30;
    const n = board.size;
    const padding = 40;
    const boardArea = Math.min(W, H - 120) - padding * 2;
    const cellSize = boardArea / n;
    const left = cx - (n * cellSize) / 2;
    const top = cy - (n * cellSize) / 2;
    if (mx < left || mx > left + n * cellSize) return null;
    if (my < top || my > top + n * cellSize) return null;
    const x = Math.floor((mx - left) / cellSize);
    const y = Math.floor((my - top) / cellSize);
    if (x < 0 || x >= n || y < 0 || y >= n) return null;
    return { x, y };
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCellFromEvent(e);
    if (pos) {
      onCellClick(pos.x, pos.y);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          maxWidth: '100%',
        }}
      />
    </div>
  );
};

export default GameBoard;
