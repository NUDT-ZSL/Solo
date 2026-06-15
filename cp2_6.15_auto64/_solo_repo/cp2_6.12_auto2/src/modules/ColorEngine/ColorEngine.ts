import { RGB, lerpRgb } from '../../utils/helpers';

export type GradientType = 'horizontal' | 'diagonal' | 'radial';

export interface LevelConfig {
  id: number;
  name: string;
  type: GradientType;
  colors: [RGB, RGB] | [RGB, RGB, RGB];
  gridSize: number;
}

export interface CellDifference {
  row: number;
  col: number;
  difference: number;
}

interface XYZ {
  x: number;
  y: number;
  z: number;
}

interface LAB {
  l: number;
  a: number;
  b: number;
}

function rgbToXyz(rgb: RGB): XYZ {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  r *= 100;
  g *= 100;
  b *= 100;

  return {
    x: r * 0.4124 + g * 0.3576 + b * 0.1805,
    y: r * 0.2126 + g * 0.7152 + b * 0.0722,
    z: r * 0.0193 + g * 0.1192 + b * 0.9505,
  };
}

function xyzToLab(xyz: XYZ): LAB {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let x = xyz.x / refX;
  let y = xyz.y / refY;
  let z = xyz.z / refZ;

  const epsilon = 0.008856;
  const kappa = 903.3;

  const fx = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  const fy = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  const fz = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function rgbToLab(rgb: RGB): LAB {
  return xyzToLab(rgbToXyz(rgb));
}

function cie76Difference(lab1: LAB, lab2: LAB): number {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
      Math.pow(lab1.a - lab2.a, 2) +
      Math.pow(lab1.b - lab2.b, 2)
  );
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '水平渐变',
    type: 'horizontal',
    colors: [
      { r: 65, g: 105, b: 225 },
      { r: 148, g: 0, b: 211 },
    ],
    gridSize: 6,
  },
  {
    id: 2,
    name: '对角线渐变',
    type: 'diagonal',
    colors: [
      { r: 255, g: 69, b: 0 },
      { r: 255, g: 215, b: 0 },
      { r: 34, g: 139, b: 34 },
    ],
    gridSize: 6,
  },
  {
    id: 3,
    name: '放射状渐变',
    type: 'radial',
    colors: [
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 139 },
    ],
    gridSize: 6,
  },
];

const MAX_CIE76_DIFFERENCE = 100;

export class ColorEngine {
  generateTargetPattern(config: LevelConfig): RGB[][] {
    const { type, colors, gridSize } = config;
    const pattern: RGB[][] = [];

    for (let row = 0; row < gridSize; row++) {
      const rowColors: RGB[] = [];
      for (let col = 0; col < gridSize; col++) {
        rowColors.push(this.getColorAtPosition(type, colors, row, col, gridSize));
      }
      pattern.push(rowColors);
    }

    return pattern;
  }

  private getColorAtPosition(
    type: GradientType,
    colors: [RGB, RGB] | [RGB, RGB, RGB],
    row: number,
    col: number,
    gridSize: number
  ): RGB {
    switch (type) {
      case 'horizontal':
        return this.getHorizontalColor(colors as [RGB, RGB], col, gridSize);
      case 'diagonal':
        return this.getDiagonalColor(colors as [RGB, RGB, RGB], row, col, gridSize);
      case 'radial':
        return this.getRadialColor(colors as [RGB, RGB], row, col, gridSize);
      default:
        return colors[0];
    }
  }

  private getHorizontalColor(colors: [RGB, RGB], col: number, gridSize: number): RGB {
    const t = col / (gridSize - 1);
    return lerpRgb(colors[0], colors[1], t);
  }

  private getDiagonalColor(
    colors: [RGB, RGB, RGB],
    row: number,
    col: number,
    gridSize: number
  ): RGB {
    const maxIndex = (gridSize - 1) * 2;
    const t = (row + col) / maxIndex;

    if (t <= 0.5) {
      const localT = t * 2;
      return lerpRgb(colors[0], colors[1], localT);
    } else {
      const localT = (t - 0.5) * 2;
      return lerpRgb(colors[1], colors[2], localT);
    }
  }

  private getRadialColor(
    colors: [RGB, RGB],
    row: number,
    col: number,
    gridSize: number
  ): RGB {
    const center = (gridSize - 1) / 2;
    const maxDistance = Math.sqrt(Math.pow(center, 2) + Math.pow(center, 2));
    const distance = Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2));
    const t = distance / maxDistance;
    return lerpRgb(colors[0], colors[1], t);
  }

  calculateMatchPercentage(
    userGrid: (RGB | null)[][],
    targetGrid: RGB[][]
  ): number {
    let totalDifference = 0;
    let filledCells = 0;
    const gridSize = targetGrid.length;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const userColor = userGrid[row][col];
        if (userColor) {
          const targetColor = targetGrid[row][col];
          // CIE76标准色差，完全相同为0，最大可感知差异约为100
          const lab1 = rgbToLab(userColor);
          const lab2 = rgbToLab(targetColor);
          const diff = cie76Difference(lab1, lab2);
          totalDifference += diff;
          filledCells++;
        }
      }
    }

    if (filledCells === 0) return 0;

    const avgDifference = totalDifference / filledCells;
    const percentage = Math.max(0, 100 - (avgDifference / MAX_CIE76_DIFFERENCE) * 100);
    return Math.round(percentage);
  }

  calculateCellDifferences(
    userGrid: (RGB | null)[][],
    targetGrid: RGB[][]
  ): number[][] {
    const gridSize = targetGrid.length;
    const differences: number[][] = [];

    for (let row = 0; row < gridSize; row++) {
      const rowDiffs: number[] = [];
      for (let col = 0; col < gridSize; col++) {
        const userColor = userGrid[row][col];
        const targetColor = targetGrid[row][col];
        if (userColor) {
          // CIE76标准色差，完全相同为0，最大可感知差异约为100
          const lab1 = rgbToLab(userColor);
          const lab2 = rgbToLab(targetColor);
          rowDiffs.push(cie76Difference(lab1, lab2));
        } else {
          rowDiffs.push(MAX_CIE76_DIFFERENCE);
        }
      }
      differences.push(rowDiffs);
    }

    return differences;
  }

  findWorstMatchingCells(
    differences: number[][],
    count: number
  ): [number, number][] {
    const cellDiffs: CellDifference[] = [];

    for (let row = 0; row < differences.length; row++) {
      for (let col = 0; col < differences[row].length; col++) {
        cellDiffs.push({
          row,
          col,
          difference: differences[row][col],
        });
      }
    }

    cellDiffs.sort((a, b) => b.difference - a.difference);

    return cellDiffs.slice(0, count).map((cd) => [cd.row, cd.col]);
  }

  getColorLab(color: RGB) {
    return rgbToLab(color);
  }
}

export const colorEngine = new ColorEngine();
