import { RGB, shuffleArray, generateId } from '../../utils/helpers';
import { colorEngine, LevelConfig } from './ColorEngine';

export interface PaletteItem {
  id: string;
  color: RGB;
  isUsed: boolean;
  isDragging: boolean;
  originalIndex: number;
}

export class PaletteGenerator {
  private static readonly AVAILABLE_COUNT = 24;
  private static readonly TOTAL_COUNT = 36;

  generatePalette(config: LevelConfig): PaletteItem[] {
    const targetPattern = colorEngine.generateTargetPattern(config);
    const allColors: RGB[] = [];

    for (let row = 0; row < targetPattern.length; row++) {
      for (let col = 0; col < targetPattern[row].length; col++) {
        allColors.push(targetPattern[row][col]);
      }
    }

    const selectedIndices = this.selectColors(allColors);
    const paletteItems: PaletteItem[] = selectedIndices.map((index, i) => ({
      id: generateId(),
      color: allColors[index],
      isUsed: false,
      isDragging: false,
      originalIndex: i,
    }));

    return shuffleArray(paletteItems);
  }

  private selectColors(colors: RGB[]): number[] {
    const totalCount = colors.length;
    const availableCount = Math.min(
      PaletteGenerator.AVAILABLE_COUNT,
      totalCount - 1
    );

    const indices: number[] = [];
    const keyPositions = this.getKeyPositions(totalCount);

    keyPositions.forEach((pos) => {
      if (!indices.includes(pos)) {
        indices.push(pos);
      }
    });

    const remaining = Array.from({ length: totalCount }, (_, i) => i).filter(
      (i) => !indices.includes(i)
    );

    const shuffledRemaining = shuffleArray(remaining);
    const needed = availableCount - indices.length;

    for (let i = 0; i < needed && i < shuffledRemaining.length; i++) {
      indices.push(shuffledRemaining[i]);
    }

    return indices;
  }

  private getKeyPositions(totalCount: number): number[] {
    const gridSize = Math.sqrt(totalCount);
    const positions: number[] = [];

    positions.push(0);
    positions.push(gridSize - 1);
    positions.push(totalCount - gridSize);
    positions.push(totalCount - 1);

    const center = Math.floor(gridSize / 2);
    positions.push(center * gridSize + center);

    for (let i = 0; i < gridSize; i++) {
      positions.push(i);
      positions.push((gridSize - 1) * gridSize + i);
      positions.push(i * gridSize);
      positions.push(i * gridSize + (gridSize - 1));
    }

    return [...new Set(positions)];
  }

  resetPalette(palette: PaletteItem[]): PaletteItem[] {
    return palette.map((item) => ({
      ...item,
      isUsed: false,
      isDragging: false,
    }));
  }

  markAsUsed(palette: PaletteItem[], itemId: string): PaletteItem[] {
    return palette.map((item) =>
      item.id === itemId ? { ...item, isUsed: true } : item
    );
  }

  markAsUnused(palette: PaletteItem[], itemId: string): PaletteItem[] {
    return palette.map((item) =>
      item.id === itemId ? { ...item, isUsed: false } : item
    );
  }

  setDragging(palette: PaletteItem[], itemId: string, isDragging: boolean): PaletteItem[] {
    return palette.map((item) =>
      item.id === itemId ? { ...item, isDragging } : item
    );
  }

  getAvailableCount(): number {
    return PaletteGenerator.AVAILABLE_COUNT;
  }

  getTotalCount(): number {
    return PaletteGenerator.TOTAL_COUNT;
  }
}

export const paletteGenerator = new PaletteGenerator();
