import * as THREE from 'three';

export interface GalaxyParams {
  starCount: number;
  orbitMin: number;
  orbitMax: number;
  colorTheme: string;
}

export interface PlanetData {
  position: THREE.Vector3;
  size: number;
  color: THREE.Color;
  orbitRadius: number;
  orbitSpeed: number;
  orbitInclination: number;
  orbitPhase: number;
}

export interface StarData {
  position: THREE.Vector3;
  size: number;
  color: THREE.Color;
  planets: PlanetData[];
  rotationSpeed: number;
}

export interface GalaxyData {
  stars: StarData[];
}

const COLOR_THEMES: Record<string, { primary: string; secondary: string }> = {
  'galaxy-purple': { primary: '#8B5CF6', secondary: '#3B82F6' },
  'sunset-orange': { primary: '#F97316', secondary: '#EAB308' },
  'aurora-green': { primary: '#10B981', secondary: '#06B6D4' },
};

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const color = new THREE.Color(hex);
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateStarColor(theme: string): THREE.Color {
  const themeColors = COLOR_THEMES[theme] || COLOR_THEMES['galaxy-purple'];
  const usePrimary = Math.random() > 0.5;
  const baseHex = usePrimary ? themeColors.primary : themeColors.secondary;
  const hsl = hexToHSL(baseHex);

  const hueOffset = randomInRange(-15, 15);
  const newHue = ((hsl.h + hueOffset) % 360 + 360) % 360;

  const satOffset = randomInRange(-10, 10);
  const lightOffset = randomInRange(-10, 10);

  const newSat = Math.max(20, Math.min(100, hsl.s + satOffset));
  const newLight = Math.max(30, Math.min(80, hsl.l + lightOffset));

  const color = new THREE.Color();
  color.setHSL(newHue / 360, newSat / 100, newLight / 100);
  return color;
}

function generatePlanetColor(starColor: THREE.Color): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  starColor.getHSL(hsl);

  const complementaryHue = ((hsl.h * 360 + 180 + randomInRange(-20, 20)) % 360 + 360) % 360;
  const newSat = Math.max(20, Math.min(100, (hsl.s * 100) + randomInRange(-10, 10)));
  const newLight = Math.max(30, Math.min(80, (hsl.l * 100) + randomInRange(-10, 10)));

  const color = new THREE.Color();
  color.setHSL(complementaryHue / 360, newSat / 100, newLight / 100);
  return color;
}

export function generateGalaxy(params: GalaxyParams): GalaxyData {
  const stars: StarData[] = [];

  for (let i = 0; i < params.starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * 30;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const starColor = generateStarColor(params.colorTheme);
    const starSize = randomInRange(0.3, 0.8);

    const planetCount = Math.floor(Math.random() * 4);
    const planets: PlanetData[] = [];

    for (let j = 0; j < planetCount; j++) {
      const orbitRadius = randomInRange(params.orbitMin, params.orbitMax);
      const orbitSpeed = randomInRange(0.5, 1.5);
      const orbitInclination = randomInRange(-30, 30) * (Math.PI / 180);
      const orbitPhase = Math.random() * Math.PI * 2;
      const planetSize = randomInRange(0.1, 0.3);
      const planetColor = generatePlanetColor(starColor);

      const px = x + orbitRadius * Math.cos(orbitPhase);
      const py = y + orbitRadius * Math.sin(orbitPhase) * Math.sin(orbitInclination);
      const pz = z + orbitRadius * Math.sin(orbitPhase) * Math.cos(orbitInclination);

      planets.push({
        position: new THREE.Vector3(px, py, pz),
        size: planetSize,
        color: planetColor,
        orbitRadius,
        orbitSpeed,
        orbitInclination,
        orbitPhase,
      });
    }

    stars.push({
      position: new THREE.Vector3(x, y, z),
      size: starSize,
      color: starColor,
      planets,
      rotationSpeed: 0.2,
    });
  }

  return { stars };
}

export function getThemeColors(theme: string): { primary: string; secondary: string } {
  return COLOR_THEMES[theme] || COLOR_THEMES['galaxy-purple'];
}

export function getThemeGradientCSS(theme: string): string {
  const colors = getThemeColors(theme);
  return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
}
