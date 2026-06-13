export interface GridConfig {
  type: 'grid';
  rows: number;
  columns: number;
  gap: number;
  justifyItems: 'start' | 'center' | 'end' | 'stretch';
  alignItems: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'stretch';
  alignContent: 'start' | 'center' | 'end' | 'stretch';
}

export interface FlexConfig {
  type: 'flex';
  direction: 'row' | 'column';
  wrap: 'nowrap' | 'wrap';
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  gap: number;
}

export type LayoutConfig = GridConfig | FlexConfig;

export const defaultGridConfig: GridConfig = {
  type: 'grid',
  rows: 3,
  columns: 4,
  gap: 10,
  justifyItems: 'stretch',
  alignItems: 'stretch',
  justifyContent: 'start',
  alignContent: 'start',
};

export const defaultFlexConfig: FlexConfig = {
  type: 'flex',
  direction: 'row',
  wrap: 'wrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  gap: 10,
};

export function generateGridStyles(config: GridConfig): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateRows: `repeat(${config.rows}, auto)`,
    gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
    gap: `${config.gap}px`,
    justifyItems: config.justifyItems,
    alignItems: config.alignItems,
    justifyContent: config.justifyContent,
    alignContent: config.alignContent,
    transition: 'all 0.3s ease',
  };
}

export function generateFlexStyles(config: FlexConfig): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: config.direction,
    flexWrap: config.wrap,
    justifyContent: config.justifyContent,
    alignItems: config.alignItems,
    gap: `${config.gap}px`,
    transition: 'all 0.3s ease',
  };
}

export function generateOverlayGrid(
  containerRect: DOMRect,
  config: GridConfig
): { lines: { x1: number; y1: number; x2: number; y2: number }[] } {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const { width, height } = containerRect;
  const { rows, columns, gap } = config;

  const totalGapX = (columns - 1) * gap;
  const totalGapY = (rows - 1) * gap;
  const cellWidth = (width - totalGapX) / columns;
  const cellHeight = (height - totalGapY) / rows;

  for (let i = 0; i <= columns; i++) {
    const x = i * (cellWidth + gap);
    lines.push({ x1: x, y1: 0, x2: x, y2: height });
  }

  for (let i = 0; i <= rows; i++) {
    const y = i * (cellHeight + gap);
    lines.push({ x1: 0, y1: y, x2: width, y2: y });
  }

  return { lines };
}

export function getLayoutStyle(config: LayoutConfig): React.CSSProperties {
  if (config.type === 'grid') {
    return generateGridStyles(config);
  }
  return generateFlexStyles(config);
}

export function generateRandomColors(count: number, minHueDiff: number = 30): string[] {
  const colors: string[] = [];
  const usedHues: number[] = [];

  for (let i = 0; i < count; i++) {
    let hue: number;
    let attempts = 0;
    do {
      hue = Math.floor(Math.random() * 360);
      attempts++;
    } while (
      attempts < 100 &&
      usedHues.some(h => Math.abs(h - hue) < minHueDiff && Math.abs(h - hue) > 360 - minHueDiff)
    );

    usedHues.push(hue);
    const saturation = 55 + Math.random() * 20;
    const lightness = 50 + Math.random() * 15;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  return colors;
}
