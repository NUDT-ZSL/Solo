import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Submarine, Wall, Mineral, Particle, SonarPulse, SonarReflection, Keys } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SUB_SPEED = 100;
const SONAR_SPEED = 300;
const MAX_SONAR_RADIUS = 200;
const MAX_SONAR_COUNT = 3;
const PARTICLE_POOL_SIZE = 200;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const MINI_RADAR_SIZE = 120;
const MINI_RADAR_RANGE = 250;

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onDepthUpdate: (depth: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onDepthUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRadarCanvasRef = useRef<HTMLCanvasElement>(null);
  const exploredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const submarineRef = useRef<Submarine>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    angle: 0,
    speed: SUB_SPEED,
  });

  const keysRef = useRef<Keys>({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  });

  const wallsRef = useRef<Wall[]>([]);
  const mineralsRef = useRef<Mineral[]>([]);
  const sonarPulsesRef = useRef<SonarPulse[]>([]);
  const particlePoolRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const sonarIdCounterRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const spacePressedRef = useRef(false);
  const radarScanAngleRef = useRef(0);
  const radarLastScanTimeRef = useRef(0);
  const loadAnimationRef = useRef({ progress: 0, startTime: 0 });
  const wallPixelDataRef = useRef<Uint8Array | null>(null);
  const wallCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const initParticlePool = useCallback(() => {
    const pool: Particle[] = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.5,
        size: 2,
        color: '#ffffff',
        active: false,
      });
    }
    particlePoolRef.current = pool;
  }, []);

  const getParticleFromPool = useCallback((): Particle | null => {
    const pool = particlePoolRef.current;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) {
        pool[i].active = true;
        return pool[i];
      }
    }
    return null;
  }, []);

  const recycleParticle = useCallback((particle: Particle) => {
    particle.active = false;
  }, []);

  const generateMazeWalls = useCallback(() => {
    const walls: Wall[] = [];
    const cellSize = 80;
    const cols = Math.floor(CANVAS_WIDTH / cellSize);
    const rows = Math.floor(CANVAS_HEIGHT / cellSize);

    walls.push({ x1: 0, y1: 0, x2: CANVAS_WIDTH, y2: 0 });
    walls.push({ x1: 0, y1: CANVAS_HEIGHT, x2: CANVAS_WIDTH, y2: CANVAS_HEIGHT });
    walls.push({ x1: 0, y1: 0, x2: 0, y2: CANVAS_HEIGHT });
    walls.push({ x1: CANVAS_WIDTH, y1: 0, x2: CANVAS_WIDTH, y2: CANVAS_HEIGHT });

    const grid: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = false;
      }
    }

    const visited: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      visited[r] = [];
      for (let c = 0; c < cols; c++) {
        visited[r][c] = false;
      }
    }

    const stack: [number, number][] = [];
    const startR = Math.floor(rows / 2);
    const startC = Math.floor(cols / 2);
    visited[startR][startC] = true;
    stack.push([startR, startC]);

    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];

    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const neighbors: [number, number, number][] = [];

      for (let i = 0; i < directions.length; i++) {
        const [dr, dc] = directions[i];
        const nr = r + dr * 2;
        const nc = c + dc * 2;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          neighbors.push([dr, dc, i]);
        }
      }

      if (neighbors.length > 0) {
        const idx = Math.floor(Math.random() * neighbors.length);
        const [dr, dc] = neighbors[idx];
        const midR = r + dr;
        const midC = c + dc;
        const nr = r + dr * 2;
        const nc = c + dc * 2;

        grid[midR][midC] = true;
        visited[nr][nc] = true;
        stack.push([nr, nc]);
      } else {
        stack.pop();
      }
    }

    for (let i = 0; i < 30; i++) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      grid[r][c] = true;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c] && !(r === startR && c === startC)) {
          const x = c * cellSize + cellSize / 2;
          const y = r * cellSize + cellSize / 2;
          const halfSize = cellSize / 2 - 5;

          if (c === 0 || !grid[r][c - 1]) {
            walls.push({ x1: x - halfSize, y1: y - halfSize, x2: x - halfSize, y2: y + halfSize });
          }
          if (c === cols - 1 || !grid[r][c + 1]) {
            walls.push({ x1: x + halfSize, y1: y - halfSize, x2: x + halfSize, y2: y + halfSize });
          }
          if (r === 0 || !grid[r - 1][c]) {
            walls.push({ x1: x - halfSize, y1: y - halfSize, x2: x + halfSize, y2: y - halfSize });
          }
          if (r === rows - 1 || !grid[r + 1][c]) {
            walls.push({ x1: x - halfSize, y1: y + halfSize, x2: x + halfSize, y2: y + halfSize });
          }
        }
      }
    }

    return walls;
  }, []);

  const generateMinerals = useCallback((walls: Wall[]) => {
    const minerals: Mineral[] = [];
    const colors = ['#ffaa00', '#ff44aa', '#44ffaa'];
    const mineralCount = 15;

    for (let i = 0; i < mineralCount; i++) {
      let x = 0;
      let y = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        x = 50 + Math.random() * (CANVAS_WIDTH - 100);
        y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
        valid = true;
        attempts++;

        for (const wall of walls) {
          const dist = pointToLineDistance(x, y, wall);
          if (dist < 30) {
            valid = false;
            break;
          }
        }

        const distToCenter = Math.sqrt(
          Math.pow(x - CANVAS_WIDTH / 2, 2) + Math.pow(y - CANVAS_HEIGHT / 2, 2)
        );
        if (distToCenter < 80) {
          valid = false;
        }
      }

      if (valid) {
        minerals.push({
          x,
          y,
          radius: 3 + Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: (2 + Math.random()) * 2,
          collected: false,
          collectProgress: 0,
        });
      }
    }

    return minerals;
  }, []);

  const pointToLineDistance = (px: number, py: number, wall: Wall): number => {
    const { x1, y1, x2, y2 } = wall;
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number;
    let yy: number;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getWallNormal = (wall: Wall, approachX: number, approachY: number): { x: number; y: number } => {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: -1 };

    const nx = -dy / len;
    const ny = dx / len;

    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    const toApproachX = approachX - midX;
    const toApproachY = approachY - midY;

    if (nx * toApproachX + ny * toApproachY < 0) {
      return { x: -nx, y: -ny };
    }
    return { x: nx, y: ny };
  };

  const reflectVector = (dx: number, dy: number, nx: number, ny: number): { x: number; y: number } => {
    const dot = dx * nx + dy * ny;
    return {
      x: dx - 2 * dot * nx,
      y: dy - 2 * dot * ny,
    };
  };

  const getTriangleVertices = (sub: Submarine): { x: number; y: number }[] => {
    const baseLen = 40;
    const height = 30;
    const cos = Math.cos(sub.angle);
    const sin = Math.sin(sub.angle);

    const front = { x: sub.x + cos * height / 2, y: sub.y + sin * height / 2 };
    const backLeft = {
      x: sub.x - cos * height / 2 + sin * baseLen / 2,
      y: sub.y - sin * height / 2 - cos * baseLen / 2,
    };
    const backRight = {
      x: sub.x - cos * height / 2 - sin * baseLen / 2,
      y: sub.y - sin * height / 2 + cos * baseLen / 2,
    };

    return [front, backLeft, backRight];
  };

  const pointInTriangle = (px: number, py: number, v1: { x: number; y: number }, v2: { x: number; y: number }, v3: { x: number; y: number }): boolean => {
    const d1 = sign(px, py, v1, v2);
    const d2 = sign(px, py, v2, v3);
    const d3 = sign(px, py, v3, v1);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  };

  const sign = (px: number, py: number, v1: { x: number; y: number }, v2: { x: number; y: number }): number => {
    return (px - v2.x) * (v1.y - v2.y) - (v1.x - v2.x) * (py - v2.y);
  };

  const circleTriangleDistance = (cx: number, cy: number, cr: number, vertices: { x: number; y: number }[]): number => {
    const [v1, v2, v3] = vertices;

    if (pointInTriangle(cx, cy, v1, v2, v3)) {
      return 0;
    }

    const d1 = pointToLineSegmentDistance(cx, cy, v1, v2);
    const d2 = pointToLineSegmentDistance(cx, cy, v2, v3);
    const d3 = pointToLineSegmentDistance(cx, cy, v3, v1);

    const minDist = Math.min(d1, d2, d3);
    return Math.max(0, minDist - cr);
  };

  const pointToLineSegmentDistance = (px: number, py: number, v1: { x: number; y: number }, v2: { x: number; y: number }): number => {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.sqrt((px - v1.x) ** 2 + (py - v1.y) ** 2);
    }

    let t = ((px - v1.x) * dx + (py - v1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = v1.x + t * dx;
    const closestY = v1.y + t * dy;

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  };

  const initWallPixelData = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    for (const wall of wallsRef.current) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    wallPixelDataRef.current = imageData.data;
    wallCanvasRef.current = canvas;
  }, []);

  const isWallPixel = (x: number, y: number): boolean => {
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return true;
    const data = wallPixelDataRef.current;
    if (!data) return false;
    const idx = (Math.floor(y) * CANVAS_WIDTH + Math.floor(x)) * 4;
    return data[idx] > 128;
  };

  const checkSonarPixelCollision = (pulse: SonarPulse): { hit: boolean; wallIndex: number; hitX: number; hitY: number } | null => {
    const sampleStep = 2;
    const radius = pulse.radius;

    for (let angle = 0; angle < Math.PI * 2; angle += sampleStep / radius) {
      const px = pulse.x + Math.cos(angle) * radius;
      const py = pulse.y + Math.sin(angle) * radius;

      if (isWallPixel(px, py)) {
        for (let i = 0; i < wallsRef.current.length; i++) {
          const wall = wallsRef.current[i];
          const dist = pointToLineDistance(px, py, wall);
          if (dist < 6) {
            return { hit: true, wallIndex: i, hitX: px, hitY: py };
          }
        }
      }
    }
    return null;
  };

  const playBeep = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 440;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }, []);

  const fireSonar = useCallback(() => {
    const sub = submarineRef.current;
    const pulses = sonarPulsesRef.current;

    if (pulses.filter(p => p.active).length >= MAX_SONAR_COUNT) {
      const oldest = pulses.filter(p => p.active).sort((a, b) => a.startTime - b.startTime)[0];
      oldest.active = false;
    }

    const pulse: SonarPulse = {
      id: sonarIdCounterRef.current++,
      x: sub.x,
      y: sub.y,
      radius: 0,
      maxRadius: MAX_SONAR_RADIUS,
      speed: SONAR_SPEED,
      opacity: 0.8,
      reflections: [],
      startTime: Date.now(),
      active: true,
    };

    pulses.push(pulse);
  }, []);

  const spawnCollectParticles = useCallback((x: number, y: number, color: string) => {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const particle = getParticleFromPool();
      if (!particle) continue;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 30 + Math.random() * 40;

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 0.6;
      particle.maxLife = 0.6;
      particle.size = 2 + Math.random() * 2;
      particle.color = color;
      particle.active = true;
    }
  }, [getParticleFromPool]);

  const spawnWakeParticles = useCallback((sub: Submarine) => {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const particle = getParticleFromPool();
      if (!particle) continue;

      const backX = sub.x - Math.cos(sub.angle) * 15;
      const backY = sub.y - Math.sin(sub.angle) * 15;
      const offset = (Math.random() - 0.5) * 20;
      const perpX = Math.sin(sub.angle) * offset;
      const perpY = -Math.cos(sub.angle) * offset;

      particle.x = backX + perpX;
      particle.y = backY + perpY;
      particle.vx = -Math.cos(sub.angle) * 10 + (Math.random() - 0.5) * 5;
      particle.vy = -Math.sin(sub.angle) * 10 + (Math.random() - 0.5) * 5;
      particle.life = 0.5;
      particle.maxLife = 0.5;
      particle.size = 2 + Math.random() * 2;
      particle.color = '#ffffff';
      particle.active = true;
    }
  }, [getParticleFromPool]);

  const updateExploredMap = useCallback(() => {
    const exploredCanvas = exploredCanvasRef.current;
    if (!exploredCanvas) return;
    const ctx = exploredCanvas.getContext('2d');
    if (!ctx) return;

    const sub = submarineRef.current;
    const radarRange = MINI_RADAR_RANGE;
    const scale = (MINI_RADAR_SIZE / 2 - 5) / radarRange;
    const centerX = MINI_RADAR_SIZE / 2;
    const centerY = MINI_RADAR_SIZE / 2;

    const scanAngle = radarScanAngleRef.current;

    ctx.fillStyle = '#00ff88';
    for (let r = 0; r < radarRange; r += 3) {
      const px = sub.x + Math.cos(scanAngle) * r;
      const py = sub.y + Math.sin(scanAngle) * r;

      if (isWallPixel(px, py)) {
        const mapX = centerX + (px - sub.x) * scale;
        const mapY = centerY + (py - sub.y) * scale;
        ctx.fillRect(mapX - 0.5, mapY - 0.5, 1, 1);
        break;
      }
    }
  }, []);

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2
    );
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawWalls = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(74, 106, 138, 0.6)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (const wall of wallsRef.current) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  };

  const drawMinerals = (ctx: CanvasRenderingContext2D, time: number) => {
    for (const mineral of mineralsRef.current) {
      if (mineral.collected) {
        if (mineral.collectProgress < 1) {
          mineral.collectProgress += 0.05;
          const scale = 1 + mineral.collectProgress;
          const alpha = 1 - mineral.collectProgress;
          const radius = mineral.radius * scale;

          ctx.beginPath();
          ctx.arc(mineral.x, mineral.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = mineral.color;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        continue;
      }

      const pulse = Math.sin(time * mineral.pulseSpeed + mineral.pulsePhase);
      const alpha = 0.5 + (pulse + 1) * 0.25;
      const glowSize = mineral.radius * (1.5 + pulse * 0.3);

      const gradient = ctx.createRadialGradient(
        mineral.x, mineral.y, 0,
        mineral.x, mineral.y, glowSize * 2
      );
      gradient.addColorStop(0, mineral.color);
      gradient.addColorStop(0.5, mineral.color + '80');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(mineral.x, mineral.y, glowSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(mineral.x, mineral.y, mineral.radius, 0, Math.PI * 2);
      ctx.fillStyle = mineral.color;
      ctx.fill();
    }
  };

  const drawSubmarine = (ctx: CanvasRenderingContext2D, sub: Submarine) => {
    const vertices = getTriangleVertices(sub);

    ctx.save();
    ctx.shadowColor = '#55aaff';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.lineTo(vertices[2].x, vertices[2].y);
    ctx.closePath();

    ctx.fillStyle = '#55aaff';
    ctx.fill();

    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (const particle of particlePoolRef.current) {
      if (!particle.active) continue;

      const alpha = particle.life / particle.maxLife;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const drawSonarPulses = (ctx: CanvasRenderingContext2D) => {
    for (const pulse of sonarPulsesRef.current) {
      if (!pulse.active) continue;

      const fadeProgress = pulse.radius / pulse.maxRadius;
      const alpha = pulse.opacity * (1 - fadeProgress);

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      for (const refl of pulse.reflections) {
        if (!refl.active) continue;

        const dist = Math.sqrt(
          Math.pow(refl.x - pulse.x, 2) + Math.pow(refl.y - pulse.y, 2)
        );
        const reflAlpha = alpha * Math.max(0, 1 - dist / pulse.maxRadius);

        const startAngle = Math.atan2(refl.y - pulse.y, refl.x - pulse.x) - Math.PI / 3;
        const endAngle = startAngle + Math.PI * 2 / 3;

        ctx.beginPath();
        ctx.arc(refl.x, refl.y, refl.radius, startAngle, endAngle);
        ctx.strokeStyle = `rgba(0, 255, 136, ${reflAlpha * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  };

  const drawMiniRadar = () => {
    const miniCanvas = miniRadarCanvasRef.current;
    if (!miniCanvas) return;
    const ctx = miniCanvas.getContext('2d');
    if (!ctx) return;

    const size = MINI_RADAR_SIZE;
    const center = size / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(center, center, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    const exploredCanvas = exploredCanvasRef.current;
    if (exploredCanvas) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, size / 2 - 5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(exploredCanvas, 0, 0);
      ctx.restore();
    }

    const sub = submarineRef.current;
    const scale = (size / 2 - 5) / MINI_RADAR_RANGE;
    const subMapX = center;
    const subMapY = center;

    const scanAngle = radarScanAngleRef.current;
    const gradient = ctx.createRadialGradient(
      subMapX, subMapY, 0,
      subMapX, subMapY, size / 2 - 5
    );
    gradient.addColorStop(0, 'rgba(51, 255, 170, 0.3)');
    gradient.addColorStop(1, 'rgba(51, 255, 170, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(subMapX, subMapY);
    ctx.arc(subMapX, subMapY, size / 2 - 5, scanAngle - 0.3, scanAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(subMapX, subMapY);
    ctx.lineTo(
      subMapX + Math.cos(scanAngle) * (size / 2 - 5),
      subMapY + Math.sin(scanAngle) * (size / 2 - 5)
    );
    ctx.strokeStyle = 'rgba(51, 255, 170, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(subMapX, subMapY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#55aaff';
    ctx.fill();

    ctx.strokeStyle = 'rgba(51, 255, 170, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (isLoading) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = timestamp;

    if (deltaTime > 0.1) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sub = submarineRef.current;
    const keys = keysRef.current;

    let dx = 0;
    let dy = 0;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      sub.angle = Math.atan2(dy, dx);

      const newX = sub.x + dx * sub.speed * deltaTime;
      const newY = sub.y + dy * sub.speed * deltaTime;

      const margin = 20;
      sub.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, newX));
      sub.y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, newY));

      if (isWallPixel(sub.x, sub.y)) {
        sub.x -= dx * sub.speed * deltaTime;
        sub.y -= dy * sub.speed * deltaTime;
      }

      spawnWakeParticles(sub);
    }

    if (keys.space && !spacePressedRef.current) {
      spacePressedRef.current = true;
      fireSonar();
    }
    if (!keys.space) {
      spacePressedRef.current = false;
    }

    const pulses = sonarPulsesRef.current;
    for (const pulse of pulses) {
      if (!pulse.active) continue;

      pulse.radius += pulse.speed * deltaTime;
      pulse.opacity = 0.8 * (1 - pulse.radius / pulse.maxRadius);

      if (pulse.radius >= pulse.maxRadius) {
        pulse.active = false;
        continue;
      }

      const collision = checkSonarPixelCollision(pulse);
      if (collision && collision.hit) {
        const wall = wallsRef.current[collision.wallIndex];
        const normal = getWallNormal(wall, pulse.x, pulse.y);
        const incomingAngle = Math.atan2(collision.hitY - pulse.y, collision.hitX - pulse.x);
        const reflectDir = reflectVector(
          Math.cos(incomingAngle),
          Math.sin(incomingAngle),
          normal.x,
          normal.y
        );

        const hasExistingReflection = pulse.reflections.some(
          r => r.collidedWallIndex === collision.wallIndex && r.active
        );

        if (!hasExistingReflection) {
          pulse.reflections.push({
            x: collision.hitX,
            y: collision.hitY,
            radius: 0,
            dx: reflectDir.x,
            dy: reflectDir.y,
            normalX: normal.x,
            normalY: normal.y,
            hasReturned: false,
            active: true,
            collidedWallIndex: collision.wallIndex,
            travelDistance: pulse.radius,
          });
        }
      }

      for (const refl of pulse.reflections) {
        if (!refl.active) continue;

        refl.radius += pulse.speed * deltaTime;
        refl.travelDistance += pulse.speed * deltaTime;

        const distToSub = Math.sqrt(
          Math.pow(refl.x - sub.x, 2) + Math.pow(refl.y - sub.y, 2)
        );

        if (!refl.hasReturned && refl.radius >= distToSub) {
          refl.hasReturned = true;
          playBeep();
        }

        if (refl.travelDistance > pulse.maxRadius * 1.5) {
          refl.active = false;
        }
      }
    }

    sonarPulsesRef.current = pulses.filter(p => p.active || p.reflections.some(r => r.active));

    for (const particle of particlePoolRef.current) {
      if (!particle.active) continue;

      particle.life -= deltaTime;
      if (particle.life <= 0) {
        recycleParticle(particle);
        continue;
      }

      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }

    const subVertices = getTriangleVertices(sub);
    for (const mineral of mineralsRef.current) {
      if (mineral.collected) continue;

      const dist = circleTriangleDistance(mineral.x, mineral.y, mineral.radius, subVertices);
      if (dist < 30) {
        mineral.collected = true;
        mineral.collectProgress = 0;
        scoreRef.current += 10;
        onScoreUpdate(scoreRef.current);
        spawnCollectParticles(mineral.x, mineral.y, mineral.color);
      }
    }

    const depth = Math.floor((sub.y / CANVAS_HEIGHT) * 500 + 100);
    onDepthUpdate(depth);

    radarScanAngleRef.current += deltaTime * Math.PI;
    if (timestamp - radarLastScanTimeRef.current > 16) {
      updateExploredMap();
      radarLastScanTimeRef.current = timestamp;
    }

    drawBackground(ctx);
    drawWalls(ctx);
    drawMinerals(ctx, timestamp / 1000);
    drawParticles(ctx);
    drawSonarPulses(ctx);
    drawSubmarine(ctx, sub);
    drawMiniRadar();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isLoading, fireSonar, spawnWakeParticles, spawnCollectParticles, recycleParticle, playBeep, updateExploredMap, onScoreUpdate, onDepthUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keysRef.current.w = true;
      if (key === 'a') keysRef.current.a = true;
      if (key === 's') keysRef.current.s = true;
      if (key === 'd') keysRef.current.d = true;
      if (key === ' ') {
        keysRef.current.space = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keysRef.current.w = false;
      if (key === 'a') keysRef.current.a = false;
      if (key === 's') keysRef.current.s = false;
      if (key === 'd') keysRef.current.d = false;
      if (key === ' ') keysRef.current.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    wallsRef.current = generateMazeWalls();
    mineralsRef.current = generateMinerals(wallsRef.current);
    initParticlePool();
    initWallPixelData();

    const exploredCanvas = document.createElement('canvas');
    exploredCanvas.width = MINI_RADAR_SIZE;
    exploredCanvas.height = MINI_RADAR_SIZE;
    const eCtx = exploredCanvas.getContext('2d');
    if (eCtx) {
      eCtx.fillStyle = '#000000';
      eCtx.fillRect(0, 0, MINI_RADAR_SIZE, MINI_RADAR_SIZE);
    }
    exploredCanvasRef.current = exploredCanvas;

    loadAnimationRef.current.startTime = Date.now();

    const loadTimer = setInterval(() => {
      const elapsed = Date.now() - loadAnimationRef.current.startTime;
      loadAnimationRef.current.progress = Math.min(1, elapsed / 500);
      if (loadAnimationRef.current.progress >= 1) {
        clearInterval(loadTimer);
        setIsLoading(false);
        lastFrameTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    }, 16);

    return () => {
      clearInterval(loadTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [generateMazeWalls, generateMinerals, initParticlePool, initWallPixelData, gameLoop]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          display: 'block',
          borderRadius: 8,
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.2)',
          transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          clipPath: isLoading ? 'circle(0% at 50% 50%)' : 'circle(100% at 50% 50%)',
          animation: !isLoading ? 'circleReveal 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : undefined,
        }}
      />

      <canvas
        ref={miniRadarCanvasRef}
        width={MINI_RADAR_SIZE}
        height={MINI_RADAR_SIZE}
        style={{
          position: 'absolute',
          top: 15,
          right: 15,
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @keyframes circleReveal {
          from {
            clip-path: circle(0% at 50% 50%);
          }
          to {
            clip-path: circle(100% at 50% 50%);
          }
        }
      `}</style>
    </div>
  );
};

export default GameCanvas;
