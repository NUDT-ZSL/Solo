import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  applyInertia,
  calculateShadow,
  createShadowWorker,
  interpolateKeyframes,
  type PhysicsState,
  type ShadowResult,
} from './utils/shadowPhysics';

export interface PuppetCharacter {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  width: number;
  height: number;
  silhouettePath: number[][];
  color: string;
  vx: number;
  vy: number;
  vr: number;
  jointPhase: number;
}

export interface Keyframe {
  time: number;
  characterStates: Record<string, { x: number; y: number; rotation: number; scale: number }>;
  lightX: number;
  lightY: number;
}

interface ShadowStageProps {
  characters: PuppetCharacter[];
  setCharacters: React.Dispatch<React.SetStateAction<PuppetCharacter[]>>;
  lightPos: { x: number; y: number };
  setLightPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  isPlaying: boolean;
  keyframes: Keyframe[];
  currentTime: number;
  totalDuration: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCharacterMove?: (id: string, x: number, y: number, rotation: number, scale: number) => void;
}

const SILHOUETTE_COLORS: Record<string, string> = {
  monkey: '#4a2c0a',
  crane: '#3d2208',
  scholar: '#5a3410',
  warrior: '#3e2510',
  dragon: '#5c3012',
  lady: '#4d2a0c',
};

function generateSilhouette(type: string, w: number, h: number): number[][] {
  const cx = w / 2;
  const cy = h / 2;
  const points: number[][] = [];

  switch (type) {
    case 'monkey': {
      const bodyW = w * 0.3;
      const bodyH = h * 0.4;
      const headR = w * 0.18;
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        points.push([cx + Math.cos(a) * headR, cy - bodyH / 2 - headR * 0.5 + Math.sin(a) * headR]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx - bodyW / 2 + t * bodyW, cy - bodyH / 2]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx + bodyW / 2, cy - bodyH / 2 + t * bodyH]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx + bodyW / 2 - t * bodyW, cy + bodyH / 2]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx - bodyW / 2, cy + bodyH / 2 - t * bodyH]);
      }
      const tailSteps = 8;
      for (let i = 0; i <= tailSteps; i++) {
        const t = i / tailSteps;
        points.push([
          cx + bodyW / 2 + t * w * 0.2,
          cy + bodyH / 2 - Math.sin(t * Math.PI * 1.5) * h * 0.15,
        ]);
      }
      break;
    }
    case 'crane': {
      const bodyW = w * 0.25;
      const bodyH = h * 0.25;
      const neckH = h * 0.3;
      const headR = w * 0.08;
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        points.push([cx - bodyW + t * bodyW * 2, cy + bodyH * 0.3 - Math.sin(t * Math.PI) * bodyH * 0.3]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([
          cx + bodyW * 0.5 - t * bodyW * 0.2,
          cy + bodyH * 0.3 - t * neckH,
        ]);
      }
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        points.push([
          cx + bodyW * 0.3 + Math.cos(a) * headR,
          cy + bodyH * 0.3 - neckH + Math.sin(a) * headR,
        ]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([
          cx - bodyW * 0.8 - t * w * 0.15,
          cy + bodyH * 0.3 + t * h * 0.35,
        ]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([
          cx + bodyW * 0.5 + t * w * 0.2,
          cy + bodyH * 0.3 + t * h * 0.3,
        ]);
      }
      break;
    }
    case 'scholar': {
      const bodyW = w * 0.35;
      const bodyH = h * 0.55;
      const headR = w * 0.15;
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        points.push([cx + Math.cos(a) * headR, cy - bodyH / 2 + Math.sin(a) * headR]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx + headR + t * (bodyW / 2 - headR), cy - bodyH / 2 + t * bodyH * 0.15]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx + bodyW / 2 + Math.sin(t * Math.PI) * w * 0.1, cy - bodyH * 0.35 + t * bodyH * 0.7]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx + bodyW / 2 - t * bodyW, cy + bodyH / 2]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx - bodyW / 2 - Math.sin(t * Math.PI) * w * 0.1, cy + bodyH / 2 - t * bodyH * 0.7]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx - headR - t * (bodyW / 2 - headR), cy - bodyH * 0.35 + t * bodyH * 0.2]);
      }
      break;
    }
    case 'warrior': {
      const bodyW = w * 0.4;
      const bodyH = h * 0.5;
      const headR = w * 0.14;
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        points.push([cx + Math.cos(a) * headR, cy - bodyH / 2 + Math.sin(a) * headR * 0.9]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx + bodyW / 2 + Math.sin(t * Math.PI * 2) * w * 0.05, cy - bodyH * 0.3 + t * bodyH * 0.6]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx + bodyW * 0.6 + t * w * 0.15, cy - bodyH * 0.2 + t * h * 0.1]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx + bodyW / 2 - t * bodyW, cy + bodyH / 2]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx - bodyW / 2 - Math.sin(t * Math.PI * 2) * w * 0.05, cy + bodyH / 2 - t * bodyH * 0.6]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([cx - bodyW * 0.6 - t * w * 0.2, cy - bodyH * 0.1 + t * h * 0.15]);
      }
      break;
    }
    case 'dragon': {
      const segments = 20;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const sx = cx - w * 0.4 + t * w * 0.8;
        const sy = cy + Math.sin(t * Math.PI * 3) * h * 0.2;
        const thickness = (1 - Math.abs(t - 0.5) * 1.6) * h * 0.15;
        points.push([sx, sy - Math.max(thickness, 3)]);
      }
      for (let i = segments; i >= 0; i--) {
        const t = i / segments;
        const sx = cx - w * 0.4 + t * w * 0.8;
        const sy = cy + Math.sin(t * Math.PI * 3) * h * 0.2;
        const thickness = (1 - Math.abs(t - 0.5) * 1.6) * h * 0.15;
        points.push([sx, sy + Math.max(thickness, 3)]);
      }
      const headR2 = w * 0.12;
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        points.push([cx - w * 0.35 + Math.cos(a) * headR2, cy + Math.sin(a) * headR2]);
      }
      break;
    }
    case 'lady': {
      const bodyW = w * 0.3;
      const bodyH = h * 0.55;
      const headR = w * 0.12;
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        points.push([cx + Math.cos(a) * headR, cy - bodyH / 2 + Math.sin(a) * headR]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([
          cx + headR + t * (bodyW * 0.4 - headR),
          cy - bodyH / 2 + t * bodyH * 0.15,
        ]);
      }
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const skirtW = bodyW * 0.6 + Math.sin(t * Math.PI) * bodyW * 0.4;
        points.push([cx + skirtW * Math.cos(t * Math.PI * 0.3), cy - bodyH * 0.35 + t * bodyH * 0.85]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([cx - bodyW * 0.6 - Math.sin(t * Math.PI) * bodyW * 0.2, cy + bodyH / 2 - t * bodyH * 0.85]);
      }
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        points.push([
          cx - headR - t * (bodyW * 0.3 - headR),
          cy - bodyH * 0.35 + t * bodyH * 0.2,
        ]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([
          cx + bodyW * 0.5 + t * w * 0.1,
          cy - bodyH * 0.3 + Math.sin(t * Math.PI * 2) * h * 0.08,
        ]);
      }
      break;
    }
    default: {
      const r = Math.min(w, h) * 0.4;
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    }
  }

  return points;
}

