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

export function calculateFacadeSunHours(
  facadeDirection: 'north' | 'south' | 'east' | 'west',
  buildingPos: { x: number; z: number },
  buildingHeight: number,
  allBuildings: Array<{ x: number; z: number; height: number; width: number; depth: number }>,
  month: number,
  day: number
): number {
  const facadeNormals: Record<string, THREE.Vector3> = {
    north: new THREE.Vector3(0, 0, -1),
    south: new THREE.Vector3(0, 0, 1),
    east: new THREE.Vector3(1, 0, 0),
    west: new THREE.Vector3(-1, 0, 0),
  };

  const normal = facadeNormals[facadeDirection];
  let totalSunHours = 0;
  const step = 0.25;

  for (let hour = 6; hour <= 18; hour += step) {
    const solar = getSolarPosition(month, day, hour);
    if (solar.altitude <= 0) continue;

    const sunDir = solar.position.clone().normalize();
    const dot = sunDir.dot(normal);
    if (dot <= 0) continue;

    let blocked = false;
    for (const ob of allBuildings) {
      if (ob.x === buildingPos.x && ob.z === buildingPos.z) continue;

      const toOb = new THREE.Vector3(
        ob.x - buildingPos.x,
        0,
        ob.z - buildingPos.z
      );

      if (toOb.dot(normal) <= 0) continue;

      const t = toOb.length();
      const rayDir = solar.position.clone().normalize();

      for (let h = 0; h <= buildingHeight; h += 1) {
        const rayOrigin = new THREE.Vector3(buildingPos.x, h, buildingPos.z);
        const pointAlongRay = rayOrigin.clone().add(rayDir.clone().multiplyScalar(t));

        if (
          pointAlongRay.x >= ob.x - ob.width / 2 &&
          pointAlongRay.x <= ob.x + ob.width / 2 &&
          pointAlongRay.z >= ob.z - ob.depth / 2 &&
          pointAlongRay.z <= ob.z + ob.depth / 2 &&
          pointAlongRay.y >= 0 &&
          pointAlongRay.y <= ob.height
        ) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    }

    if (!blocked) {
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
      let totalHours = 0;

      const isInsideBuilding = allBuildings.some(b =>
        gx >= b.x - b.width / 2 && gx <= b.x + b.width / 2 &&
        gz >= b.z - b.depth / 2 && gz <= b.z + b.depth / 2
      );
      if (isInsideBuilding) continue;

      for (let hour = 6; hour <= 18; hour += step) {
        const solar = getSolarPosition(month, day, hour);
        if (solar.altitude <= 0) continue;

        let blocked = false;
        for (const ob of allBuildings) {
          const toOb = new THREE.Vector3(ob.x - gx, 0, ob.z - gz);
          const dist = toOb.length();
          const rayDir = solar.position.clone().normalize();

          const shadowHeight = ob.height - dist * Math.tan(solar.altitude);

          const dx = gx - ob.x;
          const dz = gz - ob.z;
          const sunX = rayDir.x;
          const sunZ = rayDir.z;

          if (
            Math.abs(dx) < ob.width / 2 + gridSize / 2 &&
            Math.abs(dz) < ob.depth / 2 + gridSize / 2 &&
            shadowHeight > 0
          ) {
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

export function getHeatmapColor(hours: number, maxHours: number = 12): THREE.Color {
  const t = Math.min(hours / maxHours, 1);
  const r = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
  const g = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
  const b = t;
  return new THREE.Color(r, g, b);
}

export function getGroundHeatmapColor(hours: number, maxHours: number = 12): THREE.Color {
  const t = Math.min(hours / maxHours, 1);
  const r = t * 0.99;
  const g = t * 0.88;
  const b = (1 - t) * 0.54 + t * 0.28;
  return new THREE.Color(r, g, b);
}
