import * as THREE from 'three';

export interface MaterialPreset {
  name: string;
  type: 'wall' | 'roof' | 'window';
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
}

export interface MaterialSelection {
  wall: MaterialPreset;
  roof: MaterialPreset;
  window: MaterialPreset;
}

export const WALL_MATERIALS: MaterialPreset[] = [
  { name: '玻璃幕墙', type: 'wall', color: '#87CEEB', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.6 },
  { name: '浅色石材', type: 'wall', color: '#E8E4D9', roughness: 0.85, metalness: 0.0 },
  { name: '深色金属面板', type: 'wall', color: '#3D3D3D', roughness: 0.25, metalness: 0.85 },
  { name: '红砖', type: 'wall', color: '#A0522D', roughness: 0.9, metalness: 0.0 },
];

export const ROOF_MATERIALS: MaterialPreset[] = [
  { name: '暗色瓦片', type: 'roof', color: '#4A4A4A', roughness: 0.8, metalness: 0.1 },
  { name: '铜绿金属', type: 'roof', color: '#5F8A7F', roughness: 0.35, metalness: 0.75 },
  { name: '白色膜结构', type: 'roof', color: '#F8F8F8', roughness: 0.5, metalness: 0.0 },
  { name: '沥青瓦', type: 'roof', color: '#5D4037', roughness: 0.92, metalness: 0.0 },
];

export const WINDOW_MATERIALS: MaterialPreset[] = [
  { name: '深灰铝合金', type: 'window', color: '#5A5A5A', roughness: 0.3, metalness: 0.9 },
  { name: '深棕木纹', type: 'window', color: '#5D4037', roughness: 0.75, metalness: 0.0 },
  { name: '白色塑钢', type: 'window', color: '#F5F5F5', roughness: 0.6, metalness: 0.0 },
  { name: '不锈钢', type: 'window', color: '#C0C0C0', roughness: 0.15, metalness: 0.95 },
];

export const DEFAULT_WALL = WALL_MATERIALS[1];
export const DEFAULT_ROOF = ROOF_MATERIALS[0];
export const DEFAULT_WINDOW = WINDOW_MATERIALS[0];

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function createMaterial(preset: MaterialPreset): THREE.MeshStandardMaterial {
  const key = `${preset.name}_${preset.color}_${preset.roughness}_${preset.metalness}_${preset.opacity ?? 1}`;
  
  if (materialCache.has(key)) {
    return materialCache.get(key)!;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(preset.color),
    roughness: preset.roughness,
    metalness: preset.metalness,
    transparent: preset.transparent ?? false,
    opacity: preset.opacity ?? 1,
  });

  materialCache.set(key, mat);
  return mat;
}

export function clearMaterialCache(): void {
  materialCache.forEach((mat) => mat.dispose());
  materialCache.clear();
}
