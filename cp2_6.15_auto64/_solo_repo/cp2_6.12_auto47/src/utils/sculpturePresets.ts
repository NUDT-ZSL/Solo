import type { GeometryItem, PresetId } from '@/store/useSculptureStore';

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function applyPresetToGeometries(
  geometries: GeometryItem[],
  preset: PresetId
): GeometryItem[] {
  if (!preset) return geometries;
  switch (preset) {
    case 'stack':
      return applyStackPreset(geometries);
    case 'scatter':
      return applyScatterPreset(geometries);
    case 'ring':
      return applyRingPreset(geometries);
    default:
      return geometries;
  }
}

function applyStackPreset(geometries: GeometryItem[]): GeometryItem[] {
  let yOffset = 0;
  return geometries.map((geo, i) => {
    const height = getGeometryHeight(geo) * geo.scale;
    const newY = yOffset + height / 2;
    yOffset += height + 0.05;
    return {
      ...geo,
      position: { x: 0, y: Math.round(newY * 10) / 10, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };
  });
}

function applyScatterPreset(geometries: GeometryItem[]): GeometryItem[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return geometries.map((geo, i) => {
    const radius = 1.5 + i * 0.3;
    const theta = goldenAngle * i;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / geometries.length);
    return {
      ...geo,
      position: {
        x: Math.round((radius * Math.sin(phi) * Math.cos(theta)) * 10) / 10,
        y: Math.round((radius * Math.cos(phi) + 2) * 10) / 10,
        z: Math.round((radius * Math.sin(phi) * Math.sin(theta)) * 10) / 10,
      },
      rotation: {
        x: Math.round(Math.random() * 45),
        y: Math.round(Math.random() * 360),
        z: Math.round(Math.random() * 45),
      },
    };
  });
}

function applyRingPreset(geometries: GeometryItem[]): GeometryItem[] {
  const count = geometries.length;
  const radius = Math.max(1.5, count * 0.4);
  return geometries.map((geo, i) => {
    const angle = (2 * Math.PI * i) / count;
    return {
      ...geo,
      position: {
        x: Math.round((radius * Math.cos(angle)) * 10) / 10,
        y: 0.5,
        z: Math.round((radius * Math.sin(angle)) * 10) / 10,
      },
      rotation: { x: 0, y: Math.round((angle * 180) / Math.PI), z: 0 },
    };
  });
}

function getGeometryHeight(geo: GeometryItem): number {
  switch (geo.type) {
    case 'cube':
      return 1;
    case 'sphere':
      return 1;
    case 'cylinder':
      return 1;
    case 'cone':
      return 1;
    case 'torus':
      return 0.4;
    default:
      return 1;
  }
}

export { easeInOut };
