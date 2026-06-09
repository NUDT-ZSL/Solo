export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothLerp(a: number, b: number, smoothing: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-smoothing * dt));
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  };
}

export function smoothLerpVec2(a: Vec2, b: Vec2, smoothing: number, dt: number): Vec2 {
  return {
    x: smoothLerp(a.x, b.x, smoothing, dt),
    y: smoothLerp(a.y, b.y, smoothing, dt)
  };
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vec2): Vec2 {
  const m = magnitude(v);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

export function sinWave(min: number, max: number, period: number, time: number, phase: number = 0): number {
  const amplitude = (max - min) / 2;
  const center = (max + min) / 2;
  return center + amplitude * Math.sin((time / period) * Math.PI * 2 + phase);
}

export interface SpeedCalculator {
  lastPos: Vec2;
  lastTime: number;
  currentSpeed: number;
}

export function createSpeedCalculator(initialPos: Vec2, initialTime: number): SpeedCalculator {
  return {
    lastPos: { ...initialPos },
    lastTime: initialTime,
    currentSpeed: 0
  };
}

export function updateSpeed(calc: SpeedCalculator, pos: Vec2, time: number): number {
  const dt = Math.max(0.0001, (time - calc.lastTime) / 1000);
  const dist = distance(calc.lastPos, pos);
  calc.currentSpeed = dist / dt;
  calc.lastPos = { ...pos };
  calc.lastTime = time;
  return calc.currentSpeed;
}

export function rgbToCss(rgb: RGB, alpha: number = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t))
  };
}
