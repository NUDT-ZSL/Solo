export interface Vec2 {
  x: number;
  y: number;
}

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomHSL = (
  hMin: number,
  hMax: number,
  s: number = 80,
  l: number = 60
): string => {
  const h = randomRange(hMin, hMax);
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const hslComponents = (hsl: string): { h: number; s: number; l: number } => {
  const match = hsl.match(/hsl\((\d+\.?\d*),\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)%\)/);
  if (match) {
    return {
      h: parseFloat(match[1]),
      s: parseFloat(match[2]),
      l: parseFloat(match[3]),
    };
  }
  return { h: 0, s: 0, l: 0 };
};

export const componentsToHSL = (h: number, s: number, l: number): string => {
  return `hsl(${h}, ${s}%, ${l}%)`;
};

export const vecAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const vecSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const vecScale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });

export const vecLength = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);

export const vecNormalize = (v: Vec2): Vec2 => {
  const len = vecLength(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const vecDistance = (a: Vec2, b: Vec2): number => vecLength(vecSub(a, b));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const bezierCurve = (p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const p = { x: 0, y: 0 };
  p.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  p.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
  return p;
};

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

const hash = (x: number, y: number): number => {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
};

export const noise2D = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = fade(xf);
  const v = fade(yf);

  const aa = hash(xi, yi);
  const ab = hash(xi, yi + 1);
  const ba = hash(xi + 1, yi);
  const bb = hash(xi + 1, yi + 1);

  const x1 = lerp(aa, ba, u);
  const x2 = lerp(ab, bb, u);

  return lerp(x1, x2, v) * 2 - 1;
};

export const fbmNoise = (x: number, y: number, octaves: number = 3): number => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
};

export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
