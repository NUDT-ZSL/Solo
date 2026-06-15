import { FragmentData } from './ImageProcessor';

export interface FragmentState {
  id: number;
  x: number;
  y: number;
  rotation: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  snapped: boolean;
  flashAlpha: number;
  connectionAlpha: number;
  dragging: boolean;
}

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

export function scatterFragments(
  fragments: FragmentData[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number
): FragmentState[] {
  const states: FragmentState[] = [];

  for (const frag of fragments) {
    const dx = frag.width;
    const dy = frag.height;
    const diagonal = Math.sqrt(dx * dx + dy * dy);
    let placed = false;

    for (let attempt = 0; attempt < 100; attempt++) {
      const rx = padding + Math.random() * (canvasWidth - 2 * padding);
      const ry = padding + Math.random() * (canvasHeight - 2 * padding);
      let overlaps = false;

      for (const s of states) {
        const ddx = rx - s.x;
        const ddy = ry - s.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < diagonal) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        states.push({
          id: frag.id,
          x: rx,
          y: ry,
          rotation: Math.random() * Math.PI * 2,
          targetX: rx,
          targetY: ry,
          velocityX: 0,
          velocityY: 0,
          snapped: false,
          flashAlpha: 0,
          connectionAlpha: 0,
          dragging: false,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const rx = padding + Math.random() * (canvasWidth - 2 * padding);
      const ry = padding + Math.random() * (canvasHeight - 2 * padding);
      states.push({
        id: frag.id,
        x: rx,
        y: ry,
        rotation: Math.random() * Math.PI * 2,
        targetX: rx,
        targetY: ry,
        velocityX: 0,
        velocityY: 0,
        snapped: false,
        flashAlpha: 0,
        connectionAlpha: 0,
        dragging: false,
      });
    }
  }

  return states;
}

export function updateFragmentPhysics(state: FragmentState, dt: number): FragmentState {
  const springK = 180;
  const dampingD = 12;

  const ax = (state.targetX - state.x) * springK - state.velocityX * dampingD;
  const ay = (state.targetY - state.y) * springK - state.velocityY * dampingD;

  const vx = state.velocityX + ax * dt;
  const vy = state.velocityY + ay * dt;

  return {
    ...state,
    velocityX: vx,
    velocityY: vy,
    x: state.x + vx * dt,
    y: state.y + vy * dt,
  };
}

function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

export function hitTest(
  px: number,
  py: number,
  states: FragmentState[],
  data: FragmentData[]
): number | null {
  for (let i = states.length - 1; i >= 0; i--) {
    const state = states[i];
    if (state.snapped) continue;

    const frag = data.find((d) => d.id === state.id);
    if (!frag) continue;

    const offsetX = state.x - frag.center.x;
    const offsetY = state.y - frag.center.y;

    const translated = frag.vertices.map((v) => ({
      x: v.x + offsetX,
      y: v.y + offsetY,
    }));

    if (pointInPolygon(px, py, translated)) {
      return state.id;
    }
  }

  return null;
}

export function checkSnap(
  state: FragmentState,
  correctPos: { x: number; y: number },
  threshold: number
): boolean {
  const dx = state.x - correctPos.x;
  const dy = state.y - correctPos.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

export function createParticles(
  colors: string[],
  cx: number,
  cy: number,
  count: number
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    const life = 0.6 + Math.random() * 0.8;

    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = [];

  for (const p of particles) {
    const newLife = p.life - dt;
    if (newLife > 0) {
      alive.push({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        life: newLife,
      });
    }
  }

  return alive;
}