export function createCharacter(type: string, name: string, x: number, y: number): PuppetCharacter {
  const w = type === 'dragon' ? 180 : 100;
  const h = type === 'crane' ? 180 : 150;
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    type,
    x,
    y,
    rotation: 0,
    scale: 1,
    width: w,
    height: h,
    silhouettePath: generateSilhouette(type, w, h),
    color: SILHOUETTE_COLORS[type] || '#4a2c0a',
    vx: 0,
    vy: 0,
    vr: 0,
    jointPhase: Math.random() * Math.PI * 2,
  };
}

const ShadowStage: React.FC<ShadowStageProps> = ({
  characters,
  setCharacters,
  lightPos,
  setLightPos,
  selectedId,
  setSelectedId,
  isPlaying,
  keyframes,
  currentTime,
  totalDuration,
  canvasRef,
  onCharacterMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const shadowResultsRef = useRef<ShadowResult[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const physicsStatesRef = useRef<Map<string, PhysicsState>>(new Map());

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    charStartX: number;
    charStartY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    mode: 'move' | 'rotate' | 'scale';
    startRotation: number;
    startScale: number;
    startDist: number;
  } | null>(null);

  useEffect(() => {
    const worker = createShadowWorker();
    if (worker) {
      worker.onmessage = (e: MessageEvent<ShadowResult[]>) => {
        shadowResultsRef.current = e.data;
      };
      workerRef.current = worker;
    }
    return () => {
      worker?.terminate();
    };
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, [canvasRef]);

  const hitTest = useCallback((px: number, py: number): string | null => {
    for (let i = characters.length - 1; i >= 0; i--) {
      const c = characters[i];
      const dx = px - c.x;
      const dy = py - c.y;
      const cos = Math.cos(-c.rotation);
      const sin = Math.sin(-c.rotation);
      const localX = (dx * cos - dy * sin) / c.scale;
      const localY = (dx * sin + dy * cos) / c.scale;
      const hw = c.width / 2 + 20;
      const hh = c.height / 2 + 20;
      if (Math.abs(localX) <= hw && Math.abs(localY) <= hh) {
        return c.id;
      }
    }
    return null;
  }, [characters]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPlaying) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTouch = 'touches' in e;
    const touches = isTouch ? (e as React.TouchEvent).touches : null;

    if (touches && touches.length === 2) {
      const t1 = touches[0];
      const t2 = touches[1];
      const rect = canvas.getBoundingClientRect();
      const x1 = ((t1.clientX - rect.left) / rect.width) * canvas.width;
      const y1 = ((t1.clientY - rect.top) / rect.height) * canvas.height;
      const x2 = ((t2.clientX - rect.left) / rect.width) * canvas.width;
      const y2 = ((t2.clientY - rect.top) / rect.height) * canvas.height;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const hitId = hitTest(midX, midY);
      if (hitId) {
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const char = characters.find((c) => c.id === hitId);
        dragRef.current = {
          id: hitId,
          startX: midX,
          startY: midY,
          charStartX: char?.x || 0,
          charStartY: char?.y || 0,
          lastX: midX,
          lastY: midY,
          lastTime: performance.now(),
          mode: 'rotate',
          startRotation: char?.rotation || 0,
          startScale: char?.scale || 1,
          startDist: dist,
        };
        dragRef.current.mode = 'scale';
        setSelectedId(hitId);
        setIsDragging(true);
      }
      return;
    }

    const pos = getCanvasCoords(e);
    const hitId = hitTest(pos.x, pos.y);

    if (hitId) {
      const char = characters.find((c) => c.id === hitId);
      dragRef.current = {
        id: hitId,
        startX: pos.x,
        startY: pos.y,
        charStartX: char?.x || 0,
        charStartY: char?.y || 0,
        lastX: pos.x,
        lastY: pos.y,
        lastTime: performance.now(),
        mode: 'move',
        startRotation: char?.rotation || 0,
        startScale: char?.scale || 1,
        startDist: 0,
      };
      setSelectedId(hitId);
      setIsDragging(true);
    } else {
      setSelectedId(null);
      setLightPos({ x: pos.x, y: pos.y });
    }
  }, [characters, isPlaying, hitTest, getCanvasCoords, setSelectedId, setLightPos, canvasRef]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current || !isDragging) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isTouch = 'touches' in e;
    const touches = isTouch ? (e as React.TouchEvent).touches : null;

    if (touches && touches.length === 2 && dragRef.current.mode === 'scale') {
      const t1 = touches[0];
      const t2 = touches[1];
      const rect = canvas.getBoundingClientRect();
      const x1 = ((t1.clientX - rect.left) / rect.width) * canvas.width;
      const y1 = ((t1.clientY - rect.top) / rect.height) * canvas.height;
      const x2 = ((t2.clientX - rect.left) / rect.width) * canvas.width;
      const y2 = ((t2.clientY - rect.top) / rect.height) * canvas.height;
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angle = Math.atan2(y2 - y1, x2 - x1);

      const scaleRatio = dist / (dragRef.current.startDist || 1);
      const newScale = Math.max(0.3, Math.min(3, dragRef.current.startScale * scaleRatio));
      const newRotation = dragRef.current.startRotation + (angle - Math.atan2(0, 1));

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === dragRef.current!.id ? { ...c, scale: newScale, rotation: newRotation } : c,
        ),
      );
      return;
    }

    const pos = getCanvasCoords(e);
    const now = performance.now();
    const dt = now - dragRef.current.lastTime;

    if (dragRef.current.mode === 'move') {
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      const newX = dragRef.current.charStartX + dx;
      const newY = dragRef.current.charStartY + dy;

      if (dt > 0) {
        const vx = (pos.x - dragRef.current.lastX) / (dt / 16);
        const vy = (pos.y - dragRef.current.lastY) / (dt / 16);
        setCharacters((prev) =>
          prev.map((c) =>
            c.id === dragRef.current!.id ? { ...c, x: newX, y: newY, vx, vy } : c,
          ),
        );
      }

      dragRef.current.lastX = pos.x;
      dragRef.current.lastY = pos.y;
      dragRef.current.lastTime = now;
    }
  }, [isDragging, getCanvasCoords, setCharacters, canvasRef]);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      const { id, mode } = dragRef.current;
      if (mode === 'move') {
        const char = characters.find((c) => c.id === id);
        if (char) {
          const state: PhysicsState = {
            x: char.x,
            y: char.y,
            vx: char.vx,
            vy: char.vy,
            rotation: char.rotation,
            vr: char.vr,
            scale: char.scale,
          };
          physicsStatesRef.current.set(id, state);
          onCharacterMove?.(id, char.x, char.y, char.rotation, char.scale);
        }
      }
    }
    dragRef.current = null;
    setIsDragging(false);
  }, [characters, onCharacterMove]);

  const drawStage = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f5e6c8');
    grad.addColorStop(0.5, '#e8d5a8');
    grad.addColorStop(1, '#d4c090');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const textureSize = 4;
    for (let tx = 0; tx < w; tx += textureSize * 8) {
      for (let ty = 0; ty < h; ty += textureSize * 8) {
        if (Math.random() < 0.03) {
          ctx.fillStyle = `rgba(180, 160, 120, ${Math.random() * 0.05})`;
          ctx.fillRect(tx, ty, textureSize * (2 + Math.random() * 4), textureSize * (1 + Math.random() * 2));
        }
      }
    }
  }, []);

  const drawLightSource = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    const pulseR = 20 + Math.sin(time * 2) * 3;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, pulseR * 4);
    glow.addColorStop(0, 'rgba(255, 220, 100, 0.35)');
    glow.addColorStop(0.3, 'rgba(255, 200, 80, 0.15)');
    glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - pulseR * 4, y - pulseR * 4, pulseR * 8, pulseR * 8);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, pulseR, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseR);
    innerGrad.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
    innerGrad.addColorStop(0.7, 'rgba(255, 200, 100, 0.6)');
    innerGrad.addColorStop(1, 'rgba(255, 180, 60, 0.2)');
    ctx.fillStyle = innerGrad;
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.5;
      const len = pulseR * (1.5 + Math.sin(time * 3 + i) * 0.3);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * pulseR * 0.8, y + Math.sin(angle) * pulseR * 0.8);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const drawShadow = useCallback((ctx: CanvasRenderingContext2D, char: PuppetCharacter, time: number) => {
    const shadow = calculateShadow(
      char.x, char.y, char.width, char.height,
      lightPos.x, lightPos.y,
      canvasRef.current?.width || 1200,
      canvasRef.current?.height || 800,
    );

    ctx.save();
    ctx.translate(char.x + shadow.offsetX, char.y + shadow.offsetY);
    ctx.rotate(char.rotation);
    ctx.scale(shadow.scaleX * char.scale, shadow.scaleY * char.scale);
    ctx.transform(1, shadow.skewY, shadow.skewX, 1, 0, 0);

    ctx.filter = `blur(${shadow.blurRadius}px)`;
    ctx.beginPath();

    const path = char.silhouettePath;
    if (path.length > 0) {
      ctx.moveTo(path[0][0] - char.width / 2, path[0][1] - char.height / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0] - char.width / 2, path[i][1] - char.height / 2);
      }
      ctx.closePath();
    }

    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, char.width * 0.8);
    shadowGrad.addColorStop(0, `rgba(30, 20, 10, ${shadow.opacity * 0.8})`);
    shadowGrad.addColorStop(0.7, `rgba(40, 30, 15, ${shadow.opacity * 0.5})`);
    shadowGrad.addColorStop(1, `rgba(50, 35, 20, 0)`);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.filter = 'none';
    ctx.restore();
  }, [lightPos, canvasRef]);

  const drawCharacter = useCallback((ctx: CanvasRenderingContext2D, char: PuppetCharacter, isSelected: boolean, time: number) => {
    ctx.save();
    ctx.translate(char.x, char.y);
    ctx.rotate(char.rotation);
    ctx.scale(char.scale, char.scale);

    const jointOffset = Math.sin(time * 3 + char.jointPhase) * 2;
    ctx.translate(0, jointOffset);

    if (isSelected) {
      ctx.shadowColor = 'rgba(255, 220, 100, 0.6)';
      ctx.shadowBlur = 15;
    } else {
      ctx.shadowColor = 'rgba(80, 50, 20, 0.3)';
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    const path = char.silhouettePath;
    if (path.length > 0) {
      ctx.moveTo(path[0][0] - char.width / 2, path[0][1] - char.height / 2);
      for (let i = 1; i < path.length; i++) {
        const px = path[i][0] - char.width / 2;
        const py = path[i][1] - char.height / 2;
        ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    const charGrad = ctx.createRadialGradient(0, -char.height * 0.2, 0, 0, 0, char.height * 0.6);
    charGrad.addColorStop(0, char.color + 'dd');
    charGrad.addColorStop(0.6, char.color + 'cc');
    charGrad.addColorStop(1, char.color + '99');
    ctx.fillStyle = charGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(200, 170, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const glowGrad = ctx.createRadialGradient(0, 0, char.width * 0.3, 0, 0, char.width * 0.7);
    glowGrad.addColorStop(0, 'rgba(255, 230, 150, 0)');
    glowGrad.addColorStop(0.8, 'rgba(255, 230, 150, 0.05)');
    glowGrad.addColorStop(1, 'rgba(255, 230, 150, 0.15)');
    ctx.fillStyle = glowGrad;
    ctx.fill();

    if (isSelected) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-char.width / 2 - 8, -char.height / 2 - 8, char.width + 16, char.height + 16);
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(0, -char.height / 2 - 8, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 220, 100, 0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 160, 60, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -char.height / 2 - 13);
      ctx.lineTo(0, -char.height / 2 - 25);
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const corners = [
        [-char.width / 2 - 8, -char.height / 2 - 8],
        [char.width / 2 + 8, -char.height / 2 - 8],
        [-char.width / 2 - 8, char.height / 2 + 8],
        [char.width / 2 + 8, char.height / 2 + 8],
      ];
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 220, 100, 0.6)';
        ctx.fill();
      }
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const timeSec = timestamp / 1000;

      const dpr = window.devicePixelRatio || 1;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
          canvas.width = Math.floor(cw * dpr);
          canvas.height = Math.floor(ch * dpr);
          canvas.style.width = `${cw}px`;
          canvas.style.height = `${ch}px`;
          ctx.scale(dpr, dpr);
        }
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      drawStage(ctx, w, h, timeSec);

      if (workerRef.current && characters.length > 0) {
        const workerInput = {
          characters: characters.map((c) => ({
            id: c.id,
            x: c.x,
            y: c.y,
            rotation: c.rotation,
            scale: c.scale,
            width: c.width,
            height: c.height,
            silhouettePath: c.silhouettePath,
          })),
          lightX: lightPos.x,
          lightY: lightPos.y,
          stageWidth: w,
          stageHeight: h,
        };
        workerRef.current.postMessage(workerInput);
      }

      for (const char of characters) {
        drawShadow(ctx, char, timeSec);
      }

      for (const char of characters) {
        drawCharacter(ctx, char, char.id === selectedId, timeSec);
      }

      drawLightSource(ctx, lightPos.x, lightPos.y, timeSec);

      if (!isDragging && !isPlaying) {
        setCharacters((prev) => {
          let changed = false;
          const next = prev.map((c) => {
            const state = physicsStatesRef.current.get(c.id);
            if (state && (Math.abs(state.vx) > 0.1 || Math.abs(state.vy) > 0.1 || Math.abs(state.vr) > 0.1)) {
              const newState = applyInertia(state, dt);
              physicsStatesRef.current.set(c.id, newState);
              changed = true;
              return { ...c, x: newState.x, y: newState.y, rotation: newState.rotation, vx: newState.vx, vy: newState.vy, vr: newState.vr };
            }
            physicsStatesRef.current.delete(c.id);
            return c;
          });
          return changed ? next : prev;
        });
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [characters, lightPos, selectedId, isDragging, isPlaying, drawStage, drawLightSource, drawShadow, drawCharacter, setCharacters, canvasRef]);

  useEffect(() => {
    if (!isPlaying || keyframes.length < 2) return;

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    const progress = currentTime / totalDuration;

    let fromIdx = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (progress >= sorted[i].time && progress < sorted[i + 1].time) {
        fromIdx = i;
        break;
      }
    }

    const from = sorted[fromIdx];
    const to = sorted[Math.min(fromIdx + 1, sorted.length - 1)];
    const segDur = to.time - from.time;
    const t = segDur > 0 ? Math.min(1, (progress - from.time) / segDur) : 1;

    setCharacters((prev) =>
      prev.map((c) => {
        const fromState = from.characterStates[c.id];
        const toState = to.characterStates[c.id];
        if (!fromState || !toState) return c;
        const interp = interpolateKeyframes(fromState, toState, t);
        return { ...c, x: interp.x, y: interp.y, rotation: interp.rotation, scale: interp.scale };
      }),
    );

    if (from && to) {
      const lt = t;
      setLightPos({
        x: from.lightX + (to.lightX - from.lightX) * lt,
        y: from.lightY + (to.lightY - from.lightY) * lt,
      });
    }
  }, [isPlaying, keyframes, currentTime, totalDuration, setCharacters, setLightPos]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: isDragging ? 'grabbing' : 'default' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
};

export default ShadowStage;
