import * as THREE from 'three';
import { BuildingData, SolarResult } from '../types';

export function calculateSunPosition(dayOfYear: number, latitude: number): THREE.Vector3 {
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const hourAngle = 0;

  const sinAltitude = Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAltitude);

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

function getBuildingFaceNormals(building: BuildingData): { normal: THREE.Vector3; position: THREE.Vector3 }[] {
  const hw = building.width / 2;
  const hd = building.depth / 2;
  const hh = building.height / 2;
  const cx = building.x;
  const cz = building.z;
  const cy = hh;

  const faces = [
    { normal: new THREE.Vector3(0, 1, 0), position: new THREE.Vector3(cx, cy + hh, cz) },
    { normal: new THREE.Vector3(0, -1, 0), position: new THREE.Vector3(cx, cy - hh, cz) },
    { normal: new THREE.Vector3(1, 0, 0), position: new THREE.Vector3(cx + hw, cy, cz) },
    { normal: new THREE.Vector3(-1, 0, 0), position: new THREE.Vector3(cx - hw, cy, cz) },
    { normal: new THREE.Vector3(0, 0, 1), position: new THREE.Vector3(cx, cy, cz + hd) },
    { normal: new THREE.Vector3(0, 0, -1), position: new THREE.Vector3(cx, cy, cz - hd) },
  ];

  return faces;
}

function isFaceOccluded(
  facePos: THREE.Vector3,
  sunDir: THREE.Vector3,
  buildings: BuildingData[],
  excludeId: number
): boolean {
  const rayOrigin = facePos.clone();
  const rayDir = sunDir.clone().negate();

  for (const b of buildings) {
    if (b.id === excludeId || b.isGreen) continue;

    const hw = b.width / 2;
    const hd = b.depth / 2;
    const minX = b.x - hw;
    const maxX = b.x + hw;
    const minZ = b.z - hd;
    const maxZ = b.z + hd;
    const minY = 0;
    const maxY = b.height;

    let tmin = -Infinity, tmax = Infinity;

    for (let i = 0; i < 3; i++) {
      const origin = rayOrigin.getComponent(i);
      const dir = rayDir.getComponent(i);
      const min = i === 0 ? minX : i === 1 ? minY : minZ;
      const max = i === 0 ? maxX : i === 1 ? maxY : maxZ;

      if (Math.abs(dir) < 1e-8) {
        if (origin < min || origin > max) return false;
      } else {
        let t1 = (min - origin) / dir;
        let t2 = (max - origin) / dir;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }
    }

    if (tmax > 0.01) return true;
  }

  return false;
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

    const faces = getBuildingFaceNormals(building);
    const buildingResults: SolarResult[] = [];

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const dot = face.normal.dot(sunDir);
      let intensity = Math.max(0, dot);

      if (intensity > 0 && isFaceOccluded(face.position, sunDir, buildings, building.id)) {
        intensity *= 0.3;
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

  if (clamped < 0.5) {
    const t = clamped * 2;
    color.setRGB(
      21 / 255 * (1 - t) + 255 / 255 * t,
      101 / 255 * (1 - t) + 193 / 255 * t,
      192 / 255 * (1 - t) + 7 / 255 * t
    );
  } else {
    const t = (clamped - 0.5) * 2;
    color.setRGB(
      255 / 255 * (1 - t) + 211 / 255 * t,
      193 / 255 * (1 - t) + 47 / 255 * t,
      7 / 255 * (1 - t) + 47 / 255 * t
    );
  }

  return color;
}
