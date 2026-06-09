export type DigitMatrix = boolean[][];

export const DIGIT_MATRICES: Record<string, DigitMatrix> = {
  '0': [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  '1': [
    [false, false, true, false, false],
    [false, true, true, false, false],
    [true, false, true, false, false],
    [false, false, true, false, false],
    [false, false, true, false, false],
    [false, false, true, false, false],
    [true, true, true, true, true],
  ],
  '2': [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [false, false, false, false, true],
    [false, false, false, true, false],
    [false, false, true, false, false],
    [false, true, false, false, false],
    [true, true, true, true, true],
  ],
  '3': [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [false, false, false, false, true],
    [false, false, true, true, false],
    [false, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  '4': [
    [false, false, false, true, false],
    [false, false, true, true, false],
    [false, true, false, true, false],
    [true, false, false, true, false],
    [true, true, true, true, true],
    [false, false, false, true, false],
    [false, false, false, true, false],
  ],
  '5': [
    [true, true, true, true, true],
    [true, false, false, false, false],
    [true, true, true, true, false],
    [false, false, false, false, true],
    [false, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  '6': [
    [false, true, true, true, false],
    [true, false, false, false, false],
    [true, true, true, true, false],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  '7': [
    [true, true, true, true, true],
    [false, false, false, false, true],
    [false, false, false, true, false],
    [false, false, true, false, false],
    [false, true, false, false, false],
    [false, true, false, false, false],
    [false, true, false, false, false],
  ],
  '8': [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  '9': [
    [false, true, true, true, false],
    [true, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, true],
    [false, false, false, false, true],
    [true, false, false, false, true],
    [false, true, true, true, false],
  ],
  ':': [
    [false, false, false, false, false],
    [false, false, true, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, true, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ],
};

export const MATRIX_ROWS = 7;
export const MATRIX_COLS = 5;

export interface ParticlePosition {
  x: number;
  y: number;
}

export function generateParticlePositions(
  digit: string,
  baseX: number,
  baseY: number,
  cellSize: number,
  particlesPerCell: number = 2
): ParticlePosition[] {
  const matrix = DIGIT_MATRICES[digit];
  if (!matrix) return [];

  const positions: ParticlePosition[] = [];

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col]) {
        for (let p = 0; p < particlesPerCell; p++) {
          const offsetX = (Math.random() - 0.5) * cellSize * 0.8;
          const offsetY = (Math.random() - 0.5) * cellSize * 0.8;
          positions.push({
            x: baseX + col * cellSize + cellSize / 2 + offsetX,
            y: baseY + row * cellSize + cellSize / 2 + offsetY,
          });
        }
      }
    }
  }

  return positions;
}

export function getDigitParticleCount(digit: string): number {
  const matrix = DIGIT_MATRICES[digit];
  if (!matrix) return 0;
  let count = 0;
  for (const row of matrix) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count * 2;
}
