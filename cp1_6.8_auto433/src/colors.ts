import * as THREE from 'three';

export interface ColorTheme {
  name: string;
  center: THREE.Color;
  edge: THREE.Color;
  glow: THREE.Color;
  line: THREE.Color;
  background: [number, number, number];
  debris: THREE.Color;
}

export const themes: Record<string, ColorTheme> = {
  lava: {
    name: '熔岩',
    center: new THREE.Color(1.0, 0.45, 0.05),
    edge: new THREE.Color(0.15, 0.35, 0.85),
    glow: new THREE.Color(1.0, 0.25, 0.05),
    line: new THREE.Color(0.9, 0.4, 0.1),
    background: [0.04, 0.024, 0.016],
    debris: new THREE.Color(1.0, 0.6, 0.15),
  },
  crystal: {
    name: '水晶',
    center: new THREE.Color(0.7, 0.85, 1.0),
    edge: new THREE.Color(0.2, 0.15, 0.6),
    glow: new THREE.Color(0.5, 0.7, 1.0),
    line: new THREE.Color(0.5, 0.65, 0.95),
    background: [0.02, 0.02, 0.05],
    debris: new THREE.Color(0.8, 0.9, 1.0),
  },
  emerald: {
    name: '翡翠',
    center: new THREE.Color(0.15, 1.0, 0.45),
    edge: new THREE.Color(0.05, 0.2, 0.5),
    glow: new THREE.Color(0.1, 0.9, 0.3),
    line: new THREE.Color(0.2, 0.75, 0.4),
    background: [0.016, 0.035, 0.024],
    debris: new THREE.Color(0.4, 1.0, 0.6),
  },
  amber: {
    name: '琥珀',
    center: new THREE.Color(1.0, 0.78, 0.2),
    edge: new THREE.Color(0.45, 0.15, 0.05),
    glow: new THREE.Color(1.0, 0.65, 0.1),
    line: new THREE.Color(0.85, 0.6, 0.15),
    background: [0.04, 0.025, 0.01],
    debris: new THREE.Color(1.0, 0.85, 0.35),
  },
};

export function lerpThemeColor(
  theme: ColorTheme,
  t: number,
  target: THREE.Color = new THREE.Color()
): THREE.Color {
  return target.copy(theme.center).lerp(theme.edge, t);
}

export function applyBackground(scene: THREE.Scene, theme: ColorTheme): void {
  const [r, g, b] = theme.background;
  scene.background = new THREE.Color(r, g, b);
}
