import { v4 as uuidv4 } from 'uuid';

export type BuildingStyle = 'modern' | 'classical';
export type ZoneType = 'center' | 'axis' | 'suburb' | 'none';

export interface Building {
  id: string;
  x: number;
  z: number;
  height: number;
  baseWidth: number;
  baseDepth: number;
  style: BuildingStyle;
  color: string;
  zone: ZoneType;
  templateId: string;
  decorationType: 'dome' | 'spire' | 'flat' | 'slope';
  decorationHeight: number;
}

export interface LSystemRule {
  symbol: string;
  replacement: string;
}

export interface BuildingTemplate {
  id: string;
  style: BuildingStyle;
  zone: ZoneType;
  heightRange: [number, number];
  baseSizeRange: [number, number];
  decorationTypes: Array<'dome' | 'spire' | 'flat' | 'slope'>;
  colorPalette: string[];
}

export const ZONE_HEIGHT_RANGES: Record<ZoneType, [number, number]> = {
  center: [80, 150],
  axis: [150, 250],
  suburb: [20, 60],
  none: [20, 250],
};

export const ZONE_BASE_SIZE_RANGES: Record<ZoneType, [number, number]> = {
  center: [3, 6],
  axis: [4, 7],
  suburb: [2, 4],
  none: [2, 7],
};

export const ZONE_SPAWN_PROBABILITIES: Record<ZoneType, number> = {
  center: 0.95,
  axis: 0.85,
  suburb: 0.5,
  none: 0.7,
};

export const DEFAULT_CITY_WIDTH = 160;

const lSystemRules: LSystemRule[] = [
  { symbol: 'S', replacement: '[FB][FB][FB]' },
  { symbol: 'B', replacement: 'B+S' },
  { symbol: 'F', replacement: 'F[FB]F' },
];

const MODERN_COLOR_PALETTES: Record<ZoneType, string[]> = {
  center: ['#607D8B', '#78909C', '#546E7A', '#455A64', '#37474F'],
  axis: ['#1E88E5', '#1976D2', '#1565C0', '#0D47A1', '#42A5F5'],
  suburb: ['#90A4AE', '#B0BEC5', '#CFD8DC', '#78909C', '#607D8B'],
  none: ['#607D8B', '#1E88E5', '#455A64', '#1976D2', '#78909C', '#90A4AE', '#B0BEC5', '#FFD54F'],
};

const CLASSICAL_COLOR_PALETTES: Record<ZoneType, string[]> = {
  center: ['#F5DEB3', '#DEB887', '#D2B48C', '#C4A77D', '#BC8F8F'],
  axis: ['#BC8F8F', '#CD853F', '#D2691E', '#A0522D', '#8B4513'],
  suburb: ['#F5DEB3', '#FFEFD5', '#FFE4B5', '#FFE4C4', '#FFDAB9'],
  none: ['#F5DEB3', '#BC8F8F', '#DEB887', '#CD853F', '#D2B48C', '#8B4513', '#FFDAB9', '#A0522D'],
};

function buildTemplates(): BuildingTemplate[] {
  const templates: BuildingTemplate[] = [];
  const zones: ZoneType[] = ['center', 'axis', 'suburb', 'none'];
  const styles: BuildingStyle[] = ['modern', 'classical'];

  for (const style of styles) {
    for (const zone of zones) {
      const heightRange = style === 'classical'
        ? [ZONE_HEIGHT_RANGES[zone][0] * 1.1, ZONE_HEIGHT_RANGES[zone][1] * 1.1] as [number, number]
        : ZONE_HEIGHT_RANGES[zone];

      const baseSizeRange = ZONE_BASE_SIZE_RANGES[zone];
      const colorPalette = style === 'modern'
        ? MODERN_COLOR_PALETTES[zone]
        : CLASSICAL_COLOR_PALETTES[zone];

      const decorationTypes: Array<'dome' | 'spire' | 'flat' | 'slope'> = style === 'modern'
        ? (zone === 'suburb' ? ['flat'] : ['flat', 'slope'])
        : ['dome', 'spire'];

      templates.push({
        id: `${style}-${zone}`,
        style,
        zone,
        heightRange,
        baseSizeRange,
        decorationTypes,
        colorPalette,
      });
    }
  }

  return templates;
}

