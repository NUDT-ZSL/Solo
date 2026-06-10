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
  pixelScale: number;
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
const BASE_PIXEL = 5;
const PIXEL_GAP = 1;
export const CHAR_SPACING = 14;
export const LINE_SPACING = 22;
export const GRID_COLS_CONST = GRID_COLS;
export const GRID_ROWS_CONST = GRID_ROWS;
export const PIXEL_GAP_CONST = PIXEL_GAP;
export const PIXEL_SIZE_CONST = BASE_PIXEL;

export function getCharCellSize(pixelSize: number): { w: number; h: number } {
  return {
    w: GRID_COLS * (pixelSize + PIXEL_GAP) - PIXEL_GAP,
    h: GRID_ROWS * (pixelSize + PIXEL_GAP) - PIXEL_GAP,
  };
}

const SPECIAL_PRESETS: Record<string, string> = {
  '月': '...XX.....|..XXXX....|.XXXXXX...|XXXXXXXX..|.XXXXXX...|..XXXX....|...XX.....|...XX.....|...XX.....|...XX.....|...XX.....|...XX.....|..XXXX....|.XXXXXX...|XXXXXXXX..|..........',
  '画': 'XXXXXXXXXX|X........X|X..XXXX..X|X.X....X.X|X.X....X.X|X..XXXX..X|X........X|X..XXXX..X|X.X....X.X|X.X....X.X|X.X....X.X|X..XXXX..X|X........X|XXXXXXXXXX|..........|..........',
  '像': 'XX...X....|X.X..X....|X..X.X....|X..X.X....|XX...XXX..|X.X..X.X..|X..X.X.X..|X..X.X.X..|XX...X.X..|X.X..X.X..|X.X..X.X..|X..X.X....|X..X.X....|XX...X....|..........|..........',
  '8': '...XXXX...|..XXXXXX..|.XX....XX.|.XX....XX.|..XXXXXX..|...XXXX...|..XXXXXX..|.XX....XX.|.XX....XX.|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........|..........',
  'S': '...XXXXX..|..XXXXXXX.|.XXXXXXX..|XX........|XX........|.XXXXXX...|......XXX.|......XXX.|........XX|..XXXXXXX.|.XXXXXXXX.|XXXXXX....|..........|..........|..........|..........',
  'A': '....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|XXXXXXXXXX|XX......XX|XX......XX|XX......XX|XX......XX|..........|..........|..........|..........|..........|..........',
  'B': 'XXXXXXX...|XX....XX..|XX.....XX.|XX.....XX.|XXXXXXX...|XX.....XX.|XX.....XX.|XX.....XX.|XXXXXXX...|..........|..........|..........|..........|..........|..........|..........',
  'C': '..XXXXXX..|.XX....XX.|XX........|XX........|XX........|XX........|XX........|XX........|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........|..........',
  'D': 'XXXXXXX...|XX....XX..|XX.....XX.|XX.....XX.|XX.....XX.|XX.....XX.|XX.....XX.|XX.....XX.|XX....XX..|XXXXXXX...|..........|..........|..........|..........|..........|..........',
  'E': 'XXXXXXXXX.|XX........|XX........|XX........|XXXXXX....|XX........|XX........|XX........|XX........|XXXXXXXXX.|..........|..........|..........|..........|..........',
  'F': 'XXXXXXXXX.|XX........|XX........|XX........|XXXXXX....|XX........|XX........|XX........|XX........|XX........|..........|..........|..........|..........|..........',
  'G': '..XXXXXX..|.XX....XX.|XX........|XX........|XX..XXXXXX|XX......XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  'H': 'XX......XX|XX......XX|XX......XX|XX......XX|XXXXXXXXXX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|..........|..........|..........|..........|..........',
  'I': '..XXXXXX..|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|..XXXXXX..|..........|..........|..........|..........|..........',
  'J': '........XX|........XX|........XX|........XX|........XX|........XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  'K': 'XX.....XX.|XX....XX..|XX...XX...|XX..XX....|XX.XX.....|XXXX......|XX.XX.....|XX..XX....|XX...XX...|XX....XX..|..........|..........|..........|..........|..........',
  'L': 'XX........|XX........|XX........|XX........|XX........|XX........|XX........|XX........|XX........|XXXXXXXXX.|..........|..........|..........|..........|..........',
  'M': 'XX......XX|XXX....XXX|XX.XXXX.XX|XX..XX..XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|..........|..........|..........|..........|..........',
  'N': 'XX......XX|XXX.....XX|XXXX....XX|XX.XX...XX|XX..XX..XX|XX...XX.XX|XX....XXXX|XX.....XXX|XX......XX|XX......XX|..........|..........|..........|..........|..........',
  'O': '...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........|..........',
  'P': 'XXXXXXX...|XX....XX..|XX.....XX.|XX.....XX.|XXXXXXX...|XX........|XX........|XX........|XX........|XX........|..........|..........|..........|..........|..........',
  'Q': '...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX......XX|XX......XX|XX..XX..XX|XX...XX.XX|.XX....XX.|..XXXXXX..|.....XX...|..........|..........|..........|..........',
  'R': 'XXXXXXX...|XX....XX..|XX.....XX.|XX.....XX.|XXXXXXX...|XX..XX....|XX...XX...|XX....XX..|XX.....XX.|XX......XX|..........|..........|..........|..........|..........',
  'T': 'XXXXXXXXXX|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|..........|..........|..........|..........|..........',
  'U': 'XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  'V': 'XX......XX|XX......XX|XX......XX|XX......XX|XX......XX|.XX....XX.|.XX....XX.|..XX..XX..|...XXXX...|....XX....|..........|..........|..........|..........|..........',
  'W': 'XX......XX|XX......XX|XX......XX|XX......XX|XX..XX..XX|XX..XX..XX|XX.XXXX.XX|XXX....XXX|XX......XX|XX......XX|..........|..........|..........|..........|..........',
  'X': 'XX......XX|.XX....XX.|..XX..XX..|...XXXX...|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|XX......XX|XX......XX|..........|..........|..........|..........|..........',
  'Y': 'XX......XX|.XX....XX.|..XX..XX..|...XXXX...|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|..........|..........|..........|..........|..........',
  'Z': 'XXXXXXXXXX|.......XX.|......XX..|.....XX...|....XX....|...XX.....|..XX......|.XX.......|XX........|XXXXXXXXXX|..........|..........|..........|..........|..........',
  '0': '...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX..XX..XX|XX..XX..XX|XX..XX..XX|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........|..........',
  '1': '....XX....|...XXX....|..XXXX....|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|..XXXXXX..|..........|..........|..........|..........|..........',
  '2': '..XXXXXX..|.XX....XX.|.......XX.|......XX..|.....XX...|....XX....|...XX.....|..XX......|.XX.......|XXXXXXXXXX|..........|..........|..........|..........|..........',
  '3': 'XXXXXXXXXX|.......XX.|......XX..|.....XX...|..XXXX....|.....XX...|......XX..|.......XX.|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  '4': '......XX..|.....XXX..|....XXXX..|...XX.XX..|..XX..XX..|.XX...XX..|XX....XX..|XXXXXXXXXX|......XX..|......XX..|..........|..........|..........|..........|..........',
  '5': 'XXXXXXXXXX|XX........|XX........|XX........|XXXXXXX...|.......XX.|.......XX.|.......XX.|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  '6': '...XXXX...|..XX......|.XX.......|XX........|XX.XXXXXX.|XX......XX|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|..........|..........|..........|..........|..........',
  '7': 'XXXXXXXXXX|........XX|.......XX.|......XX..|.....XX...|....XX....|...XX.....|..XX......|.XX.......|XX........|..........|..........|..........|..........|..........',
  '9': '..XXXXXX..|.XX....XX.|XX......XX|XX......XX|XX......XX|.XXXXXXXX.|.......XX.|......XX..|.....XX...|.XXXX.....|..........|..........|..........|..........|..........',
  '中': '....XX....|....XX....|XXXXXXXXXX|....XX....|....XX....|XXXXXXXXXX|....XX....|....XX....|....XX....|....XX....|....XX....|....XX....|XXXXXXXXXX|..........|..........|..........',
  '文': 'XX......XX|.XX....XX.|..XX..XX..|...XXXX...|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|..........|..........|..........|..........|..........|..........',
  '字': 'XXXXXXXXXX|........XX|......XX..|....XX....|..XX......|XXXXXXXXXX|........XX|......XX..|....XX....|XX..XX..XX|.XX.XX.XX.|..........|..........|..........|..........',
  '人': '....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|..........|..........|..........|..........|..........|..........',
  '大': 'XXXXXXXXXX|....XX....|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|....XX....|...XXXX...|..XX..XX..|..........|..........|..........|..........|..........',
  '家': '..XX......|.XXXX.....|..XX......|XXXXXXXXXX|....XX....|...XXXX...|..XXXXXX..|.XX....XX.|XX......XX|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........',
  '好': 'XX...XX...|X.X..X.X..|X..X.X..X.|X..X.X..X.|XX...XXXXX|X.X....X..|X..X...X..|X..X...X..|XX...X.X..|X.X....X..|X..X...X..|X..X....X.|XX...X...X|..........|..........',
  '我': 'XXXXXXXXX.|X........X|X..XXXX..X|X..X..X..X|XXXXXXXXXX|X..XXXX..X|X..X..X..X|X..X..X..X|X..XXXX..X|X......X.X|..........|..........|..........|..........|..........',
  '爱': '...XXXX...|..XXXXXX..|.XX....XX.|XX.XXXX.XX|XX.XXXX.XX|.XXXXXXXX.|..XXXXXX..|.XX....XX.|XX......XX|X........X|..........|..........|..........|..........|..........',
  '你': 'XX...XX...|X.X..X.X..|X..X.X..X.|X..X.X..X.|XX...XXXXX|X.X..X....|X..X.X....|X..X.XX...|XX...X.X..|X.X..X..X.|X..X.X...X|X..XX....X|XX...X...X|..........|..........',
  '国': 'XXXXXXXXXX|X........X|X..XXXX..X|X.X....X.X|X.X.XX.X.X|X.X.XX.X.X|X.X....X.X|X..XXXX..X|X........X|XXXXXXXXXX|..........|..........|..........|..........|..........',
  '天': 'XXXXXXXXXX|....XX....|....XX....|...XXXX...|..XX..XX..|.XX....XX.|XX......XX|....XX....|...XXXX...|..XXXXXX..|..........|..........|..........|..........|..........',
  '下': '..XXXXXXX.|.....XX...|....XX....|...XX.....|..XX......|.XX.......|XX........|.XX.......|..XXXXXXXX|..........|..........|..........|..........|..........|..........',
  '亮': '...XX.....|..XXXX....|.XX..XX...|XX....XX..|XXXXXXXX..|XX....XX..|XX....XX..|.XXXXXX...|.XX..XX...|XX....XX..|.XXXXXX...|XX....XX..|XX....XX..|..........|..........',
  '素': 'XXXXXXXXXX|........X.|......XX..|....XX....|..XX......|XXXXXXXXXX|..XX..XX..|.XX....XX.|XX......XX|.XX....XX.|..XXXXXX..|...XXXX...|..........|..........|..........',
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

function setPixel(map: Uint8Array, r: number, c: number, v: number = 1): void {
  if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
    map[r * GRID_COLS + c] = v;
  }
}

