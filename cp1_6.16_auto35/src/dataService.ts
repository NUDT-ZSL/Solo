import type { DensityParams, NebulaType } from './particleEngine';

export interface NebulaTemplate {
  id: string;
  name: string;
  type: NebulaType;
  particleCount: number;
  colorPreset: DensityParams['colorPreset'];
  rotationSpeed: number;
  radius: number;
  [key: string]: any;
}

const API_BASE = 'http://localhost:3001';

const FALLBACK_TEMPLATES: NebulaTemplate[] = [
  {
    id: 'spiral',
    name: '螺旋星云',
    type: 'spiral',
    particleCount: 5000,
    colorPreset: 'bluePurple',
    rotationSpeed: 0.8,
    radius: 50,
    spiralArms: 3,
    armWidth: 0.4,
    concentration: 0.6,
  },
  {
    id: 'elliptical',
    name: '椭圆星云',
    type: 'elliptical',
    particleCount: 5000,
    colorPreset: 'redOrange',
    rotationSpeed: 0.3,
    radius: 50,
    eccentricity: 0.6,
    flatness: 0.3,
    concentration: 0.8,
  },
  {
    id: 'irregular',
    name: '不规则星云',
    type: 'irregular',
    particleCount: 5000,
    colorPreset: 'warm',
    rotationSpeed: 0.1,
    radius: 50,
    clusterCount: 5,
    clusterSpread: 15,
    concentration: 0.4,
  },
];

export async function fetchTemplates(): Promise<NebulaTemplate[]> {
  try {
    const res = await fetch(`${API_BASE}/api/templates`);
    if (!res.ok) throw new Error('Server error');
    return await res.json();
  } catch {
    return FALLBACK_TEMPLATES;
  }
}

export async function saveNebula(config: DensityParams): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/nebula`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Server error');
    return await res.json();
  } catch {
    return null;
  }
}

export function saveToLocalStorage(config: DensityParams): void {
  try {
    localStorage.setItem('nebula_config', JSON.stringify(config));
  } catch {}
}

export function loadFromLocalStorage(): DensityParams | null {
  try {
    const raw = localStorage.getItem('nebula_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
