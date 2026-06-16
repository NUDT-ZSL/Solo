export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(v)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  return rgbToHex(
    lerp(a.r, b.r, clamped),
    lerp(a.g, b.g, clamped),
    lerp(a.b, b.b, clamped)
  );
}

export function interpolateRouteColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    return lerpColor('#00cc66', '#ffcc00', clamped * 2);
  }
  return lerpColor('#ffcc00', '#ff3300', (clamped - 0.5) * 2);
}

export function interpolateHeatColor(t: number): string {
  if (t < 0.5) {
    return lerpColor('#00ff88', '#ffcc00', t * 2);
  }
  return lerpColor('#ffcc00', '#ff3300', (t - 0.5) * 2);
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
