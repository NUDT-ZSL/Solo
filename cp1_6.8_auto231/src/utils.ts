import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

export function getGradientColor(t: number): THREE.Color {
  const tClamped = clamp(t, 0, 1);
  const colorStops = [
    new THREE.Color(0x4466ff),
    new THREE.Color(0x8844cc),
    new THREE.Color(0xcc4488),
    new THREE.Color(0xff8844),
    new THREE.Color(0xffcc22),
  ];
  const segment = tClamped * (colorStops.length - 1);
  const index = Math.floor(segment);
  const frac = segment - index;
  if (index >= colorStops.length - 1) return colorStops[colorStops.length - 1].clone();
  const c = new THREE.Color();
  c.lerpColors(colorStops[index], colorStops[index + 1], frac);
  return c;
}

export function getGradientColorHex(t: number): number {
  const c = getGradientColor(t);
  return c.getHex();
}
