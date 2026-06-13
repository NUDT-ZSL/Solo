export interface SunPosition {
  altitude: number;
  azimuth: number;
}

export interface SunLightConfig {
  position: [number, number, number];
  intensity: number;
  color: string;
}

export interface HourlySunData {
  hour: number;
  altitude: number;
  azimuth: number;
  position: [number, number, number];
  intensity: number;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function calculateSunLight(
  altitudeDeg: number,
  azimuthDeg: number,
  distance: number = 80
): SunLightConfig {
  const alt = degToRad(Math.max(0, altitudeDeg));
  const azi = degToRad(azimuthDeg);

  const x = distance * Math.cos(alt) * Math.sin(azi);
  const y = distance * Math.sin(alt);
  const z = distance * Math.cos(alt) * Math.cos(azi);

  const normalizedAlt = Math.max(0, Math.min(1, altitudeDeg / 90));
  const intensity = 0.3 + normalizedAlt * 1.5;

  let color = '#ffffff';
  if (altitudeDeg < 15) {
    color = '#ff9966';
  } else if (altitudeDeg < 30) {
    color = '#ffcc99';
  } else if (altitudeDeg < 60) {
    color = '#fff8e7';
  }

  return {
    position: [x, y, z],
    intensity,
    color,
  };
}

export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getSolarDeclination(dayOfYear: number): number {
  return 23.44 * Math.sin(degToRad((360 / 365) * (dayOfYear - 81)));
}

export function calculateSunPosition(
  date: Date,
  latitudeDeg: number = 39.9,
  longitudeDeg: number = 116.4
): SunPosition {
  const dayOfYear = getDayOfYear(date);
  const declination = getSolarDeclination(dayOfYear);

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const decimalHours = hours + minutes / 60 + seconds / 3600;

  const eqTime =
    9.87 * Math.sin(degToRad(2 * (dayOfYear - 81))) -
    7.53 * Math.cos(degToRad(dayOfYear - 81)) -
    1.5 * Math.sin(degToRad(dayOfYear - 81));

  const timeOffset = eqTime + 4 * (longitudeDeg - 120);
  const solarTime = decimalHours + timeOffset / 60;
  const hourAngle = 15 * (solarTime - 12);

  const latRad = degToRad(latitudeDeg);
  const decRad = degToRad(declination);
  const haRad = degToRad(hourAngle);

  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

  const altitude = radToDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  let azimuth: number;
  if (Math.abs(Math.cos(degToRad(altitude))) < 0.001) {
    azimuth = 180;
  } else {
    const cosAz =
      (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
      (Math.cos(latRad) * Math.cos(Math.asin(Math.max(0, sinAlt))));
    azimuth = radToDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (hourAngle > 0) {
      azimuth = 360 - azimuth;
    }
  }

  return { altitude: Math.max(0, altitude), azimuth };
}

export function generateHourlySunPositions(
  targetDate: Date,
  latitudeDeg: number = 39.9
): HourlySunData[] {
  const data: HourlySunData[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    const d = new Date(targetDate);
    d.setHours(hour, 0, 0, 0);
    const pos = calculateSunPosition(d, latitudeDeg);
    const light = calculateSunLight(pos.altitude, pos.azimuth);
    data.push({
      hour,
      altitude: pos.altitude,
      azimuth: pos.azimuth,
      position: light.position,
      intensity: light.intensity,
    });
  }
  return data;
}

export function getSolsticeDates(year?: number): {
  summer: Date;
  winter: Date;
} {
  const y = year ?? new Date().getFullYear();
  return {
    summer: new Date(y, 5, 21, 12, 0, 0),
    winter: new Date(y, 11, 21, 12, 0, 0),
  };
}

export function calculateBuildingShadowArea(
  buildingWidth: number,
  buildingDepth: number,
  buildingHeight: number,
  altitudeDeg: number,
  azimuthDeg: number
): number {
  if (altitudeDeg <= 0) return Infinity;

  const altRad = degToRad(altitudeDeg);
  const aziRad = degToRad(azimuthDeg);

  const shadowLength = buildingHeight / Math.tan(altRad);
  const dx = Math.abs(shadowLength * Math.sin(aziRad));
  const dz = Math.abs(shadowLength * Math.cos(aziRad));

  const footprint = buildingWidth * buildingDepth;
  const extendedArea = dx * buildingDepth + dz * buildingWidth + dx * dz;

  return footprint + extendedArea;
}
