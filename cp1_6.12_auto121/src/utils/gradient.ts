import type { GradientConfig } from '../types';

export const generateGradientCSS = (config: GradientConfig): string => {
  const { startColor, endColor, type, angle } = config;
  
  switch (type) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`;
    case 'radial-circle':
      return `radial-gradient(circle, ${startColor}, ${endColor})`;
    case 'radial-ellipse':
      return `radial-gradient(ellipse, ${startColor}, ${endColor})`;
    default:
      return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`;
  }
};

export const generateFullCSSCode = (config: GradientConfig): string => {
  const gradient = generateGradientCSS(config);
  return `.gradient-bg {
  background: ${gradient};
  width: 100%;
  height: 100%;
}`;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const isGradientEqual = (a: GradientConfig, b: GradientConfig): boolean => {
  return (
    a.startColor.toLowerCase() === b.startColor.toLowerCase() &&
    a.endColor.toLowerCase() === b.endColor.toLowerCase() &&
    a.type === b.type &&
    a.angle === b.angle
  );
};
