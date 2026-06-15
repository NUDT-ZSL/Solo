import { BuildingData } from '../types';

const GRID_SIZE = 30;
const CELL_SIZE = 5;

export function generateBuildings(
  density: number,
  maxHeight: number,
  greenRate: number
): BuildingData[] {
  const buildings: BuildingData[] = [];
  const gridCols = Math.floor(GRID_SIZE / CELL_SIZE);
  const gridRows = Math.floor(GRID_SIZE / CELL_SIZE);
  let idCounter = 0;

  const cells: { col: number; row: number }[] = [];
  for (let col = 0; col < gridCols; col++) {
    for (let row = 0; row < gridRows; row++) {
      cells.push({ col, row });
    }
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const buildingCount = Math.floor(cells.length * (density / 100));
  const greenCount = Math.floor(buildingCount * (greenRate / 100));

  for (let i = 0; i < buildingCount; i++) {
    const cell = cells[i];
    const baseX = (cell.col - gridCols / 2 + 0.5) * CELL_SIZE;
    const baseZ = (cell.row - gridRows / 2 + 0.5) * CELL_SIZE;

    const width = CELL_SIZE * (0.5 + Math.random() * 0.4);
    const depth = CELL_SIZE * (0.5 + Math.random() * 0.4);
    const height = 2 + Math.random() * (maxHeight - 2);

    buildings.push({
      id: idCounter++,
      x: baseX + (Math.random() - 0.5) * CELL_SIZE * 0.2,
      z: baseZ + (Math.random() - 0.5) * CELL_SIZE * 0.2,
      width,
      depth,
      height,
      isGreen: false
    });
  }

  for (let i = buildingCount; i < buildingCount + greenCount && i < cells.length; i++) {
    const cell = cells[i];
    const baseX = (cell.col - gridCols / 2 + 0.5) * CELL_SIZE;
    const baseZ = (cell.row - gridRows / 2 + 0.5) * CELL_SIZE;

    buildings.push({
      id: idCounter++,
      x: baseX,
      z: baseZ,
      width: CELL_SIZE * 0.8,
      depth: CELL_SIZE * 0.8,
      height: 0.1,
      isGreen: true
    });
  }

  return buildings;
}

export function generateDefaultBuildings(): BuildingData[] {
  return generateBuildings(60, 20, 20);
}

export function getGreenPlanes(buildings: BuildingData[]): BuildingData[] {
  return buildings.filter(b => b.isGreen).map(b => ({
    ...b,
    width: b.width * 1.8,
    depth: b.depth * 1.8,
    height: 0.05
  }));
}
