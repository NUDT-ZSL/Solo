import * as THREE from 'three';

const LATITUDE = 40.7128;
const LAT_RAD = (LATITUDE * Math.PI) / 180;

export function getDayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = 0;
  for (let i = 0; i < month - 1; i++) {
    doy += daysInMonth[i];
  }
  return doy + day;
}

export function getSolarDeclination(dayOfYear: number): number {
  return (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
}

export function getHourAngle(hour: number): number {
  return (15 * (hour - 12)) * Math.PI / 180;
}

export function getSolarPosition(dateMonth: number, dateDay: number, timeHour: number): {
  azimuth: number;
  altitude: number;
  position: THREE.Vector3;
  sunDistance: number;
} {
  const doy = getDayOfYear(dateMonth, dateDay);
  const declination = getSolarDeclination(doy);
  const hourAngle = getHourAngle(timeHour);

  const sinAlt = Math.sin(LAT_RAD) * Math.sin(declination) +
    Math.cos(LAT_RAD) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz = (Math.sin(declination) - Math.sin(LAT_RAD) * sinAlt) /
    (Math.cos(LAT_RAD) * Math.cos(altitude) + 0.0001);
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (hourAngle > 0) azimuth = 2 * Math.PI - azimuth;

  const sunDistance = 50;
  const x = sunDistance * Math.cos(altitude) * Math.sin(azimuth);
  const y = sunDistance * Math.sin(altitude);
  const z = sunDistance * Math.cos(altitude) * Math.cos(azimuth);

  return {
    azimuth,
    altitude,
    position: new THREE.Vector3(x, Math.max(0, y), z),
    sunDistance,
  };
}

function rayBoxIntersect(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  boxMin: THREE.Vector3,
  boxMax: THREE.Vector3
): number | null {
  let tMin = -Infinity;
  let tMax = Infinity;

  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(rayDir[axis]) < 0.000001) {
      if (rayOrigin[axis] < boxMin[axis] || rayOrigin[axis] > boxMax[axis]) {
        return null;
      }
    } else {
      const t1 = (boxMin[axis] - rayOrigin[axis]) / rayDir[axis];
      const t2 = (boxMax[axis] - rayOrigin[axis]) / rayDir[axis];
      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);
      tMin = Math.max(tMin, tNear);
      tMax = Math.min(tMax, tFar);
      if (tMin > tMax) return null;
    }
  }

  return tMin > 0 ? tMin : (tMax > 0 ? tMax : null);
}

