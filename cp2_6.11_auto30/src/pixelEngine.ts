export interface PixelChar {
  char: string;
  charCode: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  pixelMap: Uint8Array;
  color: string;
  glowStartTime: number;
  pulseStartTime: number;
  offscreenCanvas: HTMLCanvasElement | null;
  charWidth: number;
  charHeight: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'triangle';
  rotation: number;
  rotationSpeed: number;
}

const GRID_COLS = 10;
const GRID_ROWS = 16;
const PIXEL_SIZE = 5;
const PIXEL_GAP = 1;
export const CHAR_CELL_W = GRID_COLS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;
export const CHAR_CELL_H = GRID_ROWS * (PIXEL_SIZE + PIXEL_GAP) - PIXEL_GAP;
export const CHAR_SPACING = 12;
export const LINE_SPACING = 20;
export const PIXEL_SIZE_CONST = PIXEL_SIZE;
export const PIXEL_GAP_CONST = PIXEL_GAP;
export const GRID_COLS_CONST = GRID_COLS;
export const GRID_ROWS_CONST = GRID_ROWS;

const SPECIAL_PRESETS: Record<string, string> = {
  '月': '...XX.....|..XXXX....|.XXXXXX...|XXXXXXXX..|.XXXXXX...|..XXXX....|...XX.....|...XX.....|...XX.....|...XX.....|...XX.....|...XX.....|..XXXX....|.XXXXXX...|XXXXXXXX..|..........',
  '画': 'XXXXXXXXXX|X........X|X..XXXX..X|X.X....X.X|X.X....X.X|X..XXXX..X|X........X|X..XXXX..X|X.X....X.X|X.X....X.X|X.X....X.X|X..XXXX..X|X........X|XXXXXXXXXX|..........|..........',
  '像': 'XX...X....|X.X..X....|X..X.X....|X..X.X....|XX...XXX..|X.X..X.X..|X..X.X.X..|X..X.X.X..|XX...X.X..|X.X..X.X..|X.X..X.X..|X..X.X....|X..X.X....|XX...X....|..........|..........',
  '8': '...XXXX...|..XXXXXX..|.XX....XX.|.XX....XX.|..XXXXXX..|...XXXX...|..XXXXXX..|.XX....XX.|.XX....XX.|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........|..........',
  'S': '...XXXXX..|..XXXXXXX.|.XXXXXXX..|XX........|XX........|.XXXXXX...|......XXX.|......XXX.|........XX|..XXXXXXX.|.XXXXXXXX|.XXXXXX...|..........|..........|..........|..........',
  'A': '....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|XXXXXXXXXX|XX......XX|XX......XX|XX......XX|XX......XX|..........|..........|..........|..........|..........|..........',
  'B': 'XXXXXXX...|XX....XX..|XX.....XX.|XX.....XX.|XXXXXXX...|XX.....XX.|XX.....XX.|XX.....XX.|XXXXXXX...|..........|..........|..........|..........|..........|..........|..........',
  'C': '..XXXXXX..|.XX....XX.|XX........|XX........|XX........|XX........|XX........|XX........|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........|..........',
  '0': '...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........|..........',
  '1': '....XX....|...XXX....|..XXXX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|..XXXXXX..|..........|..........|..........|..........|..........|..........',
  '中': '....XX....|....XX....|XXXXXXXXXX|....XX....|....XX....|XXXXXXXXXX|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|XXXXXXXXXX|..........|..........|..........',
  '文': 'XX......XX|.XX....XX.|..XX..XX..|...XXXX...|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|..........|..........|..........|..........|..........|..........',
  '字': 'XXXXXXXXXX|.......XX..|.....XX....|...XX......|.XXXXXXXXXX|.......XX..|.....XX....|...XX......|.XX.XX.XX..|XX..XX..XX.|..........|..........|..........|..........|..........',
  '人': '....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|..........|..........|..........|..........|..........|..........',
  '大': 'XXXXXXXXXX|....XX....|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|....XX....|...XXXX...|..XX..XX..|..........|..........|..........|..........|..........',
  '家': '..XX......|.XXXX.....|..XX......|XXXXXXXXXX|....XX....|...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........',
  '好': 'XX...XX...|X.X..X.X..|X..X.X..X.|X..X.X..X.|XX...XXXXX|X.X....X..|X..X...X..|X..X...X..|XX...X.X..|X.X....X..|X..X...X..|X..X....X.|XX...X...X|..........|..........',
  '我': 'XXXXXXXXX.|X........X|X..XXXX..X|X..X..X..X|XXXXXXXXXX|X..XXXX..X|X..X..X..X|X..X..X..X|X..XXXX..X|X......X.X|..........|..........|..........|..........|..........|..........',
  '爱': '...XXXX...|..XXXXXX..|.XX....XX.|XX.XXXX.XX|XX.XXXX.XX|.XXXXXXXX.|..XXXXXX..|.XX....XX.|XX......XX|X........X|..........|..........|..........|..........|..........|..........',
  '你': 'XX...XX...|X.X..X.X..|X..X.X..X.|X..X.X..X.|XX...XXXXX|X.X..X....|X..X.X....|X..X.XX...|XX...X.X..|X.X..X..X.|X..X.X...X|X..XX....X|XX...X...X|..........|..........',
  '国': 'XXXXXXXXXX|X........X|X..XXXX..X|X.X....X.X|X.X.XX.X.X|X.X.XX.X.X|X.X....X.X|X..XXXX..X|X........X|XXXXXXXXXX|..........|..........|..........|..........|..........|..........',
  '天': 'XXXXXXXXXX|....XX....|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|....XX....|...XXXX...|..XXXXXX..|..........|..........|..........|..........|..........',
  '下': '..XXXXXXX.|.....XX...|....XX....|...XX.....|..XX......|.XX.......|XX........|.XX.......|..XXXXXXXX|..........|..........|..........|..........|..........|..........',
};

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function presetToMap(presetStr: string): Uint8Array {
  const map = new Uint8Array(GRID_COLS * GRID_ROWS);
  const rows = presetStr.split('|');
  for (let r = 0; r < GRID_ROWS; r++) {
    const row = rows[r] || '';
    for (let c = 0; c < GRID_COLS; c++) {
      const ch = row[c] || '.';
      map[r * GRID_COLS + c] = (ch === 'X' || ch === 'x') ? 1 : 0;
    }
  }
  return map;
}

