export interface SunPosition {
  azimuth: number;
  altitude: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getEquationOfTime(dayOfYear: number): number {
  const B = (360 / 365) * (dayOfYear - 81) * DEG_TO_RAD;
  const EOT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return EOT;
}

function getSolarDeclination(dayOfYear: number): number {
  return 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * DEG_TO_RAD) * DEG_TO_RAD;
}

export function computeSunPosition(
  date: Date,
  timeHours: number,
  location: Location = { latitude: 39.9, longitude: 116.4 }
): SunPosition {
  const dayOfYear = getDayOfYear(date);
  const solarDeclination = getSolarDeclination(dayOfYear);
  const equationOfTime = getEquationOfTime(dayOfYear);

  const localStandardMeridian = Math.round(location.longitude / 15) * 15;
  const timeCorrection = equationOfTime + 4 * (location.longitude - localStandardMeridian);
  const solarTime = timeHours + timeCorrection / 60;

  const hourAngle = (solarTime - 12) * 15 * DEG_TO_RAD;
  const latitudeRad = location.latitude * DEG_TO_RAD;

  const sinAltitude =
    Math.sin(latitudeRad) * Math.sin(solarDeclination) +
    Math.cos(latitudeRad) * Math.cos(solarDeclination) * Math.cos(hourAngle);

  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  const cosAzimuth =
    (Math.sin(solarDeclination) * Math.cos(latitudeRad) -
      Math.cos(solarDeclination) * Math.sin(latitudeRad) * Math.cos(hourAngle)) /
    Math.cos(altitude);

  const sinAzimuth =
    (-Math.cos(solarDeclination) * Math.sin(hourAngle)) / Math.cos(altitude);

  let azimuth = Math.atan2(sinAzimuth, cosAzimuth);
  if (azimuth < 0) azimuth += 2 * Math.PI;

  return {
    azimuth: azimuth * RAD_TO_DEG,
    altitude: altitude * RAD_TO_DEG
  };
}

export function sunPositionToDirection(azimuth: number, altitude: number): { x: number; y: number; z: number } {
  const azimuthRad = azimuth * DEG_TO_RAD;
  const altitudeRad = altitude * DEG_TO_RAD;

  const x = -Math.sin(azimuthRad) * Math.cos(altitudeRad);
  const y = Math.sin(altitudeRad);
  const z = -Math.cos(azimuthRad) * Math.cos(altitudeRad);

  return { x, y, z };
}
