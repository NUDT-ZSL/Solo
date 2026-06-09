import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Component,
  Connection,
  SimParams,
  CircuitState,
  ComponentType,
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  LED_COLORS,
  LED_THRESHOLDS,
  BATTERY_COLORS,
  LedColor,
  Point,
} from './types';
import {
  bezierPoint,
  bezierLengthApprox,
  detectCircuit,
} from './CircuitEngine';

const WIRE_COLOR = '#4A90D9';
const WIRE_HIGHLIGHT = '#7EB8FF';
const PARTICLE_COLOR = '#FFAA00';
const PIN_RADIUS = 6;
const PIN_HIT_RADIUS = 12;
const PARTICLE_SPEED = 30;
const PARTICLE_DIAMETER = 3;
const PARTICLE_SPACING = 40;

interface Particle {
  connectionId: string;
  progress: number;
  length: number;
  dying?: boolean;
  dieStart?: number;
}

interface BezierCurve {
  p0: Point;
  p1: Point;
  p2: Point;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultPinPositions(type: ComponentType): Point[] {
  switch (type) {
    case 'battery':
      return [
        { x: 70, y: 17 },
        { x: 0, y: 17 },
      ];
    case 'resistor':
      return [
        { x: 68, y: 10 },
        { x: 0, y: 10 },
      ];
    case 'led':
      return [
        { x: 52, y: 12 },
        { x: 0, y: 12 },
      ];
    case 'switch':
      return [
        { x: 58, y: 22 },
        { x: 6, y: 22 },
      ];
    case 'wire':
      return [
        { x: 35, y: 12 },
        { x: 0, y: 12 },
      ];
  }
}

export function createComponent(
  type: ComponentType,
  gridX: number,
  gridY: number,
  params: Record<string, any>
): Component {
  return {
    id: uid(),
    type,
    position: { x: gridX * GRID_SIZE, y: gridY * GRID_SIZE },
    params,
    pinPositions: defaultPinPositions(type),
  };
}

function getAbsolutePin(comp: Component, pinIdx: number): Point {
  const pin = comp.pinPositions[pinIdx];
  return {
    x: comp.position.x + pin.x,
    y: comp.position.y + pin.y,
  };
}

function computeBezier(
  start: Point,
  end: Point,
  obstacles: Component[]
): BezierCurve {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  let offsetY = 0;
  for (const ob of obstacles) {
    const ocx = ob.position.x + 34;
    const ocy = ob.position.y + 14;
    const dist = Math.hypot(mid.x - ocx, mid.y - ocy);
    if (dist < 40) {
      offsetY = -(40 - dist + 20);
      break;
    }
  }
  if (offsetY === 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    offsetY = Math.min(-20, -Math.abs(dx) * 0.15 - Math.abs(dy) * 0.1);
  }
  return {
    p0: start,
    p1: { x: mid.x, y: mid.y + offsetY },
    p2: end,
  };
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

function hitBezier(p: Point, curve: BezierCurve): boolean {
  let last = curve.p0;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const cur = bezierPoint(t, curve.p0, curve.p1, curve.p2);
    if (pointToSegmentDistance(p, last, cur) < 6) return true;
    last = cur;
  }
  return false;
}

interface BreadboardProps {
  components: Component[];
  connections: Connection[];
  simParams: SimParams;
  onDrop: (type: ComponentType, params: Record<string, any>, gridX: number, gridY: number) => void;
  onAddConnection: (conn: Connection) => void;
  onRemoveConnection: (connId: string) => void;
  onToggleSwitch: (compId: string) => void;
  onRemoveComponent: (compId: string) => void;
}

export default function Breadboard({
  components,
  connections,
  simParams,
  onDrop,
  onAddConnection,
  onRemoveConnection,
  onToggleSwitch,
  onRemoveComponent,
}: BreadboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [selectedPin, setSelectedPin] = useState<{ compId: string; pinIdx: number } | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [flashPins, setFlashPins] = useState<Set<string>>(new Set());
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const prevSimStatusRef = useRef<CircuitState>(simParams.status);

  const canvasW = GRID_COLS * GRID_SIZE;
  const canvasH = GRID_ROWS * GRID_SIZE;
  const offsetX = Math.max(20, (size.w - canvasW) / 2);
  const offsetY = Math.max(20, (size.h - canvasH) / 2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (simParams.status === CircuitState.Closed && prevSimStatusRef.current !== CircuitState.Closed) {
      initParticles();
    } else if (simParams.status !== CircuitState.Closed && prevSimStatusRef.current === CircuitState.Closed) {
      for (const p of particlesRef.current) {
        if (!p.dying) {
          p.dying = true;
          p.dieStart = performance.now();
        }
      }
    }
    prevSimStatusRef.current = simParams.status;
  }, [simParams.status, connections]);

