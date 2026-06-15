import type { NodeData, Connection, NetworkState } from './network';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface EffectsState {
  particles: Particle[];
  scanlineOffset: number;
}

export function createEffectsState(): EffectsState {
  return {
    particles: [],
    scanlineOffset: 0
  };
}

export function spawnExplosion(
  effects: EffectsState,
  x: number,
  y: number,
  color: string = '#00FF41'
): void {
  const count = 20 + Math.floor(Math.random() * 11);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 30 + Math.random() * 80;
    effects.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5,
      maxLife: 0.5,
      color,
      size: 2 + Math.floor(Math.random() * 3)
    });
  }
}

export function spawnDisruptFragments(
  effects: EffectsState,
  x: number,
  y: number
): void {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 40;
    effects.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      maxLife: 1.0,
      color: '#FF0000',
      size: 2 + Math.floor(Math.random() * 2)
    });
  }
}

export function updateEffects(
  effects: EffectsState,
  deltaTime: number
): void {
  effects.scanlineOffset = (effects.scanlineOffset + deltaTime * 20) % 4;

  for (let i = effects.particles.length - 1; i >= 0; i--) {
    const p = effects.particles[i];
    p.life -= deltaTime;
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.life <= 0) {
      effects.particles.splice(i, 1);
    }
  }
}

function drawBeveledNode(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fillColor: string,
  hacked: boolean
): void {
  const half = size / 2;
  const x = Math.round(cx - half);
  const y = Math.round(cy - half);

  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y, size - 4, size);
  ctx.fillRect(x, y + 2, size, size - 4);

  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, 2, 2);
  ctx.fillRect(x + size - 2, y, 2, 2);
  ctx.fillRect(x, y + size - 2, 2, 2);
  ctx.fillRect(x + size - 2, y + size - 2, 2, 2);

  ctx.fillStyle = hacked ? '#88FFAA' : addBrightness(fillColor, 40);
  ctx.fillRect(x + 2, y, size - 4, 1);
  ctx.fillRect(x, y + 2, 1, size - 4);

  ctx.fillStyle = hacked ? '#005522' : addBrightness(fillColor, -60);
  ctx.fillRect(x + 2, y + size - 1, size - 4, 1);
  ctx.fillRect(x + size - 1, y + 2, 1, size - 4);
}

function addBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawDefenseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  level: 1 | 2 | 3
): void {
  ctx.lineWidth = 1;

  if (level >= 1) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  if (level >= 2) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (level >= 3) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  conn: Connection
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (conn.infected) {
    const blink = (Math.sin(conn.infectionBlinkPhase) + 1) / 2;
    ctx.strokeStyle = `rgba(0, 255, 65, ${0.4 + blink * 0.6})`;
    ctx.lineWidth = 1.5;
  } else {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 1;
  }

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (!conn.infected) {
    const dotSpacing = 10;
    for (let d = conn.flowOffset; d < len; d += dotSpacing * 2) {
      const t = d / len;
      const px = fromX + dx * t;
      const py = fromY + dy * t;
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
}

function drawScanRipples(
  ctx: CanvasRenderingContext2D,
  node: NodeData
): void {
  for (const r of node.scanRipples) {
    const alpha = 1 - r / 100;
    ctx.strokeStyle = `rgba(0, 150, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDisruptEffect(
  ctx: CanvasRenderingContext2D,
  node: NodeData,
  cx: number,
  cy: number
): void {
  if (node.disruptTimer <= 0) return;

  const alpha = node.disruptTimer;
  const offsets = [
    [-3, -3], [0, -3], [3, -3],
    [-3, 0],          [3, 0],
    [-3, 3],  [0, 3], [3, 3]
  ];

  for (const [ox, oy] of offsets) {
    if (Math.random() < 0.7) {
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.6})`;
      ctx.fillRect(Math.round(cx + ox), Math.round(cy + oy), 2, 2);
    }
  }
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: NodeData
): void {
  let cx = node.x;
  let cy = node.y;

  if (node.shakeTimer > 0) {
    cx += (Math.random() - 0.5) * 6;
    cy += (Math.random() - 0.5) * 6;
  }

  drawScanRipples(ctx, node);

  let color = node.color;
  if (node.hacked) {
    const pulse = (Math.sin(node.pulsePhase) + 1) / 2;
    color = pulse > 0.5 ? '#88FFAA' : '#00FF41';
  } else if (node.flashTimer > 0) {
    const flash = (Math.sin(node.flashTimer * 30) + 1) / 2;
    color = flash > 0.5 ? '#FFFFFF' : node.color;
  }

  if (!node.hacked) {
    drawDefenseRing(ctx, cx, cy, node.defenseLevel);
  }

  drawBeveledNode(ctx, cx, cy, 12, color, node.hacked);

  drawDisruptEffect(ctx, node, cx, cy);

  ctx.fillStyle = node.hacked ? '#003311' : '#000000';
  ctx.font = '8px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.id.toString(), cx, cy + 14);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  effects: EffectsState
): void {
  for (const p of effects.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number
): void {
  ctx.fillStyle = 'rgba(128, 128, 128, 0.03)';
  for (let y = offset; y < height; y += 4) {
    ctx.fillRect(0, Math.round(y), width, 2);
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: NetworkState,
  effects: EffectsState,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, width, height);

  for (const conn of state.connections) {
    const from = state.nodes[conn.from];
    const to = state.nodes[conn.to];
    if (from && to) {
      drawConnection(ctx, from.x, from.y, to.x, to.y, conn);
    }
  }

  for (const node of state.nodes) {
    drawNode(ctx, node);
  }

  drawParticles(ctx, effects);

  drawScanlines(ctx, width, height, effects.scanlineOffset);
}
