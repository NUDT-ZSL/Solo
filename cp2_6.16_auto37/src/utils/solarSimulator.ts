import * as THREE from 'three';
import { BuildingData, SolarResult } from '../types';

export function calculateSunPosition(dayOfYear: number, latitude: number): THREE.Vector3 {
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const hourAngle = 0;

  const sinAltitude = Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  const cosAzimuth = (Math.sin(decRad) - Math.sin(latRad) * sinAltitude) /
    (Math.cos(latRad) * Math.cos(altitude));
  const azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));

  const sunDir = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(altitude),
    Math.sin(altitude),
    Math.cos(azimuth) * Math.cos(altitude)
  ).normalize();

  return sunDir;
}

interface BuildingFace {
  normal: THREE.Vector3;
  position: THREE.Vector3;
  width: number;
  height: number;
}

function getBuildingFaces(building: BuildingData): BuildingFace[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;
  const hh = building.height / 2;
  const cx = building.x;
  const cz = building.z;
  const cy = hh;

  const faces: BuildingFace[] = [
    {
      normal: new THREE.Vector3(0, 1, 0),
      position: new THREE.Vector3(cx, building.height, cz),
      width: building.width,
      height: building.depth
    },
    {
      normal: new THREE.Vector3(1, 0, 0),
      position: new THREE.Vector3(cx + hw, cy, cz),
      width: building.depth,
      height: building.height
    },
    {
      normal: new THREE.Vector3(-1, 0, 0),
      position: new THREE.Vector3(cx - hw, cy, cz),
      width: building.depth,
      height: building.height
    },
    {
      normal: new THREE.Vector3(0, 0, 1),
      position: new THREE.Vector3(cx, cy, cz + hd),
      width: building.width,
      height: building.height
    },
    {
      normal: new THREE.Vector3(0, 0, -1),
      position: new THREE.Vector3(cx, cy, cz - hd),
      width: building.width,
      height: building.height
    }
  ];

  return faces;
}

function rayBoxIntersection(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  building: BuildingData
): number | null {
  const hw = building.width / 2;
  const hd = building.depth / 2;
  const minX = building.x - hw;
  const maxX = building.x + hw;
  const minZ = building.z - hd;
  const maxZ = building.z + hd;
  const minY = 0;
  const maxY = building.height;

  let tmin = -Infinity;
  let tmax = Infinity;

  const axes = ['x', 'y', 'z'] as const;
  for (const axis of axes) {
    const origin = rayOrigin[axis];
    const dir = rayDir[axis];
    const min = axis === 'x' ? minX : axis === 'y' ? minY : minZ;
    const max = axis === 'x' ? maxX : axis === 'y' ? maxY : maxZ;

    if (Math.abs(dir) < 1e-8) {
      if (origin < min || origin > max) return null;
    } else {
      let t1 = (min - origin) / dir;
      let t2 = (max - origin) / dir;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }

  if (tmax < 0) return null;
  return tmin > 0 ? tmin : tmax;
}

function calculateFaceShadowFactor(
  facePos: THREE.Vector3,
  faceNormal: THREE.Vector3,
  sunDir: THREE.Vector3,
  buildings: BuildingData[],
  excludeId: number
): number {
  const rayOrigin = facePos.clone();
  const rayDir = sunDir.clone().negate();
  const epsilon = 0.01;

  let closestHit = Infinity;
  let hitBuilding: BuildingData | null = null;

  for (const b of buildings) {
    if (b.id === excludeId || b.isGreen) continue;

    const t = rayBoxIntersection(rayOrigin, rayDir, b);
    if (t !== null && t > epsilon && t < closestHit) {
      closestHit = t;
      hitBuilding = b;
    }
  }

  if (!hitBuilding) return 1;

  const distance = closestHit;
  const blockerHeight = hitBuilding.height;
  const faceHeight = facePos.y;
  const heightRatio = Math.max(0, (blockerHeight - faceHeight) / Math.max(1, blockerHeight));

  const shadowFactor = 0.2 + 0.8 * Math.exp(-distance * 0.1) * heightRatio;

  return 1 - shadowFactor * 0.7;
}

export function calculateSolarIntensity(
  buildings: BuildingData[],
  dayOfYear: number,
  latitude: number
): SolarResult[][] {
  const sunDir = calculateSunPosition(dayOfYear, latitude);
  const results: SolarResult[][] = [];

  for (const building of buildings) {
    if (building.isGreen) {
      results.push([]);
      continue;
    }

    const faces = getBuildingFaces(building);
    const buildingResults: SolarResult[] = [];

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const dot = face.normal.dot(sunDir);
      let intensity = Math.max(0, dot);

      if (intensity > 0) {
        const shadowFactor = calculateFaceShadowFactor(
          face.position,
          face.normal,
          sunDir,
          buildings,
          building.id
        );
        intensity *= shadowFactor;
      }

      if (face.normal.y === 0) {
        intensity *= 0.85;
      }

      buildingResults.push({
        buildingId: building.id,
        faceIndex: i,
        intensity
      });
    }

    results.push(buildingResults);
  }

  return results;
}

export function heatmapColor(intensity: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, intensity));
  const color = new THREE.Color();

  const stops = [
    { t: 0.0, r: 21 / 255, g: 101 / 255, b: 192 / 255 },
    { t: 0.25, r: 33 / 255, g: 150 / 255, b: 243 / 255 },
    { t: 0.5, r: 255 / 255, g: 193 / 255, b: 7 / 255 },
    { t: 0.75, r: 255 / 255, g: 87 / 255, b: 34 / 255 },
    { t: 1.0, r: 211 / 255, g: 47 / 255, b: 47 / 255 }
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      const range = stops[i + 1].t - stops[i].t;
      const t = (clamped - stops[i].t) / range;
      color.setRGB(
        stops[i].r + (stops[i + 1].r - stops[i].r) * t,
        stops[i].g + (stops[i + 1].g - stops[i].g) * t,
        stops[i].b + (stops[i + 1].b - stops[i].b) * t
      );
      break;
    }
  }

  return color;
}

export function getAverageBuildingIntensity(solarData: SolarResult[]): number {
  if (solarData.length === 0) return 0;
  const sum = solarData.reduce((acc, r) => acc + r.intensity, 0);
  return sum / solarData.length;
}