  const initParticles = useCallback(() => {
    const result = detectCircuit(connections, components);
    if (!result.isClosed) return;
    const pathConnIds = new Set<string>();
    for (let i = 0; i < result.orderedPath.length - 1; i++) {
      const a = result.orderedPath[i];
      const b = result.orderedPath[i + 1];
      for (const conn of connections) {
        const match =
          (conn.fromId === a.componentId &&
            conn.fromPinIndex === a.pinIndex &&
            conn.toId === b.componentId &&
            conn.toPinIndex === b.pinIndex) ||
          (conn.toId === a.componentId &&
            conn.toPinIndex === a.pinIndex &&
            conn.fromId === b.componentId &&
            conn.fromPinIndex === b.pinIndex);
        if (match) {
          pathConnIds.add(conn.id);
          break;
        }
      }
    }
    const newParticles: Particle[] = [];
    for (const conn of connections) {
      if (!pathConnIds.has(conn.id)) continue;
      const fromComp = components.find((c) => c.id === conn.fromId);
      const toComp = components.find((c) => c.id === conn.toId);
      if (!fromComp || !toComp) continue;
      const start = getAbsolutePin(fromComp, conn.fromPinIndex);
      const end = getAbsolutePin(toComp, conn.toPinIndex);
      const curve = computeBezier(start, end, components);
      const length = bezierLengthApprox(curve.p0, curve.p1, curve.p2);
      const numParticles = Math.max(1, Math.floor(length / PARTICLE_SPACING));
      for (let i = 0; i < numParticles; i++) {
        newParticles.push({
          connectionId: conn.id,
          progress: i / numParticles,
          length,
        });
      }
    }
    particlesRef.current = newParticles;
  }, [connections, components]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let lastT = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
        canvas.width = size.w * dpr;
        canvas.height = size.h * dpr;
        canvas.style.width = size.w + 'px';
        canvas.style.height = size.h + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);

      ctx.save();
      ctx.translate(offsetX, offsetY);

      ctx.fillStyle = '#2A2A3D';
      roundRect(ctx, -8, -8, canvasW + 16, canvasH + 16, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      for (let c = 0; c <= GRID_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * GRID_SIZE, 0);
        ctx.lineTo(c * GRID_SIZE, canvasH);
        ctx.stroke();
      }
      for (let r = 0; r <= GRID_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * GRID_SIZE);
        ctx.lineTo(canvasW, r * GRID_SIZE);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const bre = detectCircuit(connections, components);
      const pathConnIds = new Set<string>();
      const pathComponentIds = new Set<string>();
      if (bre.isClosed) {
        for (let i = 0; i < bre.orderedPath.length - 1; i++) {
          const a = bre.orderedPath[i];
          const b = bre.orderedPath[i + 1];
          pathComponentIds.add(a.componentId);
          pathComponentIds.add(b.componentId);
          for (const conn of connections) {
            const match =
              (conn.fromId === a.componentId &&
                conn.fromPinIndex === a.pinIndex &&
                conn.toId === b.componentId &&
                conn.toPinIndex === b.pinIndex) ||
              (conn.toId === a.componentId &&
                conn.toPinIndex === a.pinIndex &&
                conn.fromId === b.componentId &&
                conn.fromPinIndex === b.pinIndex);
            if (match) {
              pathConnIds.add(conn.id);
              break;
            }
          }
        }
      }

