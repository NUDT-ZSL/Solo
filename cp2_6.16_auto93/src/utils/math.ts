export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const clampedT = Math.max(0, Math.min(1, t));
  return rgbToHex(
    c1.r + (c2.r - c1.r) * clampedT,
    c1.g + (c2.g - c1.g) * clampedT,
    c1.b + (c2.b - c1.b) * clampedT
  );
};

export const getSkyColor = (time: number): string => {
  const sunrise = 5.5;
  const sunset = 18.5;
  const midnight = 24;

  if (time < sunrise - 1) {
    return '#0a0e27';
  } else if (time < sunrise + 1) {
    const t = (time - (sunrise - 1)) / 2;
    return lerpColor('#0a0e27', '#ff6b35', t);
  } else if (time < 8) {
    const t = (time - (sunrise + 1)) / (8 - (sunrise + 1));
    return lerpColor('#ff6b35', '#87ceeb', t);
  } else if (time < 16) {
    return '#87ceeb';
  } else if (time < sunset - 1) {
    const t = (time - 16) / ((sunset - 1) - 16);
    return lerpColor('#87ceeb', '#ff6b35', t);
  } else if (time < sunset + 1) {
    const t = (time - (sunset - 1)) / 2;
    return lerpColor('#ff6b35', '#1a1a4e', t);
  } else {
    const t = (time - (sunset + 1)) / (midnight - (sunset + 1));
    return lerpColor('#1a1a4e', '#0a0e27', t);
  }
};

export const getSunColor = (time: number): string => {
  const sunrise = 5.5;
  const noon = 12;
  const sunset = 18.5;

  if (time < sunrise - 0.5 || time > sunset + 0.5) {
    return '#ff6b6b';
  } else if (time < noon) {
    const t = (time - sunrise) / (noon - sunrise);
    return lerpColor('#ff6b6b', '#ffd93d', t);
  } else {
    const t = (time - noon) / (sunset - noon);
    return lerpColor('#ffd93d', '#ff4757', t);
  }
};

export const calculateSunPosition = (
  time: number,
  canvasWidth: number,
  canvasHeight: number,
  latitude: number
): { x: number; y: number; visible: boolean; angle: number } => {
  const sunrise = 5.5;
  const sunset = 18.5;
  const totalDayHours = sunset - sunrise;

  const normalizedTime = (time - sunrise) / totalDayHours;
  const startAngle = -45 * (Math.PI / 180);
  const endAngle = 225 * (Math.PI / 180);

  const latInfluence = latitude / 90;
  const baseRadiusX = canvasWidth * 0.45;
  const baseRadiusY = canvasHeight * 0.6;
  const radiusX = baseRadiusX * (1 - Math.abs(latInfluence) * 0.3);
  const radiusY = baseRadiusY * (1 - Math.abs(latInfluence) * 0.2);

  const angle = startAngle + normalizedTime * (endAngle - startAngle);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight * 0.75 - latInfluence * canvasHeight * 0.1;

  const x = centerX + radiusX * Math.cos(angle);
  const y = centerY - radiusY * Math.sin(angle);

  const visible = time >= sunrise - 0.5 && time <= sunset + 0.5 && y < canvasHeight - 40;

  return { x, y, visible, angle };
};

export const getSunAltitude = (time: number, latitude: number): number => {
  const sunrise = 5.5;
  const sunset = 18.5;
  const noon = 12;

  if (time < sunrise || time > sunset) {
    return 0;
  }

  let t: number;
  if (time <= noon) {
    t = (time - sunrise) / (noon - sunrise);
  } else {
    t = (sunset - time) / (sunset - noon);
  }

  const maxAltitude = 90 - Math.abs(latitude);
  return Math.max(0, Math.min(90, t * maxAltitude));
};

export const calculateTemperature = (sunAltitude: number): number => {
  const temp = (sunAltitude / 90) * 30 + 10;
  return Math.round(temp * 10) / 10;
};

export const formatTime = (hours: number): string => {
  const h = Math.floor(hours) % 24;
  const m = Math.round((hours % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const getSunriseTime = (_latitude: number, _longitude: number): number => {
  return 5.5;
};

export const getSunsetTime = (_latitude: number, _longitude: number): number => {
  return 18.5;
};

export const isTwilight = (time: number): boolean => {
  const sunrise = 5.5;
  const sunset = 18.5;
  return (time >= sunrise - 0.5 && time <= sunrise + 0.5) ||
         (time >= sunset - 0.5 && time <= sunset + 0.5);
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(randomRange(min, max + 1));
};