function generateDynamicMap(charCode: number): Uint8Array {
  const map = new Uint8Array(GRID_COLS * GRID_ROWS);
  const rand = seededRandom(charCode * 2654435761);

  if (charCode >= 0x4e00 && charCode <= 0x9fff) {
    for (let r = 2; r < GRID_ROWS - 2; r++) {
      for (let c = 1; c < GRID_COLS - 1; c++) {
        const pattern = rand() > 0.55;
        const edge = (c === 1 || c === GRID_COLS - 2 || r === 2 || r === GRID_ROWS - 3);
        if (pattern || (edge && rand() > 0.3)) {
          map[r * GRID_COLS + c] = 1;
        }
      }
    }
    const cx = 4 + Math.floor(rand() * 2);
    const cy = 7 + Math.floor(rand() * 2);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2.8 && rand() > 0.2) {
          const r = cy + dy;
          const c = cx + dx;
          if (r >= 3 && r < GRID_ROWS - 3 && c >= 2 && c < GRID_COLS - 2) {
            map[r * GRID_COLS + c] = 0;
          }
        }
      }
    }
  } else if (charCode >= 65 && charCode <= 90) {
    const style = Math.floor(rand() * 3);
    if (style === 0) {
      for (let r = 1; r < 12; r++) {
        map[r * GRID_COLS + 1] = 1;
        map[r * GRID_COLS + 8] = 1;
      }
      for (let c = 2; c < 8; c++) {
        map[1 * GRID_COLS + c] = 1;
        map[6 * GRID_COLS + c] = 1;
        map[11 * GRID_COLS + c] = 1;
      }
    } else if (style === 1) {
      for (let r = 1; r < 12; r++) {
        map[r * GRID_COLS + 2] = 1;
        if (r < 7) {
          map[r * GRID_COLS + 7] = 1;
        } else {
          map[r * GRID_COLS + (3 + (charCode % 4))] = 1;
        }
      }
      for (let c = 3; c < 7; c++) {
        map[1 * GRID_COLS + c] = 1;
        map[11 * GRID_COLS + c] = 1;
        map[6 * GRID_COLS + c] = 1;
      }
    } else {
      for (let r = 1; r < 12; r++) {
        for (let c = 1; c < 9; c++) {
          const edge = (c === 1 || c === 8 || r === 1 || r === 11);
          const pattern = ((r + c + charCode) % 3 === 0);
          if (edge || (pattern && rand() > 0.5)) {
            map[r * GRID_COLS + c] = 1;
          }
        }
      }
    }
  } else if (charCode >= 97 && charCode <= 122) {
    for (let r = 4; r < 13; r++) {
      map[r * GRID_COLS + 2] = 1;
      map[r * GRID_COLS + 7] = 1;
    }
    for (let c = 3; c < 7; c++) {
      map[4 * GRID_COLS + c] = 1;
      map[12 * GRID_COLS + c] = 1;
      if ((charCode + c) % 2 === 0) {
        map[8 * GRID_COLS + c] = 1;
      }
    }
    if (charCode % 3 === 0) {
      for (let r = 4; r < 9; r++) {
        map[r * GRID_COLS + 7] = 0;
      }
    }
  } else if (charCode >= 48 && charCode <= 57) {
    const digit = charCode - 48;
    for (let r = 2; r < 13; r++) {
      for (let c = 2; c < 8; c++) {
        const edge = (c === 2 || c === 7 || r === 2 || r === 12);
        const mid = (r === 7 || r === 8);
        if (digit === 0 && mid) continue;
        if (digit === 1 && c !== 6 && c !== 7) continue;
        if (digit === 7 && r > 4 && c !== 6 && c !== 7) continue;
        if (edge) map[r * GRID_COLS + c] = 1;
        if (digit === 8 && mid) map[r * GRID_COLS + c] = 1;
        if ((digit === 4 || digit === 9) && (r === 7 || r === 8)) {
          map[r * GRID_COLS + c] = 1;
        }
      }
    }
  } else {
    for (let r = 4; r < 12; r++) {
      for (let c = 2; c < 8; c++) {
        const v = Math.sin(charCode * (r + 1) * 0.5) + 0.5;
        if (v > 0.5) map[r * GRID_COLS + c] = 1;
      }
    }
  }

  return map;
}