      for (const conn of connections) {
        const fromComp = components.find((c) => c.id === conn.fromId);
        const toComp = components.find((c) => c.id === conn.toId);
        if (!fromComp || !toComp) continue;
        const start = getAbsolutePin(fromComp, conn.fromPinIndex);
        const end = getAbsolutePin(toComp, conn.toPinIndex);
        const curve = computeBezier(start, end, components);
        const isHighlight = hoveredConnId === conn.id;
        ctx.beginPath();
        ctx.moveTo(curve.p0.x, curve.p0.y);
        ctx.quadraticCurveTo(curve.p1.x, curve.p1.y, curve.p2.x, curve.p2.y);
        ctx.strokeStyle = isHighlight ? WIRE_HIGHLIGHT : WIRE_COLOR;
        ctx.lineWidth = isHighlight ? 3 : 2;
        if (pathConnIds.has(conn.id) && simParams.status === CircuitState.Closed) {
          ctx.shadowColor = WIRE_COLOR;
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (simParams.status === CircuitState.Closed) {
        const alive: Particle[] = [];
        for (const p of particlesRef.current) {
          if (!pathConnIds.has(p.connectionId)) continue;
          const conn = connections.find((c) => c.id === p.connectionId);
          if (!conn) continue;
          const fromComp = components.find((c) => c.id === conn.fromId);
          const toComp = components.find((c) => c.id === conn.toId);
          if (!fromComp || !toComp) continue;
          const start = getAbsolutePin(fromComp, conn.fromPinIndex);
          const end = getAbsolutePin(toComp, conn.toPinIndex);
          const curve = computeBezier(start, end, components);
          if (!p.dying) {
            p.progress += (PARTICLE_SPEED * dt) / Math.max(1, p.length);
            if (p.progress >= 1) p.progress -= 1;
          }
          const pos = bezierPoint(p.progress, curve.p0, curve.p1, curve.p2);
          let alpha = 1;
          if (p.dying && p.dieStart != null) {
            alpha = Math.max(0, 1 - (now - p.dieStart) / 200);
          }
          if (alpha > 0) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, PARTICLE_DIAMETER / 2, 0, Math.PI * 2);
            ctx.fillStyle = PARTICLE_COLOR;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = PARTICLE_COLOR;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            if (!p.dying || alpha > 0) alive.push(p);
          }
        }
        particlesRef.current = alive;
      } else {
        const alive: Particle[] = [];
        for (const p of particlesRef.current) {
          if (p.dying && p.dieStart != null) {
            const alpha = Math.max(0, 1 - (now - p.dieStart) / 200);
            const conn = connections.find((c) => c.id === p.connectionId);
            if (conn) {
              const fromComp = components.find((c) => c.id === conn.fromId);
              const toComp = components.find((c) => c.id === conn.toId);
              if (fromComp && toComp) {
                const start = getAbsolutePin(fromComp, conn.fromPinIndex);
                const end = getAbsolutePin(toComp, conn.toPinIndex);
                const curve = computeBezier(start, end, components);
                const pos = bezierPoint(p.progress, curve.p0, curve.p1, curve.p2);
                if (alpha > 0) {
                  ctx.beginPath();
                  ctx.arc(pos.x, pos.y, PARTICLE_DIAMETER / 2, 0, Math.PI * 2);
                  ctx.fillStyle = PARTICLE_COLOR;
                  ctx.globalAlpha = alpha;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                  alive.push(p);
                }
              }
            }
          }
        }
        particlesRef.current = alive;
      }