const buildingTemplates: BuildingTemplate[] = buildTemplates();

function parseLSystem(axiom: string, iterations: number): string {
  let result = axiom;
  for (let i = 0; i < iterations; i++) {
    let newResult = '';
    for (const char of result) {
      const rule = lSystemRules.find((r) => r.symbol === char);
      newResult += rule ? rule.replacement : char;
    }
    result = newResult;
  }
  return result;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getZoneForPosition(
  gridX: number,
  gridZ: number,
  gridSize: number
): ZoneType {
  const center = gridSize / 2;
  const distX = Math.abs(gridX - center);
  const distZ = Math.abs(gridZ - center);
  const distFromCenter = Math.sqrt(distX * distX + distZ * distZ);

  const onAxis = Math.abs(gridX - center) < 1.5 || Math.abs(gridZ - center) < 1.5;
  const inCenter = distFromCenter < gridSize * 0.2;

  if (onAxis && distFromCenter > gridSize * 0.15) {
    return 'axis';
  } else if (inCenter) {
    return 'center';
  } else {
    return 'suburb';
  }
}

function getBuildingTemplate(
  style: BuildingStyle,
  zone: ZoneType
): BuildingTemplate {
  const template = buildingTemplates.find(
    (t) => t.style === style && t.zone === zone
  );
  return (
    template ||
    buildingTemplates.find((t) => t.style === style && t.zone === 'none')!
  );
}

function generateBuildingFromTemplate(
  template: BuildingTemplate,
  x: number,
  z: number,
  style: BuildingStyle,
  zone: ZoneType
): Building {
  const height = randomRange(template.heightRange[0], template.heightRange[1]);
  const baseWidth = randomRange(template.baseSizeRange[0], template.baseSizeRange[1]);
  const baseDepth = randomRange(template.baseSizeRange[0], template.baseSizeRange[1]);
  const decorationType = pickRandom(template.decorationTypes);
  const decorationHeight = decorationType === 'flat' ? 0 : randomRange(3, 8);
  const color = pickRandom(template.colorPalette);

  return {
    id: uuidv4(),
    x,
    z,
    height,
    baseWidth,
    baseDepth,
    style,
    color,
    zone,
    templateId: template.id,
    decorationType,
    decorationHeight,
  };
}

function applyZoneColorAdjustment(
  baseColor: string,
  zone: ZoneType,
  buildingHeight: number,
  heightRange: [number, number]
): string {
  const heightRatio = (buildingHeight - heightRange[0]) / (heightRange[1] - heightRange[0] || 1);

  if (zone === 'center') {
    const blueShift = Math.floor(20 * heightRatio);
    const darken = Math.floor(15 * heightRatio);
    return shiftColor(baseColor, -darken, -darken, blueShift);
  } else if (zone === 'axis') {
    const darken = Math.floor(25 * heightRatio);
    const blueBoost = Math.floor(10 * heightRatio);
    return shiftColor(baseColor, -darken, -darken, blueBoost);
  } else if (zone === 'suburb') {
    const yellowBoost = Math.floor(15 * heightRatio);
    const redBoost = Math.floor(8 * heightRatio);
    return shiftColor(baseColor, redBoost, yellowBoost, -5);
  }
  return baseColor;
}

function shiftColor(color: string, rShift: number, gShift: number, bShift: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(0, 2), 16) + rShift));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(2, 4), 16) + gShift));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(4, 6), 16) + bShift));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateRandomBuildings(
  gridSize: number,
  cellSize: number,
  offset: number,
  density: number,
  style: BuildingStyle,
  patternSymbols: string[]
): Building[] {
  const buildings: Building[] = [];
  let symbolIndex = 0;
  const template = getBuildingTemplate(style, 'none');

  for (let gridX = 0; gridX < gridSize; gridX++) {
    for (let gridZ = 0; gridZ < gridSize; gridZ++) {
      const symbol = patternSymbols[symbolIndex % patternSymbols.length];
      symbolIndex++;

      let spawnProbability = ZONE_SPAWN_PROBABILITIES.none;
      if (symbol === 'F' || symbol === 'B') {
        spawnProbability *= 1.2;
      }

      if (Math.random() > Math.min(spawnProbability, density / 30)) {
        continue;
      }

      const worldX = gridX * cellSize - offset + randomRange(-cellSize * 0.2, cellSize * 0.2);
      const worldZ = gridZ * cellSize - offset + randomRange(-cellSize * 0.2, cellSize * 0.2);

      const building = generateBuildingFromTemplate(
        template,
        worldX,
        worldZ,
        style,
        'none'
      );

      buildings.push(building);
    }
  }

  return buildings;
}