function drawHStroke(map: Uint8Array, r: number, c1: number, c2: number, thickness: number = 1): void {
  const cs = Math.min(c1, c2);
  const ce = Math.max(c1, c2);
  for (let c = cs; c <= ce; c++) {
    for (let t = 0; t < thickness; t++) {
      setPixel(map, r + t, c);
    }
  }
}

function drawVStroke(map: Uint8Array, c: number, r1: number, r2: number, thickness: number = 1): void {
  const rs = Math.min(r1, r2);
  const re = Math.max(r1, r2);
  for (let r = rs; r <= re; r++) {
    for (let t = 0; t < thickness; t++) {
      setPixel(map, r, c + t);
    }
  }
}

function drawDiagonal(map: Uint8Array, r1: number, c1: number, r2: number, c2: number): void {
  const dr = Math.abs(r2 - r1);
  const dc = Math.abs(c2 - c1);
  const steps = Math.max(dr, dc);
  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 0 : s / steps;
    const r = Math.round(r1 + (r2 - r1) * t);
    const c = Math.round(c1 + (c2 - c1) * t);
    setPixel(map, r, c);
  }
}

function drawDotPattern(map: Uint8Array, rand: () => number, density: number): void {
  for (let r = 1; r < GRID_ROWS - 1; r++) {
    for (let c = 1; c < GRID_COLS - 1; c++) {
      if (rand() < density) {
        setPixel(map, r, c);
      }
    }
  }
}

