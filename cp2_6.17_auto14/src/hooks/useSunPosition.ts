import { useMemo } from 'react';
import { SEASON_SOLAR_DATA, type Season } from '@/data/roomConfig';

export interface SunPosition {
  azimuth: number;
  altitude: number;
  intensity: number;
  x: number;
  y: number;
  z: number;
}

export function useSunPosition(
  orientation: number,
  time: number,
  season: Season
): SunPosition {
  return useMemo(() => {
    const solarData = SEASON_SOLAR_DATA[season];
    const hours = Math.floor(time);
    const minutes = (time - hours) * 60;
    const totalMinutes = (hours - 6) * 60 + minutes;
    const dayProgress = totalMinutes / (12 * 60);

    const maxAlt = solarData.maxAltitude;
    const minAlt = solarData.minAltitude;
    const altitude = minAlt + (maxAlt - minAlt) * Math.sin(dayProgress * Math.PI);
    const altitudeRad = (altitude * Math.PI) / 180;

    const baseAzimuth = -90 + 180 * dayProgress;
    const azimuth = baseAzimuth + solarData.azimuthOffset + orientation;
    const azimuthRad = (azimuth * Math.PI) / 180;

    const baseIntensity = Math.sin(dayProgress * Math.PI);
    const intensity = baseIntensity * solarData.intensityMultiplier;

    const distance = 15;
    const x = distance * Math.cos(altitudeRad) * Math.sin(azimuthRad);
    const y = distance * Math.sin(altitudeRad);
    const z = distance * Math.cos(altitudeRad) * Math.cos(azimuthRad);

    return {
      azimuth: ((azimuth % 360) + 360) % 360,
      altitude,
      intensity: Math.max(0, Math.min(1, intensity)),
      x,
      y,
      z,
    };
  }, [orientation, time, season]);
}
