export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(randomRange(min, max + 1));
};

export const vectorAdd = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y
});

export const vectorSub = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x - b.x,
  y: a.y - b.y
});

export const vectorScale = (v: Vector2, s: number): Vector2 => ({
  x: v.x * s,
  y: v.y * s
});

export const vectorMagnitude = (v: Vector2): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

export const vectorNormalize = (v: Vector2): Vector2 => {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};

export const vectorDistance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const vectorDot = (a: Vector2, b: Vector2): number => {
  return a.x * b.x + a.y * b.y;
};

export const easeOut = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeIn = (t: number): number => {
  return t * t * t;
};

export const easeInOut = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const colorLerp = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const rgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

let particleIdCounter = 0;

export const createExplosionParticles = (
  x: number,
  y: number,
  count: number = 6,
  colors: string[] = ['#FF8800', '#FFAA00', '#FFD700', '#FF3333']
): Particle[] => {
  const particles: Particle[] = [];
  const baseSpeed = 150;
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed + randomRange(-50, 100);
    
    particles.push({
      id: ++particleIdCounter,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[randomInt(0, colors.length - 1)],
      size: randomRange(4, 8),
      life: 0.3,
      maxLife: 0.3
    });
  }
  
  return particles;
};

export const updateParticles = (particles: Particle[], deltaTime: number): Particle[] => {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * deltaTime,
      y: p.y + p.vy * deltaTime,
      vx: p.vx * (1 - deltaTime * 2),
      vy: p.vy * (1 - deltaTime * 2),
      life: p.life - deltaTime
    }))
    .filter(p => p.life > 0);
};

export const circleCollision = (
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
};

export const rectCollision = (
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean => {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

export const randomChoice = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const degToRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

export const radToDeg = (rad: number): number => {
  return (rad * 180) / Math.PI;
};
