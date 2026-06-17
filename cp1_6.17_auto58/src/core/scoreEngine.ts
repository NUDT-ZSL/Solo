import type { BoardElement, ScoreResult, ElementItem } from '../types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function sRGBtoLinear(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const R = sRGBtoLinear(r);
  const G = sRGBtoLinear(g);
  const B = sRGBtoLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getPrimaryColor(elements: BoardElement[], elementMap: Map<string, ElementItem>): string | null {
  for (const el of elements) {
    const item = elementMap.get(el.elementId);
    if (item && item.category === 'primaryColor') {
      return item.value;
    }
  }
  return null;
}

function getSecondaryColor(elements: BoardElement[], elementMap: Map<string, ElementItem>): string | null {
  for (const el of elements) {
    const item = elementMap.get(el.elementId);
    if (item && item.category === 'secondaryColor') {
      return item.value;
    }
  }
  return null;
}

function getUniqueFontCount(elements: BoardElement[], elementMap: Map<string, ElementItem>): number {
  const fontIds = new Set<string>();
  for (const el of elements) {
    const item = elementMap.get(el.elementId);
    if (item && item.category === 'font') {
      fontIds.add(item.id);
    }
  }
  return fontIds.size;
}

function calculateCoverageRatio(
  elements: BoardElement[],
  canvasWidth: number,
  canvasHeight: number
): number {
  if (canvasWidth <= 0 || canvasHeight <= 0) return 0;

  let totalArea = 0;
  for (const el of elements) {
    const scaledWidth = el.width * el.scale;
    const scaledHeight = el.height * el.scale;
    const rotation = el.rotation || 0;

    if (rotation === 0) {
      totalArea += scaledWidth * scaledHeight;
    } else {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const bboxWidth = scaledWidth * cos + scaledHeight * sin;
      const bboxHeight = scaledWidth * sin + scaledHeight * cos;
      totalArea += bboxWidth * bboxHeight;
    }
  }

  const canvasArea = canvasWidth * canvasHeight;
  return Math.min(totalArea / canvasArea, 1);
}

export function calculateScore(
  elements: BoardElement[],
  elementMap: Map<string, ElementItem>,
  canvasWidth: number,
  canvasHeight: number
): ScoreResult {
  const primaryColor = getPrimaryColor(elements, elementMap);
  const secondaryColor = getSecondaryColor(elements, elementMap);

  let contrastScore = 0;
  if (primaryColor && secondaryColor) {
    const ratio = getContrastRatio(primaryColor, secondaryColor);
    if (ratio >= 4.5) {
      contrastScore = 20;
    } else if (ratio >= 3) {
      contrastScore = Math.round(10 + ((ratio - 3) / 1.5) * 10);
    } else {
      contrastScore = Math.round((ratio / 3) * 10);
    }
  } else if (primaryColor || secondaryColor) {
    contrastScore = 8;
  }

  const fontCount = getUniqueFontCount(elements, elementMap);
  let fontScore = 0;
  if (fontCount === 0) {
    fontScore = 5;
  } else if (fontCount <= 3) {
    fontScore = 15;
  } else if (fontCount <= 5) {
    fontScore = 8;
  } else {
    fontScore = 3;
  }

  const coverageRatio = calculateCoverageRatio(elements, canvasWidth, canvasHeight);
  let densityScore = 0;
  if (coverageRatio === 0) {
    densityScore = 0;
  } else if (coverageRatio >= 0.3 && coverageRatio <= 0.6) {
    densityScore = 30;
  } else if (coverageRatio < 0.3) {
    densityScore = Math.round((coverageRatio / 0.3) * 25);
  } else if (coverageRatio > 0.6 && coverageRatio <= 1) {
    densityScore = Math.round(((1 - coverageRatio) / 0.4) * 25);
  }

  const categories = new Set<string>();
  for (const el of elements) {
    const item = elementMap.get(el.elementId);
    if (item) {
      categories.add(item.category);
    }
  }
  const varietyScore = Math.min(categories.size * 6, 35);

  const total = Math.min(contrastScore + fontScore + densityScore + varietyScore, 100);

  return {
    total,
    contrast: contrastScore,
    fontCount: fontScore,
    density: densityScore,
  };
}
