export enum NoteType {
  High = 'high',
  Low = 'low',
  Chord = 'chord',
  Obstacle = 'obstacle',
}

export interface Note {
  id: number;
  type: NoteType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  alive: boolean;
  spawnTime: number;
  trail: { x: number; y: number; alpha: number }[];
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

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  trail: { x: number; y: number; alpha: number }[];
}

const NOTE_COLORS: Record<NoteType, { color: string; glow: string }> = {
  [NoteType.High]: { color: '#00ffd5', glow: 'rgba(0,255,213,0.6)' },
  [NoteType.Low]: { color: '#7b2ff7', glow: 'rgba(123,47,247,0.6)' },
  [NoteType.Chord]: { color: '#ff6bf5', glow: 'rgba(255,107,245,0.6)' },
  [NoteType.Obstacle]: { color: '#ff2244', glow: 'rgba(255,34,68,0.6)' },
};

let noteIdCounter = 0;

export function createNote(
  canvasW: number,
  canvasH: number,
  bpm: number,
  now: number
): Note {
  const typeRoll = Math.random();
  let type: NoteType;
  if (typeRoll < 0.35) type = NoteType.High;
  else if (typeRoll < 0.65) type = NoteType.Low;
  else if (typeRoll < 0.85) type = NoteType.Chord;
  else type = NoteType.Obstacle;

  const speed = (bpm / 120) * (1.5 + Math.random() * 1.0);
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number, vx: number, vy: number;

  const margin = 20;
  switch (edge) {
    case 0:
      x = Math.random() * canvasW;
      y = -margin;
      vx = (Math.random() - 0.5) * speed;
      vy = speed * (0.5 + Math.random() * 0.5);
      break;
    case 1:
      x = canvasW + margin;
      y = Math.random() * canvasH;
      vx = -speed * (0.5 + Math.random() * 0.5);
      vy = (Math.random() - 0.5) * speed;
      break;
    case 2:
      x = Math.random() * canvasW;
      y = canvasH + margin;
      vx = (Math.random() - 0.5) * speed;
      vy = -speed * (0.5 + Math.random() * 0.5);
      break;
    default:
      x = -margin;
      y = Math.random() * canvasH;
      vx = speed * (0.5 + Math.random() * 0.5);
      vy = (Math.random() - 0.5) * speed;
      break;
  }

  const colors = NOTE_COLORS[type];
  const radius = type === NoteType.Chord ? 14 : type === NoteType.Obstacle ? 11 : 10;

  return {
    id: ++noteIdCounter,
    type,
    x,
    y,
    vx,
    vy,
    radius,
    color: colors.color,
    glowColor: colors.glow,
    alive: true,
    spawnTime: now,
    trail: [],
  };
}

export function circleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = dx * dx + dy * dy;
  const minDist = r1 + r2;
  return dist < minDist * minDist;
}

export function spawnParticles(
  x: number,
  y: number,
  color: string,
  count: number
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    const life = 0.4 + Math.random() * 0.6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  return particles;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function getScoreForType(type: NoteType): number {
  switch (type) {
    case NoteType.High:
      return 10;
    case NoteType.Low:
      return 15;
    case NoteType.Chord:
      return 25;
    case NoteType.Obstacle:
      return 0;
  }
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
