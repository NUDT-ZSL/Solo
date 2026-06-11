export interface StarData {
  ra: number;
  dec: number;
  magnitude: number;
  spectralType: string;
  name: string;
  distance: number;
  absoluteMagnitude: number;
}

const ORION_NEBULA: StarData[] = [
  { ra: 88.75, dec: 7.40, magnitude: 0.42, spectralType: 'M2', name: 'Betelgeuse', distance: 700, absoluteMagnitude: -5.85 },
  { ra: 78.50, dec: -8.20, magnitude: 0.13, spectralType: 'B8', name: 'Rigel', distance: 860, absoluteMagnitude: -7.84 },
  { ra: 81.25, dec: 6.35, magnitude: 1.64, spectralType: 'B2', name: 'Bellatrix', distance: 250, absoluteMagnitude: -2.78 },
  { ra: 83.00, dec: -0.30, magnitude: 2.23, spectralType: 'O9', name: 'Mintaka', distance: 1200, absoluteMagnitude: -5.11 },
  { ra: 84.00, dec: -1.20, magnitude: 1.69, spectralType: 'B0', name: 'Alnilam', distance: 2000, absoluteMagnitude: -6.38 },
  { ra: 85.25, dec: -1.95, magnitude: 1.77, spectralType: 'O9', name: 'Alnitak', distance: 1260, absoluteMagnitude: -5.26 },
  { ra: 87.00, dec: -9.67, magnitude: 2.09, spectralType: 'B0', name: 'Saiph', distance: 650, absoluteMagnitude: -4.65 },
  { ra: 83.75, dec: -5.38, magnitude: 5.13, spectralType: 'O6', name: 'θ¹ Ori C', distance: 1344, absoluteMagnitude: -4.19 },
  { ra: 83.80, dec: -5.27, magnitude: 6.35, spectralType: 'O9', name: 'θ² Ori A', distance: 1976, absoluteMagnitude: -4.34 },
  { ra: 83.75, dec: 9.93, magnitude: 3.54, spectralType: 'O8', name: 'Meissa', distance: 1100, absoluteMagnitude: -4.35 },
];

const ANDROMEDA_GALAXY: StarData[] = [
  { ra: 2.00, dec: 29.08, magnitude: 2.06, spectralType: 'B8', name: 'Alpheratz', distance: 97, absoluteMagnitude: -0.30 },
  { ra: 17.50, dec: 35.62, magnitude: 2.05, spectralType: 'M0', name: 'Mirach', distance: 200, absoluteMagnitude: -1.15 },
  { ra: 31.00, dec: 42.33, magnitude: 2.17, spectralType: 'K3', name: 'Almach', distance: 350, absoluteMagnitude: -2.10 },
  { ra: 9.75, dec: 30.87, magnitude: 3.27, spectralType: 'K3', name: 'δ And', distance: 101, absoluteMagnitude: 1.30 },
  { ra: 9.00, dec: 33.72, magnitude: 4.36, spectralType: 'B5', name: 'π And', distance: 598, absoluteMagnitude: -2.31 },
  { ra: 14.25, dec: 38.58, magnitude: 3.86, spectralType: 'A2', name: 'μ And', distance: 136, absoluteMagnitude: 0.45 },
  { ra: 24.50, dec: 48.37, magnitude: 3.59, spectralType: 'K3', name: '51 And', distance: 177, absoluteMagnitude: 0.45 },
  { ra: 13.00, dec: 47.20, magnitude: 4.25, spectralType: 'B7', name: 'φ And', distance: 394, absoluteMagnitude: -1.48 },
  { ra: 22.75, dec: 44.45, magnitude: 4.98, spectralType: 'G8', name: 'χ And', distance: 299, absoluteMagnitude: -0.28 },
  { ra: 28.50, dec: 37.25, magnitude: 5.00, spectralType: 'K0', name: '56 And', distance: 315, absoluteMagnitude: -0.10 },
  { ra: 13.25, dec: 43.95, magnitude: 4.53, spectralType: 'B8', name: 'ν And', distance: 712, absoluteMagnitude: -2.68 },
  { ra: 21.50, dec: 42.72, magnitude: 3.62, spectralType: 'B6', name: 'ο And', distance: 515, absoluteMagnitude: -2.05 },
];

