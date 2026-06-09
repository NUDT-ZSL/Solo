import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioManager } from './AudioManager';

export type RuneColor = '#FF3366' | '#3399FF' | '#33FF66' | '#CC66FF';
export type RuneShape = 'circle' | 'triangle' | 'star' | 'diamond';

export interface Rune {
  id: number;
  x: number;
  y: number;
  color: RuneColor;
  shape: RuneShape;
  gridRow: number;
  gridCol: number;
  connected: boolean;
  orderIndex: number | null;
  startX: number;
  startY: number;
  entryDelay: number;
  pulsePhase: number;
  pulseSpeed: number;
  errorShake: number;
  errorFlash: number;
  hoverScale: number;
  attractWave: number;
}

export interface LightChain {
  fromId: number;
  toId: number;
  color1: RuneColor;
  color2: RuneColor;
  particles: { x: number; y: number; vx: number; vy: number; restX: number; restY: number }[];
  pulsePhase: number;
  burstTime: number;
  burstParticles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[];
  effectType: 'spiral' | 'pulse' | 'ray';
}

export interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface PortalParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
}

export interface LevelConfig {
  level: number;
  runeCount: number;
  gridSize: number;
}

export interface GameProps {
  levelConfig: LevelConfig;
  onLevelComplete: (timeUsed: number, stars: number) => void;
  onConnection: (connectedCount: number, totalCount: number, streak: number) => void;
  onRuneClicked: () => void;
  onResetRequest: () => number;
  resetCounter: number;
}

