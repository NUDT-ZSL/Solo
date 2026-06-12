import type { StreetData, StreetDiff, StreetListItem, UpdateParams } from './types';

const API_BASE = '/api';

export async function fetchStreetList(): Promise<StreetListItem[]> {
  try {
    const response = await fetch(`${API_BASE}/streets`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch street list:', error);
    return [];
  }
}

export async function fetchStreetDetail(id: string): Promise<StreetData | null> {
  try {
    const response = await fetch(`${API_BASE}/streets/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch street detail for ${id}:`, error);
    return null;
  }
}

export async function fetchStreetDiff(id: string): Promise<StreetDiff | null> {
  try {
    const response = await fetch(`${API_BASE}/streets/${id}/diff`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch street diff for ${id}:`, error);
    return null;
  }
}

export async function updateStreetParams(
  id: string,
  params: UpdateParams
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/streets/${id}/params`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to update street params for ${id}:`, error);
    return { success: false };
  }
}

export function computeInterpolatedBuilding(
  original: StreetData,
  diff: StreetDiff,
  progress: number
): StreetData {
  const t = easeInOutCubic(Math.max(0, Math.min(1, progress / 100)));

  const diffMap = new Map(diff.buildings.map(b => [b.id, b]));
  const removedSet = new Set(diff.removedBuildingIds);

  const interpolatedBuildings = original.buildings
    .filter(b => !removedSet.has(b.id))
    .map(b => {
      const d = diffMap.get(b.id);
      if (!d) return b;
      return {
        ...b,
        position: interpolateTuple(b.position, d.position ?? b.position, t),
        width: interpolateNumber(b.width, d.width ?? b.width, t),
        depth: interpolateNumber(b.depth, d.depth ?? b.depth, t),
        height: interpolateNumber(b.height, d.height ?? b.height, t),
        color: interpolateColor(b.color, d.color ?? b.color, t),
        roofType: d.roofType ?? b.roofType,
      };
    });

  const addedBuildings = diff.addedBuildings.map(b => ({
    ...b,
    height: b.height * t,
    position: [b.position[0], (b.position[1] * t), b.position[2]] as [number, number, number],
  }));

  const allBuildings = [...interpolatedBuildings, ...addedBuildings];

  const originalTreeIds = new Set(original.trees.map(t => t.id));
  const removedTreeSet = new Set(diff.removedTreeIds);
  const keptTrees = original.trees.filter(tree => !removedTreeSet.has(tree.id));
  const addedTrees = diff.addedTrees.filter((_, i) => i < Math.floor(diff.addedTrees.length * t));
  const allTrees = [...keptTrees, ...addedTrees];

  const removedLightSet = new Set(diff.removedStreetLightIds);
  const keptLights = original.streetLights.filter(l => !removedLightSet.has(l.id));
  const addedLights = diff.addedStreetLights.filter((_, i) => i < Math.floor(diff.addedStreetLights.length * t));
  const allLights = [...keptLights, ...addedLights];

  void originalTreeIds;

  return {
    ...original,
    buildings: allBuildings,
    trees: allTrees,
    streetLights: allLights,
    groundColor: diff.groundColor
      ? interpolateColor(original.groundColor, diff.groundColor, t)
      : original.groundColor,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolateNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateTuple(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    interpolateNumber(a[0], b[0], t),
    interpolateNumber(a[1], b[1], t),
    interpolateNumber(a[2], b[2], t),
  ];
}

function interpolateColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(interpolateNumber(a.r, b.r, t));
  const g = Math.round(interpolateNumber(a.g, b.g, t));
  const bl = Math.round(interpolateNumber(a.b, b.b, t));
  return rgbToHex(r, g, bl);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
