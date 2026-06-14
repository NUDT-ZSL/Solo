export interface RGB {
  r: number;
  g: number;
  b: number;
}

const AQI_COLOR_STOPS: { aqi: number; color: RGB }[] = [
  { aqi: 0, color: { r: 0, g: 228, b: 0 } },
  { aqi: 50, color: { r: 255, g: 255, b: 0 } },
  { aqi: 100, color: { r: 255, g: 126, b: 0 } },
  { aqi: 150, color: { r: 255, g: 0, b: 0 } },
  { aqi: 200, color: { r: 153, g: 0, b: 76 } },
  { aqi: 300, color: { r: 126, g: 0, b: 204 } },
  { aqi: 500, color: { r: 80, g: 0, b: 120 } }
];

export function aqiToRgb(aqi: number): RGB {
  const clampedAqi = Math.max(0, Math.min(500, aqi));
  
  for (let i = 0; i < AQI_COLOR_STOPS.length - 1; i++) {
    const lower = AQI_COLOR_STOPS[i];
    const upper = AQI_COLOR_STOPS[i + 1];
    
    if (clampedAqi >= lower.aqi && clampedAqi <= upper.aqi) {
      const t = (clampedAqi - lower.aqi) / (upper.aqi - lower.aqi);
      return {
        r: Math.round(lower.color.r + (upper.color.r - lower.color.r) * t),
        g: Math.round(lower.color.g + (upper.color.g - lower.color.g) * t),
        b: Math.round(lower.color.b + (upper.color.b - lower.color.b) * t)
      };
    }
  }
  
  return AQI_COLOR_STOPS[AQI_COLOR_STOPS.length - 1].color;
}

export function aqiToHex(aqi: number): string {
  const rgb = aqiToRgb(aqi);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function aqiToRgbString(aqi: number, alpha: number = 1): string {
  const rgb = aqiToRgb(aqi);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function pm25ToHeight(pm25: number, minHeight: number = 0.3, maxHeight: number = 3): number {
  const clamped = Math.max(0, Math.min(300, pm25));
  const t = clamped / 300;
  return minHeight + (maxHeight - minHeight) * t;
}

export function getAqiLevel(aqi: number): string {
  if (aqi <= 50) return '优';
  if (aqi <= 100) return '良';
  if (aqi <= 150) return '轻度污染';
  if (aqi <= 200) return '中度污染';
  if (aqi <= 300) return '重度污染';
  return '严重污染';
}