export function getPixelMap(charCode: number, charStr: string): Uint8Array {
  if (SPECIAL_PRESETS[charStr]) {
    return presetToMap(SPECIAL_PRESETS[charStr]);
  }
  return generateDynamicMap(charCode);
}

export function renderCharToOffscreen(
  pixelMap: Uint8Array,
  color: string,
  pixelSize: number = PIXEL_SIZE
): HTMLCanvasElement {
  const w = GRID_COLS * (pixelSize + PIXEL_GAP) - PIXEL_GAP;
  const h = GRID_ROWS * (pixelSize + PIXEL_GAP) - PIXEL_GAP;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (pixelMap[r * GRID_COLS + c]) {
        const x = c * (pixelSize + PIXEL_GAP);
        const y = r * (pixelSize + PIXEL_GAP);
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
  }
  return canvas;
}

export function layoutChars(
  chars: string,
  canvasWidth: number,
  paddingX: number = 40
): Array<{ baseX: number; baseY: number; row: number }> {
  const results: Array<{ baseX: number; baseY: number; row: number }> = [];
  const availableW = canvasWidth - paddingX * 2;
  const charW = CHAR_CELL_W + CHAR_SPACING;
  const perRow = Math.max(1, Math.floor((availableW + CHAR_SPACING) / charW));
  let row = 0;
  let col = 0;
  const paddingTop = 40;
  for (let i = 0; i < chars.length; i++) {
    if (col >= perRow) {
      col = 0;
      row++;
    }
    const rowStartIdx = row * perRow;
    const rowEndIdx = Math.min(rowStartIdx + perRow, chars.length);
    const charsInRow = rowEndIdx - rowStartIdx;
    const rowWidth = charsInRow * CHAR_CELL_W + (charsInRow - 1) * CHAR_SPACING;
    const startX = paddingX + (availableW - rowWidth) / 2;
    const x = startX + col * charW;
    const y = paddingTop + row * (CHAR_CELL_H + LINE_SPACING);
    results.push({ baseX: x, baseY: y, row });
    col++;
  }
  return results;
}

export function getTotalRows(
  charsLen: number,
  canvasWidth: number,
  paddingX: number = 40
): number {
  const availableW = canvasWidth - paddingX * 2;
  const charW = CHAR_CELL_W + CHAR_SPACING;
  const perRow = Math.max(1, Math.floor((availableW + CHAR_SPACING) / charW));
  return Math.ceil(charsLen / perRow);
}