const ROSETTE_NEBULA: StarData[] = [
  { ra: 97.00, dec: 4.90, magnitude: 5.49, spectralType: 'O4', name: 'HD 46223', distance: 5500, absoluteMagnitude: -6.03 },
  { ra: 97.10, dec: 5.10, magnitude: 5.94, spectralType: 'O5', name: 'HD 46150', distance: 5200, absoluteMagnitude: -5.52 },
  { ra: 96.80, dec: 4.70, magnitude: 6.03, spectralType: 'B0', name: 'HD 46573', distance: 4100, absoluteMagnitude: -4.72 },
  { ra: 97.20, dec: 5.30, magnitude: 6.18, spectralType: 'O8', name: 'HD 46485', distance: 5800, absoluteMagnitude: -5.26 },
  { ra: 96.60, dec: 4.50, magnitude: 7.20, spectralType: 'B1', name: 'HD 46106', distance: 3200, absoluteMagnitude: -3.82 },
  { ra: 97.30, dec: 5.50, magnitude: 7.55, spectralType: 'B2', name: 'HD 47055', distance: 3600, absoluteMagnitude: -3.48 },
  { ra: 96.90, dec: 5.20, magnitude: 8.10, spectralType: 'B3', name: 'V637 Mon', distance: 2800, absoluteMagnitude: -2.50 },
  { ra: 97.05, dec: 4.80, magnitude: 8.50, spectralType: 'O7', name: 'HD 46150B', distance: 5400, absoluteMagnitude: -4.87 },
];

export const PRESETS: Record<string, { label: string; stars: StarData[] }> = {
  orion: { label: '猎户座大星云', stars: ORION_NEBULA },
  andromeda: { label: '仙女座星系', stars: ANDROMEDA_GALAXY },
  rosette: { label: '玫瑰星云', stars: ROSETTE_NEBULA },
};

export function loadPreset(presetName: string): StarData[] {
  const preset = PRESETS[presetName];
  if (!preset) return ORION_NEBULA;
  return preset.stars.map(s => ({ ...s }));
}

export function parseUploadedJSON(raw: unknown): StarData[] {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON data');
  const arr = Array.isArray(raw) ? raw : (raw as any).stars;
  if (!Array.isArray(arr)) throw new Error('Expected array of stars or { stars: [...] }');
  return arr.map((s: any, i: number) => ({
    ra: Number(s.ra) || 0,
    dec: Number(s.dec) || 0,
    magnitude: Number(s.magnitude) || 5,
    spectralType: String(s.spectralType || 'G2'),
    name: String(s.name || `Star-${i + 1}`),
    distance: Number(s.distance) || 100,
    absoluteMagnitude: Number(s.absoluteMagnitude) ?? Number(s.magnitude),
  }));
}

export function spectralTypeToColor(spectralType: string, tempShift: number = 0): { r: number; g: number; b: number } {
  const base = spectralType.charAt(0).toUpperCase();
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    O: { r: 0.608, g: 0.690, b: 1.0 },
    B: { r: 0.667, g: 0.749, b: 1.0 },
    A: { r: 0.792, g: 0.843, b: 1.0 },
    F: { r: 0.973, g: 0.969, b: 1.0 },
    G: { r: 1.0, g: 0.957, b: 0.918 },
    K: { r: 1.0, g: 0.824, b: 0.631 },
    M: { r: 1.0, g: 0.800, b: 0.435 },
  };
  const c = colorMap[base] || colorMap.G;
  return {
    r: Math.max(0, Math.min(1, c.r + tempShift)),
    g: Math.max(0, Math.min(1, c.g + tempShift * 0.5)),
    b: Math.max(0, Math.min(1, c.b - tempShift * 0.3)),
  };
}
