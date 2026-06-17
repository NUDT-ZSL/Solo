import type { BoardElement, ScoreResult, ElementItem } from '../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function calculateScore(
  elements: BoardElement[],
  elementMap: Map<string, ElementItem>,
  canvasWidth: number,
  canvasHeight: number
): ScoreResult {
  const colorElements: ElementItem[] = [];
  const fontElements: ElementItem[] = [];
  let totalArea = 0;

  elements.forEach((el) => {
    const item = elementMap.get(el.elementId);
    if (!item) return;
    if (item.category === 'primaryColor' || item.category === 'secondaryColor') {
      colorElements.push(item);
    }
    if (item.category === 'font') {
      fontElements.push(item);
    }
    totalArea += el.width * el.scale * el.height * el.scale;
  });

  let contrastScore = 0;
  if (colorElements.length >= 2) {
    const primary = colorElements.find((c) => c.category === 'primaryColor');
    const secondary = colorElements.find((c) => c.category === 'secondaryColor');
    if (primary && secondary) {
      const ratio = getContrastRatio(primary.value, secondary.value);
      if (ratio >= 4.5) {
        contrastScore = 20;
      } else if (ratio >= 3) {
        contrastScore = Math.round((ratio / 4.5) * 20);
      } else {
        contrastScore = Math.round((ratio / 3) * 10);
      }
    } else {
      contrastScore = 10;
    }
  } else if (colorElements.length === 1) {
    contrastScore = 8;
  }

  const uniqueFonts = new Set(fontElements.map((f) => f.id)).size;
  let fontScore = 0;
  if (uniqueFonts === 0) {
    fontScore = 5;
  } else if (uniqueFonts <= 3) {
    fontScore = 15;
  } else if (uniqueFonts <= 5) {
    fontScore = 10;
  } else {
    fontScore = 5;
  }

  const canvasArea = canvasWidth * canvasHeight;
  const coverageRatio = totalArea / canvasArea;
  let densityScore = 0;
  if (coverageRatio >= 0.3 && coverageRatio <= 0.6) {
    densityScore = 30;
  } else if (coverageRatio > 0 && coverageRatio < 0.3) {
    densityScore = Math.round((coverageRatio / 0.3) * 25);
  } else if (coverageRatio > 0.6 && coverageRatio <= 1) {
    densityScore = Math.round(((1 - coverageRatio) / 0.4) * 25);
  }

  const varietyBonus = Math.min(
    new Set(elements.map((e) => elementMap.get(e.elementId)?.category).filter(Boolean)).size * 5,
    35
  );

  const total = Math.min(contrastScore + fontScore + densityScore + varietyBonus, 100);

  return {
    total,
    contrast: contrastScore,
    fontCount: fontScore,
    density: densityScore,
  };
}