const COLORS: RuneColor[] = ['#FF3366', '#3399FF', '#33FF66', '#CC66FF'];
const SHAPES: RuneShape[] = ['circle', 'triangle', 'star', 'diamond'];
const COLOR_NAMES: Record<RuneColor, string> = {
  '#FF3366': 'red',
  '#3399FF': 'blue',
  '#33FF66': 'green',
  '#CC66FF': 'purple'
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function mixColors(colors: RuneColor[]): string {
  let r = 0, g = 0, b = 0;
  colors.forEach(c => {
    const rgb = hexToRgb(c);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  });
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  return `rgb(${r},${g},${b})`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const Game: React.FC<GameProps> = ({
  levelConfig,
  onLevelComplete,
  onConnection,
  onRuneClicked,
  onResetRequest,
  resetCounter
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    runes: [] as Rune[],
    chains: [] as LightChain[],
    stars: [] as BackgroundStar[],
    dragging: false,
    dragStartRuneId: -1,
    dragMouseX: 0,
    dragMouseY: 0,
    dragParticles: [] as { x: number; y: number; vx: number; vy: number }[],
    sequence: [] as { color: RuneColor; shape: RuneShape }[],
    currentStep: 0,
    connectedCount: 0,
    streak: 0,
    gridSize: levelConfig.gridSize,
    runeCount: levelConfig.runeCount,
    canvasWidth: 0,
    canvasHeight: 0,
    cellSize: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
    isSmallScreen: false,
    hoveredRuneId: -1,
    levelComplete: false,
    portalActive: false,
    portalTime: 0,
    portalParticles: [] as PortalParticle[],
    brokenChainParticles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[],
    time: 0,
    startLevelTime: 0
  });

  const [, forceRender] = useState(0);

  const generateLevel = useCallback(() => {
    const { runeCount, gridSize } = levelConfig;
    const s = stateRef.current;
    s.runes = [];
    s.chains = [];
    s.currentStep = 0;
    s.connectedCount = 0;
    s.streak = 0;
    s.portalActive = false;
    s.portalTime = 0;
    s.portalParticles = [];
    s.levelComplete = false;
    s.brokenChainParticles = [];
    s.dragging = false;
    s.dragStartRuneId = -1;
    s.gridSize = gridSize;
    s.runeCount = runeCount;

    const usedCells = new Set<string>();
    const cells: { row: number; col: number }[] = [];

    const margin = Math.floor(gridSize * 0.1);
    while (cells.length < runeCount) {
      const row = margin + Math.floor(Math.random() * (gridSize - margin * 2));
      const col = margin + Math.floor(Math.random() * (gridSize - margin * 2));
      const key = `${row},${col}`;
      if (!usedCells.has(key)) {
        usedCells.add(key);
        cells.push({ row, col });
      }
    }

    const colorShapePairs: { color: RuneColor; shape: RuneShape }[] = [];
    const colorsArr = [...COLORS];
    const shapesArr = shuffleArray([...SHAPES]);
    for (let i = 0; i < runeCount; i++) {
      colorShapePairs.push({
        color: colorsArr[i % 4],
        shape: shapesArr[i % 4]
      });
    }

    const shuffledPairs = shuffleArray(colorShapePairs);

    const w = window.innerWidth;
    s.isSmallScreen = w < 768;
    const spacing = s.isSmallScreen ? 15 : 20;
    s.cellSize = spacing;
    const totalGridW = (gridSize - 1) * spacing;
    const totalGridH = (gridSize - 1) * spacing;

    s.gridOffsetX = (s.canvasWidth - totalGridW) / 2;
    s.gridOffsetY = (s.canvasHeight - totalGridH) / 2;

    cells.forEach((cell, idx) => {
      const runeSize = s.isSmallScreen ? 14 : 18;
      const cx = s.gridOffsetX + cell.col * spacing;
      const cy = s.gridOffsetY + cell.row * spacing;

      const dir = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 200;
      const sx = cx + Math.cos(dir) * dist;
      const sy = cy + Math.sin(dir) * dist;

      s.runes.push({
        id: idx,
        x: cx,
        y: cy,
        color: shuffledPairs[idx].color,
        shape: shuffledPairs[idx].shape,
        gridRow: cell.row,
        gridCol: cell.col,
        connected: false,
        orderIndex: null,
        startX: sx,
        startY: sy,
        entryDelay: idx * 0.04,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 0.5,
        errorShake: 0,
        errorFlash: 0,
        hoverScale: 1,
        attractWave: -1
      });
    });

    const colorSequence: RuneColor[] = ['#FF3366', '#3399FF', '#33FF66', '#CC66FF'];
    const shapePool = shuffleArray([...SHAPES]);
    s.sequence = [];
    for (let i = 0; i < runeCount; i++) {
      s.sequence.push({
        color: colorSequence[i % 4],
        shape: shapePool[Math.floor(i / 4) % 4]
      });
    }
    s.sequence = shuffleArray(s.sequence);

    const seqIdxMap = new Map<string, number[]>();
    s.sequence.forEach((seq, i) => {
      const key = `${seq.color}-${seq.shape}`;
      if (!seqIdxMap.has(key)) seqIdxMap.set(key, []);
      seqIdxMap.get(key)!.push(i);
    });

    s.runes.forEach(rune => {
      const key = `${rune.color}-${rune.shape}`;
      const arr = seqIdxMap.get(key);
      if (arr && arr.length > 0) {
        const si = arr.shift()!;
        (rune as any)._seqIdx = si;
      }
    });

    s.runes.sort((a, b) => {
      const ai = (a as any)._seqIdx ?? 999;
      const bi = (b as any)._seqIdx ?? 999;
      return ai - bi;
    });
    s.runes.forEach((r, i) => {
      r.id = i;
    });

    s.stars = [];
    for (let i = 0; i < 100; i++) {
      s.stars.push({
        x: Math.random() * s.canvasWidth,
        y: Math.random() * s.canvasHeight,
        size: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5
      });
    }
  }, [levelConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.canvasWidth = rect.width;
      stateRef.current.canvasHeight = rect.height;
      generateLevel();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [generateLevel]);

  useEffect(() => {
    generateLevel();
    forceRender(v => v + 1);
  }, [resetCounter, generateLevel]);

  const drawRune = (
    ctx: CanvasRenderingContext2D,
    rune: Rune,
    size: number,
    brightness: number
  ) => {
    const { x, y, color, shape } = rune;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * brightness;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = color + Math.round(50 + 150 * brightness).toString(16).padStart(2, '0');

    const s = size;
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        break;
      case 'triangle':
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          const px = Math.cos(a) * s;
          const py = Math.sin(a) * s;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? s : s * 0.45;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.75, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.75, 0);
        ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF44';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;
      s.time += dt;

      ctx.clearRect(0, 0, s.canvasWidth, s.canvasHeight);

      const grad = ctx.createRadialGradient(
        s.canvasWidth / 2,
        s.canvasHeight / 2,
        50,
        s.canvasWidth / 2,
        s.canvasHeight / 2,
        Math.max(s.canvasWidth, s.canvasHeight) * 0.8
      );
      grad.addColorStop(0, '#1A1A4E');
      grad.addColorStop(1, '#0A0A2E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

      s.stars.forEach(star => {
        const t = s.time * star.twinkleSpeed + star.twinklePhase;
        const alpha = 0.3 + Math.sin(t) * 0.3 + 0.2;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const gridW = (s.gridSize - 1) * s.cellSize;
      const gridH = (s.gridSize - 1) * s.cellSize;
      ctx.save();
      ctx.strokeStyle = 'rgba(51,68,85,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < s.gridSize; i++) {
        const x = s.gridOffsetX + i * s.cellSize;
        const y = s.gridOffsetY + i * s.cellSize;
        ctx.beginPath();
        ctx.moveTo(x, s.gridOffsetY);
        ctx.lineTo(x, s.gridOffsetY + gridH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.gridOffsetX, y);
        ctx.lineTo(s.gridOffsetX + gridW, y);
        ctx.stroke();
      }
      ctx.restore();

      s.brokenChainParticles.forEach(p => {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      });
      s.brokenChainParticles = s.brokenChainParticles.filter(p => p.life > 0);
      s.brokenChainParticles.forEach(p => {
        const a = Math.max(0, p.life / 0.8);
        ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      });

      s.chains.forEach(chain => {
        chain.pulsePhase += dt * 1.5;
        if (chain.burstTime > 0) chain.burstTime -= dt;

        chain.burstParticles.forEach(p => {
          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;
          p.life -= dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
        });
        chain.burstParticles = chain.burstParticles.filter(p => p.life > 0);

        const fromRune = s.runes.find(r => r.id === chain.fromId)!;
        const toRune = s.runes.find(r => r.id === chain.toId)!;
        const n = chain.particles.length;

        const midX = (fromRune.x + toRune.x) / 2;
        const midY = (fromRune.y + toRune.y) / 2;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          chain.particles[i].restX = fromRune.x + (toRune.x - fromRune.x) * t;
          chain.particles[i].restY = fromRune.y + (toRune.y - fromRune.y) * t;
          const sag = Math.sin(t * Math.PI) * 8;
          const nx = -(toRune.y - fromRune.y);
          const ny = toRune.x - fromRune.x;
          const nl = Math.hypot(nx, ny) || 1;
          chain.particles[i].restX += (nx / nl) * sag;
          chain.particles[i].restY += (ny / nl) * sag;
        }

        chain.particles.forEach(p => {
          const dx = p.restX - p.x;
          const dy = p.restY - p.y;
          p.vx += dx * 0.15;
          p.vy += dy * 0.15;
          p.vx *= 0.8;
          p.vy *= 0.8;
          p.x += p.vx;
          p.y += p.vy;
        });

        const pulseAmp = 0.6 + Math.sin(chain.pulsePhase) * 0.3;
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < n - 1; i++) {
          const t = i / (n - 1);
          const color = lerpColor(chain.color1, chain.color2, t);
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12 * pulseAmp;
          ctx.lineWidth = 3 + Math.sin(t * Math.PI) * 1.5;
          ctx.globalAlpha = pulseAmp;
          ctx.beginPath();
          ctx.moveTo(chain.particles[i].x, chain.particles[i].y);
          ctx.lineTo(chain.particles[i + 1].x, chain.particles[i + 1].y);
          ctx.stroke();
        }
        ctx.restore();

        chain.particles.forEach((p, i) => {
          const t = i / (n - 1);
          const color = lerpColor(chain.color1, chain.color2, t);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;

        chain.burstParticles.forEach(p => {
          const a = Math.max(0, p.life / 0.8);
          ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2, '0');
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        });

        if (chain.effectType === 'spiral') {
          const a = s.time * 2;
          for (let k = 0; k < 2; k++) {
            const sa = a + k * Math.PI;
            const sx = midX + Math.cos(sa) * 20;
            const sy = midY + Math.sin(sa) * 20;
            const mc = lerpColor(chain.color1, chain.color2, 0.5);
            ctx.fillStyle = mc;
            ctx.shadowColor = mc;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      ctx.shadowBlur = 0;

      s.runes.forEach(rune => {
        if (rune.entryDelay > 0) {
          rune.entryDelay -= dt;
        }
        const entryT = Math.min(1, Math.max(0, 1 - rune.entryDelay / 1.0));
        const eased = 1 - Math.pow(1 - entryT, 3);
        const displayX = rune.startX + (rune.x - rune.startX) * eased;
        const displayY = rune.startY + (rune.y - rune.startY) * eased;
        rune.pulsePhase += dt * rune.pulseSpeed;

        if (rune.errorShake > 0) rune.errorShake -= dt;
        if (rune.errorFlash > 0) rune.errorFlash -= dt;
        if (rune.attractWave > 0) rune.attractWave -= dt;

        let sx = displayX;
        let sy = displayY;
        if (rune.errorShake > 0) {
          const amp = rune.errorShake / 0.3 * 4;
          sx += (Math.random() - 0.5) * amp;
          sy += (Math.random() - 0.5) * amp;
        }

        const pulse = 0.6 + (Math.sin(rune.pulsePhase) * 0.5 + 0.5) * 0.4;
        let brightness = pulse;
        if (rune.connected) brightness = Math.max(brightness, 0.8);
        if (s.hoveredRuneId === rune.id) brightness = Math.max(brightness, 1.0);

        let runeSize = s.isSmallScreen ? 11 : 14;
        let scale = 1;
        if (rune.hoverScale > 1) scale = rune.hoverScale;
        if (s.hoveredRuneId === rune.id) scale = Math.max(scale, 1.1);
        runeSize *= scale;

        const originalX = rune.x;
        const originalY = rune.y;
        rune.x = sx;
        rune.y = sy;

        if (rune.attractWave >= 0) {
          const wt = 1 - rune.attractWave / 0.5;
          const wr = 5 + wt * 20;
          const wa = 0.8 * (1 - wt);
          ctx.strokeStyle = rune.color;
          ctx.globalAlpha = wa;
          ctx.lineWidth = 2;
          ctx.shadowColor = rune.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sx, sy, wr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }

        drawRune(ctx, rune, runeSize, brightness);

        if (rune.errorFlash > 0) {
          const fa = rune.errorFlash / 0.3;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.fillStyle = `rgba(255,50,50,${fa * 0.6})`;
          ctx.shadowColor = '#FF3333';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(0, 0, runeSize + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (rune.orderIndex !== null) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(rune.orderIndex + 1), sx, sy - runeSize - 8);
        }

        rune.x = originalX;
        rune.y = originalY;
      });
      ctx.shadowBlur = 0;

      if (s.dragging && s.dragStartRuneId >= 0) {
        const startRune = s.runes.find(r => r.id === s.dragStartRuneId)!;
        const n = s.dragParticles.length;

        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const targetX = startRune.x + (s.dragMouseX - startRune.x) * t;
          const targetY = startRune.y + (s.dragMouseY - startRune.y) * t;
          const sag = Math.sin(t * Math.PI) * 12;
          const nx = -(s.dragMouseY - startRune.y);
          const ny = s.dragMouseX - startRune.x;
          const nl = Math.hypot(nx, ny) || 1;
          const ex = targetX + (nx / nl) * sag;
          const ey = targetY + (ny / nl) * sag;

          s.dragParticles[i].vx += (ex - s.dragParticles[i].x) * 0.2;
          s.dragParticles[i].vy += (ey - s.dragParticles[i].y) * 0.2;
          s.dragParticles[i].vx *= 0.82;
          s.dragParticles[i].vy *= 0.82;
          s.dragParticles[i].x += s.dragParticles[i].vx;
          s.dragParticles[i].y += s.dragParticles[i].vy;
        }

        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < n - 1; i++) {
          const t = i / (n - 1);
          const color = lerpColor(startRune.color, '#FFFFFF', t);
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(s.dragParticles[i].x, s.dragParticles[i].y);
          ctx.lineTo(s.dragParticles[i + 1].x, s.dragParticles[i + 1].y);
          ctx.stroke();
        }
        ctx.restore();

        s.dragParticles.forEach((p, i) => {
          const t = i / (n - 1);
          const color = lerpColor(startRune.color, '#FFFFFF', t);
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          const size = 2 + t * 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }

      if (s.portalActive) {
        s.portalTime += dt;
        const cx = s.canvasWidth / 2;
        const cy = s.canvasHeight / 2;
        const colors = s.runes.map(r => r.color);
        const mixColor = mixColors(colors);
        const rgb = hexToRgb(mixColor);

        if (s.portalParticles.length === 0) {
          for (let i = 0; i < 80; i++) {
            s.portalParticles.push({
              angle: Math.random() * Math.PI * 2,
              radius: 5 + Math.random() * 15,
              speed: 2 + Math.random() * 3,
              size: 1 + Math.random() * 3,
              color: s.runes[Math.floor(Math.random() * s.runes.length)].color
            });
          }
        }

        const growT = Math.min(1, s.portalTime / 2);
        const maxR = 80 * growT + 10;

        s.portalParticles.forEach(p => {
          p.angle += p.speed * dt;
          p.radius += dt * 40 * (1 + Math.sin(p.angle * 3) * 0.2);
          if (p.radius > maxR) {
            p.radius = 5 + Math.random() * 10;
            p.angle = Math.random() * Math.PI * 2;
          }
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius;
          const ra = 1 - p.radius / maxR;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = ra * growT;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        const pulseR = maxR * 0.7 + Math.sin(s.time * 4) * 5;
        const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
        pg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.5 * growT})`);
        pg.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.2 * growT})`);
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.fill();

        if (s.portalTime >= 2 && !s.levelComplete) {
          s.levelComplete = true;
          const timeUsed = s.time - s.startLevelTime;
          let stars = 3;
          if (timeUsed > 60) stars = 1;
          else if (timeUsed > 30) stars = 2;
          const streakBonus = Math.floor(s.streak / 5);
          stars += streakBonus;
          onLevelComplete(timeUsed, Math.min(5, stars));
        }
      }

      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [onLevelComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      let cx, cy;
      if ('touches' in e) {
        cx = e.touches[0]?.clientX ?? 0;
        cy = e.touches[0]?.clientY ?? 0;
      } else {
        cx = (e as MouseEvent).clientX;
        cy = (e as MouseEvent).clientY;
      }
      return { x: cx - rect.left, y: cy - rect.top };
    };

    const findRuneAt = (x: number, y: number): Rune | null => {
      for (const rune of s.runes) {
        if (rune.entryDelay > 0) continue;
        const size = s.isSmallScreen ? 14 : 18;
        const d = Math.hypot(x - rune.x, y - rune.y);
        if (d <= size + 4) return rune;
      }
      return null;
    };

    const isCorrectNext = (rune: Rune): boolean => {
      if (s.currentStep >= s.sequence.length) return false;
      const seq = s.sequence[s.currentStep];
      return rune.color === seq.color && rune.shape === seq.shape;
    };

    const checkLevelComplete = () => {
      if (s.connectedCount >= s.runeCount && !s.portalActive) {
        s.portalActive = true;
        s.portalTime = 0;
        audioManager.playSuccess();
      }
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      const rune = findRuneAt(pos.x, pos.y);
      if (!rune) return;
      if (rune.connected) return;
      if (s.portalActive) return;
      if (s.startLevelTime === 0) {
        s.startLevelTime = s.time;
        onRuneClicked();
      }

      if (s.currentStep === 0) {
        if (!isCorrectNext(rune)) {
          rune.errorFlash = 0.3;
          rune.errorShake = 0.3;
          audioManager.playError();
          s.streak = 0;
          return;
        }
      }

      s.dragging = true;
      s.dragStartRuneId = rune.id;
      s.dragMouseX = pos.x;
      s.dragMouseY = pos.y;

      const nParticles = s.isSmallScreen ? 15 : 20;
      s.dragParticles = [];
      for (let i = 0; i < nParticles; i++) {
        s.dragParticles.push({
          x: rune.x,
          y: rune.y,
          vx: 0,
          vy: 0
        });
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pos = getPos(e);
      if (s.dragging) {
        s.dragMouseX = pos.x;
        s.dragMouseY = pos.y;
      }

      let found = -1;
      for (const rune of s.runes) {
        if (rune.entryDelay > 0) continue;
        const size = s.isSmallScreen ? 14 : 18;
        const d = Math.hypot(pos.x - rune.x, pos.y - rune.y);
        if (d <= size + 8) {
          found = rune.id;
          break;
        }
      }
      if (found !== s.hoveredRuneId) {
        s.hoveredRuneId = found;
        if (s.dragging && found >= 0 && found !== s.dragStartRuneId) {
          const hr = s.runes.find(r => r.id === found)!;
          const sr = s.runes.find(r => r.id === s.dragStartRuneId)!;
          if (!hr.connected) {
            const expected = s.currentStep === 0
              ? isCorrectNext(hr)
              : (!sr.connected ? isCorrectNext(sr) && isCorrectNext(hr) : isCorrectNext(hr));
            if (expected || isCorrectNext(hr)) {
              hr.attractWave = 0.5;
            }
          }
        }
      }
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!s.dragging) return;
      const pos = getPos(e);
      const endRune = findRuneAt(pos.x, pos.y);
      const startRune = s.runes.find(r => r.id === s.dragStartRuneId)!;

      let success = false;
      let fromRune = startRune;
      let toRune = endRune;

      if (s.currentStep === 0) {
        if (endRune && !endRune.connected && isCorrectNext(endRune) && startRune.id === endRune.id) {
          startRune.connected = true;
          startRune.orderIndex = s.currentStep;
          s.currentStep++;
          s.connectedCount++;
          s.streak++;
          audioManager.playNote();
          onConnection(s.connectedCount, s.runeCount, s.streak);
          s.dragging = false;
          s.dragStartRuneId = -1;
          checkLevelComplete();
          return;
        } else {
          startRune.errorFlash = 0.3;
          startRune.errorShake = 0.3;
          audioManager.playError();
          s.streak = 0;
        }
      } else {
        if (!startRune.connected) {
          if (!isCorrectNext(startRune)) {
            startRune.errorFlash = 0.3;
            startRune.errorShake = 0.3;
            audioManager.playError();
            s.streak = 0;
          } else {
            startRune.connected = true;
            startRune.orderIndex = s.currentStep - 1;
          }
        }

        if (endRune && !endRune.connected && endRune.id !== startRune.id && isCorrectNext(endRune)) {
          endRune.connected = true;
          endRune.orderIndex = s.currentStep;
          s.currentStep++;
          s.connectedCount++;
          s.streak++;
          success = true;

          const nParticles = s.isSmallScreen ? 15 : 20;
          const particles = [];
          for (let i = 0; i < nParticles; i++) {
            const t = i / (nParticles - 1);
            const x = startRune.x + (endRune.x - startRune.x) * t;
            const y = startRune.y + (endRune.y - startRune.y) * t;
            particles.push({
              x, y, vx: 0, vy: 0, restX: x, restY: y
            });
          }

          const effectTypes: ('spiral' | 'pulse' | 'ray')[] = ['spiral', 'pulse', 'ray'];
          const chain: LightChain = {
            fromId: startRune.id,
            toId: endRune.id,
            color1: startRune.color,
            color2: endRune.color,
            particles,
            pulsePhase: Math.random() * Math.PI * 2,
            burstTime: 0.8,
            burstParticles: [],
            effectType: effectTypes[s.currentStep % 3]
          };

          const midX = (startRune.x + endRune.x) / 2;
          const midY = (startRune.y + endRune.y) / 2;
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 1 + Math.random() * 4;
            const mixC = Math.random() < 0.5 ? startRune.color : endRune.color;
            chain.burstParticles.push({
              x: midX,
              y: midY,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              life: 0.8,
              color: mixC,
              size: 2 + Math.random() * 3
            });
          }
          s.chains.push(chain);
          audioManager.playNote();
          onConnection(s.connectedCount, s.runeCount, s.streak);
        } else {
          if (endRune) {
            endRune.errorFlash = 0.3;
            endRune.errorShake = 0.3;
          }
          audioManager.playError();
          s.streak = 0;

          const startC = startRune.color;
          for (let i = 0; i < s.dragParticles.length; i++) {
            const p = s.dragParticles[i];
            const a = Math.random() * Math.PI * 2;
            s.brokenChainParticles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * (1 + Math.random() * 3),
              vy: Math.sin(a) * (1 + Math.random() * 3),
              life: 0.8,
              color: startC,
              size: 2 + Math.random() * 2
            });
          }
        }
      }

      s.dragging = false;
      s.dragStartRuneId = -1;
      s.dragParticles = [];
      checkLevelComplete();
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('mouseleave', () => {
      stateRef.current.hoveredRuneId = -1;
    });

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [onConnection, onRuneClicked]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        border: '2px solid rgba(34,51,68,0.5)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0A0A2E 0%, #1A1A4E 100%)'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          touchAction: 'none'
        }}
      />
    </div>
  );
};

export default Game;
