export interface GridConfig {
  spacing: number;
  threshold: number;
  lineWidth: number;
  opacity: number;
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  spacing: 20,
  threshold: 15,
  lineWidth: 0.5,
  opacity: 0.3,
};

export function snapToGrid(
  x: number,
  y: number,
  config: GridConfig = DEFAULT_GRID_CONFIG
): { x: number; y: number; snapped: boolean } {
  const { spacing, threshold } = config;

  const gridX = Math.round(x / spacing) * spacing;
  const gridY = Math.round(y / spacing) * spacing;

  const distanceX = Math.abs(x - gridX);
  const distanceY = Math.abs(y - gridY);

  const snapped = distanceX <= threshold && distanceY <= threshold;

  return {
    x: snapped ? gridX : x,
    y: snapped ? gridY : y,
    snapped,
  };
}

export function generateGridLines(
  width: number,
  height: number,
  config: GridConfig = DEFAULT_GRID_CONFIG
): { vertical: number[]; horizontal: number[] } {
  const { spacing } = config;
  const vertical: number[] = [];
  const horizontal: number[] = [];

  for (let x = 0; x <= width; x += spacing) {
    vertical.push(x);
  }

  for (let y = 0; y <= height; y += spacing) {
    horizontal.push(y);
  }

  return { vertical, horizontal };
}