function generateDynamicMap(charCode: number): Uint8Array {
  const map = new Uint8Array(GRID_COLS * GRID_ROWS);
  const rand = seededRandom(charCode * 2654435761 + 0x9e3779b1);

  if (charCode >= 0x4e00 && charCode <= 0x9fff) {
    const codeOffset = charCode - 0x4e00;
    const strokeCount = 3 + (codeOffset % 8);
    const style = codeOffset % 5;

    drawHStroke(map, 1, 1, 8, 1);
    drawHStroke(map, 14, 1, 8, 1);
    drawVStroke(map, 1, 1, 14, 1);
    drawVStroke(map, 8, 1, 14, 1);

    for (let i = 0; i < strokeCount; i++) {
      const rType = Math.floor(rand() * 4);
      if (rType === 0) {
        const r = 2 + Math.floor(rand() * 12);
        const c1 = 2 + Math.floor(rand() * 3);
        const c2 = c1 + 2 + Math.floor(rand() * 4);
        drawHStroke(map, r, c1, Math.min(c2, 7));
      } else if (rType === 1) {
        const c = 2 + Math.floor(rand() * 5);
        const r1 = 2 + Math.floor(rand() * 4);
        const r2 = r1 + 3 + Math.floor(rand() * 6);
        drawVStroke(map, c, r1, Math.min(r2, 13));
      } else if (rType === 2) {
        const r1 = 2 + Math.floor(rand() * 5);
        const r2 = r1 + 3 + Math.floor(rand() * 8);
        const c1 = 2 + Math.floor(rand() * 3);
        const c2 = 4 + Math.floor(rand() * 4);
        drawDiagonal(map, r1, c1, Math.min(r2, 13), Math.min(c2, 7));
      } else {
        const r1 = 2 + Math.floor(rand() * 5);
        const r2 = r1 + 3 + Math.floor(rand() * 8);
        const c1 = 5 + Math.floor(rand() * 3);
        const c2 = 1 + Math.floor(rand() * 4);
        drawDiagonal(map, r1, c1, Math.min(r2, 13), Math.max(c2, 1));
      }
    }

    if (style === 0) {
      drawHStroke(map, 7, 3, 6);
    } else if (style === 1) {
      drawVStroke(map, 4, 3, 12);
      drawVStroke(map, 5, 3, 12);
    } else if (style === 2) {
      const cx = 4 + Math.floor(rand() * 2);
      const cy = 7 + Math.floor(rand() * 2);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= 1.8) setPixel(map, cy + dy, cx + dx, 0);
        }
      }
    } else if (style === 3) {
      drawHStroke(map, 4, 2, 7);
      drawHStroke(map, 10, 2, 7);
      drawVStroke(map, 4, 4, 10);
      drawVStroke(map, 5, 4, 10);
    } else {
      drawDiagonal(map, 2, 2, 13, 7);
      drawDiagonal(map, 2, 7, 13, 2);
    }

    drawDotPattern(map, rand, 0.06);
  } else if (charCode >= 65 && charCode <= 90) {
    const letterOffset = charCode - 65;
    const hasTop = letterOffset % 3 !== 2;
    const hasMid = letterOffset % 2 === 0;
    const hasBot = letterOffset % 4 !== 1;
    const hasLeft = letterOffset % 5 !== 3;
    const hasRight = letterOffset % 7 !== 4;
    const hasDiag1 = letterOffset % 11 === 0 || letterOffset % 13 === 0;
    const hasDiag2 = letterOffset % 17 === 0;

    if (hasTop) drawHStroke(map, 1, 2, 7, 1);
    if (hasMid) drawHStroke(map, 8, 2, 7, 1);
    if (hasBot) drawHStroke(map, 12, 1, 8, 1);
    if (hasLeft) drawVStroke(map, 2, 1, 12, 1);
    if (hasRight) drawVStroke(map, 7, 1, 12, 1);
    if (hasDiag1) drawDiagonal(map, 2, 1, 12, 8);
    if (hasDiag2) drawDiagonal(map, 2, 8, 12, 1);

    const style = letterOffset % 4;
    if (style === 0) {
      for (let r = 3; r < 12; r += 3) {
        for (let c = 3; c < 7; c++) {
          if (rand() < 0.35) setPixel(map, r, c);
        }
      }
    } else if (style === 1) {
      drawVStroke(map, 4, 4, 11);
      drawVStroke(map, 5, 4, 11);
    }
  } else if (charCode >= 97 && charCode <= 122) {
    const letterOffset = charCode - 97;
    const r1 = 4 + (letterOffset % 3);
    const r2 = 12 - (letterOffset % 2);
    const c1 = 2 + (letterOffset % 4);
    const c2 = 7 - (letterOffset % 3);

    drawHStroke(map, r1, c1, c2);
    drawHStroke(map, r2, c1, c2);
    drawVStroke(map, c1, r1, r2);
    drawVStroke(map, c2, r1, r2);

    if (letterOffset % 2 === 0) {
      drawVStroke(map, (c1 + c2) >> 1, r1, r2);
    }
    if (letterOffset % 3 === 0) {
      drawHStroke(map, (r1 + r2) >> 1, c1, c2);
    }
    if (letterOffset % 5 === 0) {
      drawDiagonal(map, r1, c1, r2, c2);
    }
  } else if (charCode >= 48 && charCode <= 57) {
    const digit = charCode - 48;
    const digitShapes: number[][] = [
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [5, 6, 7, 8, 12, 13],
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17],
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17],
      [3, 4, 5, 8, 9, 10, 11, 12, 13, 16, 17],
      [1, 2, 3, 4, 5, 10, 11, 12, 13, 16, 17],
      [1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 16, 17],
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 13, 14],
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17],
    ];
    const segments = digitShapes[digit] || digitShapes[0];
    const segMap: Record<number, () => void> = {
      1: () => drawHStroke(map, 2, 3, 6),
      2: () => drawHStroke(map, 2, 3, 6),
      3: () => drawVStroke(map, 7, 2, 7),
      4: () => drawVStroke(map, 7, 2, 7),
      5: () => drawVStroke(map, 7, 9, 14),
      6: () => drawVStroke(map, 7, 9, 14),
      7: () => drawHStroke(map, 14, 3, 6),
      8: () => drawHStroke(map, 14, 3, 6),
      9: () => drawVStroke(map, 2, 9, 14),
      10: () => drawVStroke(map, 2, 9, 14),
      11: () => drawVStroke(map, 2, 2, 7),
      12: () => drawVStroke(map, 2, 2, 7),
      13: () => drawHStroke(map, 8, 3, 6),
      14: () => drawHStroke(map, 8, 3, 6),
      15: () => { for (let r = 3; r <= 7; r++) setPixel(map, r, 4); },
      16: () => drawHStroke(map, 2, 3, 6),
      17: () => drawHStroke(map, 14, 3, 6),
    };
    segments.forEach(s => segMap[s] && segMap[s]());
  } else {
    const pattern = (charCode * 7) % 8;
    if (pattern === 0) {
      for (let r = 3; r < 13; r++) {
        for (let c = 2; c < 8; c++) {
          if (((r + c + charCode) & 1) === 0) setPixel(map, r, c);
        }
      }
    } else if (pattern === 1) {
      drawDiagonal(map, 3, 2, 13, 7);
      drawDiagonal(map, 3, 7, 13, 2);
    } else if (pattern === 2) {
      const cx = 5, cy = 8;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= 2.5 && d <= 4) setPixel(map, cy + dy, cx + dx);
        }
      }
    } else {
      for (let r = 4; r < 12; r++) {
        for (let c = 2; c < 8; c++) {
          const v = Math.sin(charCode * (r + 1) * 0.5 + c * 0.7) + 0.5;
          if (v > 0.55) setPixel(map, r, c);
        }
      }
    }
  }

  let hasPixel = false;
  for (let i = 0; i < map.length; i++) {
    if (map[i]) { hasPixel = true; break; }
  }
  if (!hasPixel) {
    drawHStroke(map, 7, 2, 7);
    drawVStroke(map, 4, 4, 11);
    drawVStroke(map, 5, 4, 11);
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
  pixelSize: number = BASE_PIXEL
): HTMLCanvasElement {
  const { w, h } = getCharCellSize(pixelSize);
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

export function computeOptimalScale(
  charCount: number,
  canvasWidth: number,
  canvasHeight: number,
  paddingX: number = 40,
  paddingY: number = 40,
  maxPerRow: number = 10
): number {
  const availableW = canvasWidth - paddingX * 2;
  const availableH = canvasHeight - paddingY * 2;

  for (let scale = 7; scale >= 3; scale--) {
    const { w: cellW, h: cellH } = getCharCellSize(scale);
    const charW = cellW + CHAR_SPACING;
    const perRow = Math.min(maxPerRow, Math.max(1, Math.floor((availableW + CHAR_SPACING) / charW)));
    const rows = Math.ceil(charCount / perRow);
    const totalW = perRow * cellW + (perRow - 1) * CHAR_SPACING;
    const totalH = rows * cellH + (rows - 1) * LINE_SPACING;
    if (totalW <= availableW && totalH <= availableH) {
      return scale;
    }
  }
  return 3;
}

export function layoutChars(
  chars: string,
  canvasWidth: number,
  pixelSize: number,
  paddingX: number = 40,
  maxPerRow: number = 10
): Array<{ baseX: number; baseY: number; row: number }> {
  const results: Array<{ baseX: number; baseY: number; row: number }> = [];
  const { w: cellW, h: cellH } = getCharCellSize(pixelSize);
  const availableW = canvasWidth - paddingX * 2;
  const charW = cellW + CHAR_SPACING;
  const perRow = Math.min(maxPerRow, Math.max(1, Math.floor((availableW + CHAR_SPACING) / charW)));

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
    const rowWidth = charsInRow * cellW + (charsInRow - 1) * CHAR_SPACING;
    const startX = paddingX + (availableW - rowWidth) / 2;
    const x = startX + col * charW;
    const y = paddingTop + row * (cellH + LINE_SPACING);
    results.push({ baseX: x, baseY: y, row });
    col++;
  }
  return results;
}

export function getTotalRows(
  charsLen: number,
  canvasWidth: number,
  pixelSize: number,
  paddingX: number = 40,
  maxPerRow: number = 10
): number {
  const { w: cellW } = getCharCellSize(pixelSize);
  const availableW = canvasWidth - paddingX * 2;
  const charW = cellW + CHAR_SPACING;
  const perRow = Math.min(maxPerRow, Math.max(1, Math.floor((availableW + CHAR_SPACING) / charW)));
  return Math.ceil(charsLen / perRow);
}

export const BASE_PIXEL_SIZE = BASE_PIXEL;