function generateZonedBuildings(
  gridSize: number,
  cellSize: number,
  offset: number,
  density: number,
  style: BuildingStyle,
  patternSymbols: string[]
): Building[] {
  const buildings: Building[] = [];
  let symbolIndex = 0;

  for (let gridX = 0; gridX < gridSize; gridX++) {
    for (let gridZ = 0; gridZ < gridSize; gridZ++) {
      const zone = getZoneForPosition(gridX, gridZ, gridSize);
      const template = getBuildingTemplate(style, zone);

      let spawnProbability = ZONE_SPAWN_PROBABILITIES[zone];

      const symbol = patternSymbols[symbolIndex % patternSymbols.length];
      symbolIndex++;

      if (symbol === 'F' || symbol === 'B') {
        spawnProbability *= 1.2;
      }

      if (Math.random() > Math.min(spawnProbability, density / 30)) {
        continue;
      }

      const worldX = gridX * cellSize - offset + randomRange(-cellSize * 0.15, cellSize * 0.15);
      const worldZ = gridZ * cellSize - offset + randomRange(-cellSize * 0.15, cellSize * 0.15);

      let building = generateBuildingFromTemplate(
        template,
        worldX,
        worldZ,
        style,
        zone
      );

      building.color = applyZoneColorAdjustment(
        building.color,
        zone,
        building.height,
        ZONE_HEIGHT_RANGES[zone]
      );

      buildings.push(building);
    }
  }

  return buildings;
}

export interface GenerateBuildingsOptions {
  gridSize: number;
  density: number;
  style: BuildingStyle;
  zoningEnabled: boolean;
  cityWidth?: number;
}

export function generateBuildings(
  options: GenerateBuildingsOptions
): Building[] {
  const { gridSize, density, style, zoningEnabled, cityWidth = DEFAULT_CITY_WIDTH } = options;

  const cellSize = cityWidth / gridSize;
  const offset = cityWidth / 2;

  const lSystemPattern = parseLSystem('S', 3);
  const patternSymbols = lSystemPattern.replace(/[\[\]+\-]/g, '').split('');

  if (zoningEnabled) {
    return generateZonedBuildings(gridSize, cellSize, offset, density, style, patternSymbols);
  } else {
    return generateRandomBuildings(gridSize, cellSize, offset, density, style, patternSymbols);
  }
}

export function getSkylineProfile(
  buildings: Building[],
  resolution: number = 300
): number[] {
  const profile: number[] = new Array(resolution).fill(0);
  if (buildings.length === 0) return profile;

  const allX = buildings.map((b) => b.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const rangeX = maxX - minX || 1;

  for (const building of buildings) {
    const normalizedX = ((building.x - minX) / rangeX) * (resolution - 1);
    const index = Math.round(normalizedX);
    const totalHeight = building.height + building.decorationHeight;
    if (index >= 0 && index < resolution && totalHeight > profile[index]) {
      profile[index] = totalHeight;
    }
  }

  for (let i = 1; i < resolution - 1; i++) {
    if (profile[i] === 0) {
      profile[i] = (profile[i - 1] + profile[i + 1]) / 2;
    }
  }

  return profile;
}

export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.slice(0, 2), 16);
  const g1 = parseInt(hex1.slice(2, 4), 16);
  const b1 = parseInt(hex1.slice(4, 6), 16);

  const r2 = parseInt(hex2.slice(0, 2), 16);
  const g2 = parseInt(hex2.slice(2, 4), 16);
  const b2 = parseInt(hex2.slice(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
