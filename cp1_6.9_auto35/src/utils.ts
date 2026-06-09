import type { EmotionBlock, ExpressionFeatures } from './types';
import { COLOR_WEIGHTS } from './constants';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
};

export const fuseColors = (blocks: EmotionBlock[]): string => {
  if (blocks.length === 0) return '#333333';
  if (blocks.length === 1) return blocks[0].color;

  let r = 0,
    g = 0,
    b = 0;

  blocks.slice(0, COLOR_WEIGHTS.length).forEach((block, index) => {
    const rgb = hexToRgb(block.color);
    const weight = COLOR_WEIGHTS[index] ?? 0.1;
    r += rgb.r * weight;
    g += rgb.g * weight;
    b += rgb.b * weight;
  });

  return rgbToHex(r, g, b);
};

export const generateExpression = (blockIds: string[]): ExpressionFeatures => {
  const hasAnger = blockIds.includes('anger');
  const hasCalm = blockIds.includes('calm');
  const hasJoy = blockIds.includes('joy');
  const hasMelancholy = blockIds.includes('melancholy');
  const hasFear = blockIds.includes('fear');
  const hasSurprise = blockIds.includes('surprise');

  let eyeShape: ExpressionFeatures['eyeShape'] = 'normal';
  let mouthShape: ExpressionFeatures['mouthShape'] = 'neutral';

  if (hasAnger && hasCalm) {
    eyeShape = 'squint';
    mouthShape = 'neutral';
  } else if (hasAnger && hasJoy) {
    eyeShape = 'angry';
    mouthShape = 'smile';
  } else if (hasMelancholy && hasJoy) {
    eyeShape = 'crying';
    mouthShape = 'smile';
  } else if (hasFear && hasSurprise) {
    eyeShape = 'surprised';
    mouthShape = 'open';
  } else if (hasAnger) {
    eyeShape = 'angry';
    mouthShape = 'frown';
  } else if (hasCalm) {
    eyeShape = 'sleepy';
    mouthShape = 'smile';
  } else if (hasJoy) {
    eyeShape = 'normal';
    mouthShape = 'smile';
  } else if (hasMelancholy) {
    eyeShape = 'crying';
    mouthShape = 'frown';
  } else if (hasFear) {
    eyeShape = 'squint';
    mouthShape = 'pout';
  } else if (hasSurprise) {
    eyeShape = 'surprised';
    mouthShape = 'open';
  }

  const count = blockIds.length;
  if (count >= 3) {
    mouthShape = 'tongue';
  }

  return { eyeShape, mouthShape };
};

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