      for (const comp of components) {
        drawComponent(ctx, comp, now, simParams, selectedPin, flashPins);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    size,
    components,
    connections,
    simParams,
    selectedPin,
    flashPins,
    hoveredConnId,
    offsetX,
    offsetY,
  ]);

  const flashPin = (compId: string, pinIdx: number) => {
    const key = `${compId}-${pinIdx}`;
    setFlashPins((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setFlashPins((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);
  };

  const hitTestPin = (canvasX: number, canvasY: number): { compId: string; pinIdx: number } | null => {
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      for (let pi = 0; pi < comp.pinPositions.length; pi++) {
        const pin = getAbsolutePin(comp, pi);
        const d = Math.hypot(pin.x - canvasX, pin.y - canvasY);
        if (d <= PIN_HIT_RADIUS) return { compId: comp.id, pinIdx: pi };
      }
    }
    return null;
  };

  const hitTestSwitchButton = (canvasX: number, canvasY: number): string | null => {
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (comp.type !== 'switch') continue;
      const bx = comp.position.x + 22;
      const by = comp.position.y + 4;
      if (canvasX >= bx && canvasX <= bx + 22 && canvasY >= by && canvasY <= by + 18) {
        return comp.id;
      }
    }
    return null;
  };

  const hitTestComponentBody = (canvasX: number, canvasY: number): string | null => {
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      const w = comp.type === 'battery' ? 70 : comp.type === 'switch' ? 60 : comp.type === 'wire' ? 35 : 70;
      const h = 30;
      if (
        canvasX >= comp.position.x - 2 &&
        canvasX <= comp.position.x + w + 2 &&
        canvasY >= comp.position.y - 2 &&
        canvasY <= comp.position.y + h
      ) {
        return comp.id;
      }
    }
    return null;
  };

  const hitTestConnection = (canvasX: number, canvasY: number): string | null => {
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i];
      const fromComp = components.find((c) => c.id === conn.fromId);
      const toComp = components.find((c) => c.id === conn.toId);
      if (!fromComp || !toComp) continue;
      const start = getAbsolutePin(fromComp, conn.fromPinIndex);
      const end = getAbsolutePin(toComp, conn.toPinIndex);
      const curve = computeBezier(start, end, components);
      if (hitBezier({ x: canvasX, y: canvasY }, curve)) return conn.id;
    }
    return null;
  };

  const getCanvasXY = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - offsetX,
      y: e.clientY - rect.top - offsetY,
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    const swId = hitTestSwitchButton(x, y);
    if (swId) {
      onToggleSwitch(swId);
      return;
    }
    const pin = hitTestPin(x, y);
    if (pin) {
      flashPin(pin.compId, pin.pinIdx);
      if (!selectedPin) {
        setSelectedPin(pin);
      } else {
        if (selectedPin.compId !== pin.compId || selectedPin.pinIdx !== pin.pinIdx) {
          const exists = connections.some(
            (c) =>
              (c.fromId === selectedPin.compId &&
                c.fromPinIndex === selectedPin.pinIndex &&
                c.toId === pin.compId &&
                c.toPinIndex === pin.pinIdx) ||
              (c.toId === selectedPin.compId &&
                c.toPinIndex === selectedPin.pinIndex &&
                c.fromId === pin.compId &&
                c.fromPinIndex === pin.pinIdx)
          );
          if (!exists) {
            onAddConnection({
              id: uid(),
              fromId: selectedPin.compId,
              fromPinIndex: selectedPin.pinIndex,
              toId: pin.compId,
              toPinIndex: pin.pinIdx,
            });
          }
        }
        setSelectedPin(null);
      }
      return;
    }
    setSelectedPin(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    const connId = hitTestConnection(x, y);
    if (connId) {
      onRemoveConnection(connId);
      return;
    }
    const compId = hitTestComponentBody(x, y);
    if (compId) {
      onRemoveComponent(compId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasXY(e);
    const connId = hitTestConnection(x, y);
    setHoveredConnId(connId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - offsetX;
      const y = e.clientY - rect.top - offsetY;
      let gridX = Math.round(x / GRID_SIZE);
      let gridY = Math.round(y / GRID_SIZE);
      gridX = Math.max(0, Math.min(GRID_COLS - 2, gridX));
      gridY = Math.max(0, Math.min(GRID_ROWS - 1, gridY));
      onDrop(parsed.type, parsed.params || {}, gridX, gridY);
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#1E1E2E',
        minWidth: 0,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {simParams.status === CircuitState.Open && components.some((c) => c.type === 'battery') && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,68,68,0.2)',
            color: '#FF6B6B',
            padding: '8px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: 14,
            border: '1px solid rgba(255,68,68,0.4)',
            animation: 'openCircuitBlink 1s infinite',
            zIndex: 5,
          }}
        >
          ⚠ 断路
        </div>
      )}
      <style>{`
        @keyframes openCircuitBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawComponent(
  ctx: CanvasRenderingContext2D,
  comp: Component,
  now: number,
  simParams: SimParams,
  selectedPin: { compId: string; pinIdx: number } | null,
  flashPins: Set<string>
) {
  const { x, y } = comp.position;
  const bre = detectCircuitDummyCache(comp, simParams);
  const inCircuit = bre.inPath;

  switch (comp.type) {
    case 'battery': {
      const v = Number(comp.params.voltage) || 1.5;
      const col = BATTERY_COLORS[v] || '#FFD966';
      roundRect(ctx, x, y + 4, 60, 22, 4);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();
      roundRect(ctx, x + 60, y + 10, 6, 10, 2);
      ctx.fillStyle = '#888';
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + 50, y + 15);
      ctx.fillText('-', x + 10, y + 15);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#333';
      ctx.fillText(`${v}V`, x + 26, y + 15);
      break;
    }
    case 'resistor': {
      const r = Number(comp.params.resistance) || 100;
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.moveTo(x + 58, y + 10);
      ctx.lineTo(x + 68, y + 10);
      ctx.stroke();
      roundRect(ctx, x + 10, y + 4, 48, 14, 3);
      ctx.fillStyle = '#C9A66B';
      ctx.fill();
      ctx.strokeStyle = '#8B6F47';
      ctx.lineWidth = 1;
      ctx.stroke();
      const bands = bandColors(r);
      for (let i = 0; i < bands.length; i++) {
        ctx.fillStyle = bands[i];
        ctx.fillRect(x + 16 + i * 8, y + 4, 3, 14);
      }
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px monospace';
      ctx.textBaseline = 'middle';
      const label = r >= 1000 ? `${r / 1000}k` : `${r}`;
      ctx.fillText(label, x + 40, y + 11);
      break;
    }
    case 'led': {
      const color = (comp.params.color as LedColor) || 'red';
      const threshold = LED_THRESHOLDS[color];
      const shouldGlow = simParams.status === CircuitState.Closed && simParams.current >= threshold && inCircuit;
      const breathe = shouldGlow ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((now / 1000) * (2 * Math.PI) / 1.5)) : 0.35;
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x + 10, y + 12);
      ctx.moveTo(x + 42, y + 12);
      ctx.lineTo(x + 52, y + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 10, y + 4);
      ctx.lineTo(x + 10, y + 20);
      ctx.lineTo(x + 32, y + 12);
      ctx.closePath();
      ctx.fillStyle = shouldGlow ? LED_COLORS[color] : '#666';
      ctx.globalAlpha = breathe;
      if (shouldGlow) {
        ctx.shadowColor = LED_COLORS[color];
        ctx.shadowBlur = 20;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 32, y + 4);
      ctx.lineTo(x + 32, y + 20);
      ctx.stroke();

      ctx.strokeStyle = shouldGlow ? LED_COLORS[color] : '#999';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = shouldGlow ? 0.9 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 2);
      ctx.lineTo(x + 24, y - 2);
      ctx.moveTo(x + 24, y + 3);
      ctx.lineTo(x + 28, y - 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'switch': {
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x + 6, y + 22);
      ctx.moveTo(x + 52, y + 22);
      ctx.lineTo(x + 58, y + 22);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 6, y + 22, 3, 0, Math.PI * 2);
      ctx.arc(x + 52, y + 22, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#666';
      ctx.fill();

      ctx.strokeStyle = comp.params.closed ? '#00FF88' : '#aaa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (comp.params.closed) {
        ctx.moveTo(x + 6, y + 22);
        ctx.lineTo(x + 52, y + 22);
      } else {
        ctx.moveTo(x + 6, y + 22);
        ctx.lineTo(x + 44, y + 10);
      }
      ctx.stroke();

      roundRect(ctx, x + 22, y + 4, 22, 18, 4);
      ctx.fillStyle = comp.params.closed ? '#2A5C3E' : '#5A2A2A';
      ctx.fill();
      ctx.strokeStyle = comp.params.closed ? '#00FF88' : '#FF6B6B';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = comp.params.closed ? '#00FF88' : '#FF6B6B';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comp.params.closed ? 'ON' : 'OFF', x + 33, y + 13);
      ctx.textAlign = 'left';
      break;
    }
    case 'wire': {
      const start = { x: x + 0, y: y + 12 };
      const end = { x: x + 35, y: y + 12 };
      const curve = {
        p0: start,
        p1: { x: x + 17.5, y: y + 4 },
        p2: end,
      };
      ctx.beginPath();
      ctx.moveTo(curve.p0.x, curve.p0.y);
      ctx.quadraticCurveTo(curve.p1.x, curve.p1.y, curve.p2.x, curve.p2.y);
      ctx.strokeStyle = WIRE_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
  }

  for (let pi = 0; pi < comp.pinPositions.length; pi++) {
    const pin = comp.pinPositions[pi];
    const px = x + pin.x;
    const py = y + pin.y;
    const key = `${comp.id}-${pi}`;
    const isSelected = selectedPin && selectedPin.compId === comp.id && selectedPin.pinIdx === pi;
    const isFlash = flashPins.has(key);

    ctx.beginPath();
    ctx.arc(px, py, PIN_RADIUS, 0, Math.PI * 2);
    const grd = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PIN_RADIUS);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.5, 'rgba(200,200,200,0.4)');
    grd.addColorStop(1, 'rgba(120,120,140,0.6)');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#00FF00' : isFlash ? '#00FF00' : '#888';
    ctx.lineWidth = isFlash ? 2 : 1;
    ctx.stroke();

    if (isSelected || isFlash) {
      ctx.beginPath();
      ctx.arc(px, py, PIN_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#00FF00';
      ctx.globalAlpha = isFlash ? 0.9 : 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (isPinConnected(comp.id, pi)) {
      ctx.beginPath();
      ctx.arc(px + PIN_RADIUS + 2, py - PIN_RADIUS - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00FF88';
      ctx.fill();
    }
  }
}

let _pinConnCache: Set<string> | null = null;
let _pinConnCacheKey = '';
function isPinConnected(compId: string, pinIdx: number): boolean {
  return false;
}

function detectCircuitDummyCache(_comp: Component, _sp: SimParams): { inPath: boolean } {
  return { inPath: true };
}

function bandColors(r: number): string[] {
  const table: Record<number, string> = {
    0: '#000000', 1: '#6B4423', 2: '#D32F2F', 3: '#FF7F00',
    4: '#FFD700', 5: '#00AA00', 6: '#2196F3', 7: '#9C27B0',
    8: '#888888', 9: '#EEEEEE',
  };
  const digits = r.toString().padStart(3, '0').split('').map((d) => parseInt(d, 10));
  return [table[digits[0]] || '#000', table[digits[1]] || '#000', table[Math.min(2, digits[2])] || '#000'];
}
