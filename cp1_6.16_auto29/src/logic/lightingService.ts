import { LightingConfig, LightingResult } from '../types';

function kelvinToRGB(kelvin: number): string {
  const temp = kelvin / 100;
  let red: number, green: number, blue: number;

  if (temp <= 66) {
    red = 255;
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;

    if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    }
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);

    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);

    blue = 255;
  }

  const r = Math.max(0, Math.min(255, Math.round(red)));
  const g = Math.max(0, Math.min(255, Math.round(green)));
  const b = Math.max(0, Math.min(255, Math.round(blue)));

  return `rgb(${r}, ${g}, ${b})`;
}

export function calculateLighting(config: LightingConfig): LightingResult {
  const { temperature, ambientIntensity, backlightAngle } = config;

  const ambientColor = kelvinToRGB(temperature);
  const directionalColor = kelvinToRGB(temperature);

  const angleRad = (backlightAngle * Math.PI) / 180;
  const radius = 15;
  const lightHeight = 8;

  const directionalPosition: [number, number, number] = [
    Math.cos(angleRad) * radius,
    lightHeight,
    Math.sin(angleRad) * radius
  ];

  const pointLightColor = kelvinToRGB(temperature + 500);

  return {
    ambientColor,
    ambientIntensity: Math.max(0.1, Math.min(1, ambientIntensity * 0.6 + 0.2)),
    directionalColor,
    directionalIntensity: Math.max(0.3, Math.min(2, ambientIntensity * 1.2 + 0.5)),
    directionalPosition,
    pointLightColor,
    pointLightIntensity: Math.max(0.2, ambientIntensity * 0.8)
  };
}

export const LIGHT_PRESETS = {
  warm: {
    temperature: 2700,
    name: '暖白',
    description: '温馨舒适，适合古典艺术'
  },
  neutral: {
    temperature: 4000,
    name: '中性白',
    description: '自然均衡，适合摄影作品'
  },
  cool: {
    temperature: 6500,
    name: '冷白',
    description: '明亮清晰，适合现代艺术'
  }
};

export function getTemperatureColor(temperature: number): string {
  return kelvinToRGB(temperature);
}