export function calculateFacadeSunHours(
  facadeDirection: 'north' | 'south' | 'east' | 'west',
  buildingPos: { x: number; z: number },
  buildingHeight: number,
  allBuildings: Array<{ x: number; z: number; height: number; width: number; depth: number }>,
  month: number,
  day: number
): number {
  const facadeInfo: Record<string, { normal: THREE.Vector3; offset: { x: number; z: number } }> = {
    north: { normal: new THREE.Vector3(0, 0, -1), offset: { x: 0, z: -1 } },
    south: { normal: new THREE.Vector3(0, 0, 1), offset: { x: 0, z: 1 } },
    east: { normal: new THREE.Vector3(1, 0, 0), offset: { x: 1, z: 0 } },
    west: { normal: new THREE.Vector3(-1, 0, 0), offset: { x: -1, z: 0 } },
  };

  const info = facadeInfo[facadeDirection];
  let totalSunHours = 0;
  const step = 0.25;

  const building = allBuildings.find(b => b.x === buildingPos.x && b.z === buildingPos.z);
  if (!building) return 0;

  const halfW = building.width / 2;
  const halfD = building.depth / 2;

  const facadeOrigins: THREE.Vector3[] = [];
  const numPoints = 5;
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const h = buildingHeight * t;

    if (facadeDirection === 'north' || facadeDirection === 'south') {
      for (let j = 0; j < numPoints; j++) {
        const xt = j / (numPoints - 1);
        const x = buildingPos.x - halfW + building.width * xt;
        const z = buildingPos.z + info.offset.z * halfD;
        facadeOrigins.push(new THREE.Vector3(x, h, z));
      }
    } else {
      for (let j = 0; j < numPoints; j++) {
        const zt = j / (numPoints - 1);
        const z = buildingPos.z - halfD + building.depth * zt;
        const x = buildingPos.x + info.offset.x * halfW;
        facadeOrigins.push(new THREE.Vector3(x, h, z));
      }
    }
  }

  for (let hour = 6; hour <= 18; hour += step) {
    const solar = getSolarPosition(month, day, hour);
    if (solar.altitude <= 0) continue;

    const sunDir = solar.position.clone().normalize();
    const dot = sunDir.dot(info.normal);
    if (dot <= 0.05) continue;

    let allBlocked = true;
    for (const origin of facadeOrigins) {
      let blocked = false;
      for (const ob of allBuildings) {
        if (ob.x === buildingPos.x && ob.z === buildingPos.z) continue;

        const obMin = new THREE.Vector3(
          ob.x - ob.width / 2,
          0,
          ob.z - ob.depth / 2
        );
        const obMax = new THREE.Vector3(
          ob.x + ob.width / 2,
          ob.height,
          ob.z + ob.depth / 2
        );

        const t = rayBoxIntersect(origin.clone(), sunDir.clone(), obMin, obMax);
        if (t !== null && t > 0 && t < 50) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        allBlocked = false;
        break;
      }
    }

    if (!allBlocked) {
      totalSunHours += step;
    }
  }

  return Math.round(totalSunHours * 10) / 10;
}

export function calculateGroundSunlightMap(
  allBuildings: Array<{ x: number; z: number; height: number; width: number; depth: number }>,
  month: number,
  day: number,
  gridSize: number = 2,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): Array<{ x: number; z: number; hours: number }> {
  const results: Array<{ x: number; z: number; hours: number }> = [];
  const step = 0.5;

  for (let gx = bounds.minX; gx <= bounds.maxX; gx += gridSize) {
    for (let gz = bounds.minZ; gz <= bounds.maxZ; gz += gridSize) {
      const isInsideBuilding = allBuildings.some(b =>
        gx >= b.x - b.width / 2 - 0.1 && gx <= b.x + b.width / 2 + 0.1 &&
        gz >= b.z - b.depth / 2 - 0.1 && gz <= b.z + b.depth / 2 + 0.1
      );
      if (isInsideBuilding) continue;

      let totalHours = 0;
      const groundPoint = new THREE.Vector3(gx, 0.01, gz);

      for (let hour = 6; hour <= 18; hour += step) {
        const solar = getSolarPosition(month, day, hour);
        if (solar.altitude <= 0) continue;

        const sunDir = solar.position.clone().normalize();
        let blocked = false;

        for (const ob of allBuildings) {
          const obMin = new THREE.Vector3(
            ob.x - ob.width / 2,
            0,
            ob.z - ob.depth / 2
          );
          const obMax = new THREE.Vector3(
            ob.x + ob.width / 2,
            ob.height,
            ob.z + ob.depth / 2
          );

          const t = rayBoxIntersect(groundPoint.clone(), sunDir.clone(), obMin, obMax);
          if (t !== null && t > 0 && t < 100) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          totalHours += step;
        }
      }

      results.push({ x: gx, z: gz, hours: Math.round(totalHours * 10) / 10 });
    }
  }

  return results;
}

export function getHeatmapColor(hours: number, maxHours: number = 6): THREE.Color {
  const t = Math.min(hours / maxHours, 1);
  const r = 1 - t;
  const g = 0.2 + 0.6 * t;
  const b = t;
  return new THREE.Color(r, g, b);
}

export function getGroundHeatmapColor(hours: number, maxHours: number = 12): THREE.Color {
  const t = Math.min(hours / maxHours, 1);
  const deepBlue = new THREE.Color('#1e3a8a');
  const brightYellow = new THREE.Color('#fde047');
  return deepBlue.clone().lerp(brightYellow, t);
}
