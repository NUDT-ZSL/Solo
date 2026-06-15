export interface TimeColorResult {
  color: string;
  opacity: number;
  isDay: boolean;
}

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function calcSunTimes(
  date: Date,
  latitude: number,
  longitude: number
): { sunrise: number; sunset: number } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const n1 = Math.floor(275 * month / 9);
  const n2 = Math.floor((month + 9) / 12);
  const n3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
  const dayOfYear = n1 - n2 * n3 + day - 30;

  const lngHour = longitude / 15;
  const approxTimeRise = dayOfYear + (6 - lngHour) / 24;
  const approxTimeSet = dayOfYear + (18 - lngHour) / 24;

  const meanAnomalyRise = 0.9856 * approxTimeRise - 3.289;
  const meanAnomalySet = 0.9856 * approxTimeSet - 3.289;

  function computeTimeFromAnomaly(meanAnomaly: number): number {
    let trueLongitude =
      meanAnomaly +
      1.916 * Math.sin(degToRad(meanAnomaly)) +
      0.02 * Math.sin(degToRad(2 * meanAnomaly)) +
      282.634;
    trueLongitude = ((trueLongitude % 360) + 360) % 360;

    let rightAscension = radToDeg(Math.atan(0.91764 * Math.tan(degToRad(trueLongitude))));
    rightAscension = ((rightAscension % 360) + 360) % 360;

    const lngQuadrant = Math.floor(trueLongitude / 90) * 90;
    const raQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = rightAscension + (lngQuadrant - raQuadrant);
    rightAscension = rightAscension / 15;

    const sinDec = 0.39782 * Math.sin(degToRad(trueLongitude));
    const cosDec = Math.cos(Math.asin(sinDec));

    const cosH =
      (Math.sin(degToRad(-0.833)) - sinDec * Math.sin(degToRad(latitude))) /
      (cosDec * Math.cos(degToRad(latitude)));

    const localMeanTime =
      cosH > 1 || cosH < -1
        ? rightAscension
        : rightAscension - (radToDeg(Math.acos(cosH)) / 15);

    const universalTime = localMeanTime - lngHour;
    return ((universalTime % 24) + 24) % 24;
  }

  const riseHour = computeTimeFromAnomaly(meanAnomalyRise);
  const setHour = computeTimeFromAnomaly(meanAnomalySet);

  const baseDate = Date.UTC(year, month - 1, day);
  return {
    sunrise: baseDate + riseHour * 3600 * 1000,
    sunset: baseDate + setHour * 3600 * 1000
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    ca.r + (cb.r - ca.r) * t,
    ca.g + (cb.g - ca.g) * t,
    ca.b + (cb.b - ca.b) * t
  );
}

export function getTimeColor(
  timestamp: number,
  latitude: number,
  longitude: number
): TimeColorResult {
  const date = new Date(timestamp);
  const { sunrise, sunset } = calcSunTimes(date, latitude, longitude);

  const DAY_START = '#FF8800';
  const DAY_END = '#FF3366';
  const NIGHT_START = '#3366FF';
  const NIGHT_END = '#6633FF';

  const hoursMs = 3600 * 1000;
  let color: string;
  let opacity: number;
  let isDay: boolean;

  if (timestamp >= sunrise && timestamp <= sunset) {
    isDay = true;
    const daySpan = sunset - sunrise || 1;
    const dayProgress = (timestamp - sunrise) / daySpan;
    color = lerpColor(DAY_START, DAY_END, dayProgress);

    const toSunrise = sunrise + hoursMs;
    const toSunset = sunset - hoursMs;
    if (timestamp < toSunrise) {
      const t = (timestamp - sunrise) / (hoursMs || 1);
      opacity = 0.5 + 0.5 * t;
    } else if (timestamp > toSunset) {
      const t = (timestamp - toSunset) / (hoursMs || 1);
      opacity = 1.0 - 0.5 * t;
    } else {
      opacity = 1.0;
    }
  } else {
    isDay = false;
    let nightProgress: number;
    if (timestamp < sunrise) {
      const nightStart = sunset - 24 * hoursMs;
      const nightSpan = sunrise - nightStart || 1;
      nightProgress = (timestamp - nightStart) / nightSpan;
    } else {
      const nightEnd = sunrise + 24 * hoursMs;
      const nightSpan = nightEnd - sunset || 1;
      nightProgress = (timestamp - sunset) / nightSpan;
    }
    color = lerpColor(NIGHT_START, NIGHT_END, nightProgress);

    const nearSunset = sunset + hoursMs;
    const nearSunrise = sunrise - hoursMs;
    if (timestamp < sunrise) {
      if (timestamp > nearSunrise) {
        const t = (timestamp - nearSunrise) / (hoursMs || 1);
        opacity = 0.5 + 0.5 * t;
      } else {
        opacity = 0.5;
      }
    } else {
      if (timestamp < nearSunset) {
        const t = (timestamp - sunset) / (hoursMs || 1);
        opacity = 1.0 - 0.5 * t;
      } else {
        opacity = 0.5;
      }
    }
  }

  return { color, opacity: Math.max(0.5, Math.min(1.0, opacity)), isDay };
}
