export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInQuad = (t: number): number => {
  return t * t;
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
