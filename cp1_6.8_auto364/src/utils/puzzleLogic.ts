export interface FragmentData {
  id: number;
  gridX: number;
  gridY: number;
  rotation: number;
  correctRotation: number;
  isLocked: boolean;
  edges: [boolean, boolean, boolean, boolean];
  runePaths: RunePath[];
  glowColor: string;
  pulsePhase: number;
}

export interface RunePath {
  points: [number, number][];
  lineWidth: number;
  color: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  gridSize: number;
  fragmentSize: number;
  energyCost: number;
  maxEnergy: number;
  energyRegenRate: number;
  bgPattern: string;
  fragments: FragmentData[];
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface PulseLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
}

const BAGUA_NAMES = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑'];
const RUNE_COLORS = ['#c8a44e', '#d4a84b', '#b8923f', '#e6c36a', '#a07830', '#dbb558'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateRunePaths(gridSize: number, gx: number, gy: number, seed: number): RunePath[] {
  const rand = seededRandom(seed);
  const paths: RunePath[] = [];
  const numPaths = 2 + Math.floor(rand() * 3);

  for (let i = 0; i < numPaths; i++) {
    const pts: [number, number][] = [];
    const startX = 0.15 + rand() * 0.7;
    const startY = 0.15 + rand() * 0.7;
    pts.push([startX, startY]);

    const segCount = 2 + Math.floor(rand() * 4);
    for (let j = 0; j < segCount; j++) {
      const last = pts[pts.length - 1];
      const dx = (rand() - 0.5) * 0.4;
      const dy = (rand() - 0.5) * 0.4;
      const nx = Math.max(0.05, Math.min(0.95, last[0] + dx));
      const ny = Math.max(0.05, Math.min(0.95, last[1] + dy));
      pts.push([nx, ny]);
    }

    const isCenter = gx === Math.floor(gridSize / 2) && gy === Math.floor(gridSize / 2);
    paths.push({
      points: pts,
      lineWidth: isCenter ? 3 : 2,
      color: RUNE_COLORS[Math.floor(rand() * RUNE_COLORS.length)],
    });
  }

  if (gridSize >= 3) {
    const cx = 0.5;
    const cy = 0.5;
    const r = 0.15 + rand() * 0.1;
    const circlePts: [number, number][] = [];
    for (let a = 0; a <= Math.PI * 2; a += Math.PI / 8) {
      circlePts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    circlePts.push(circlePts[0]);
    paths.push({
      points: circlePts,
      lineWidth: 1.5,
      color: '#e6c36a',
    });
  }

  return paths;
}

function generateEdges(gridSize: number, gx: number, gy: number, rand: () => number): [boolean, boolean, boolean, boolean] {
  const top = gy > 0 ? rand() > 0.3 : false;
  const right = gx < gridSize - 1 ? rand() > 0.3 : false;
  const bottom = gy < gridSize - 1 ? rand() > 0.3 : false;
  const left = gx > 0 ? rand() > 0.3 : false;
  return [top, right, bottom, left];
}

function generateLevel(levelId: number): LevelConfig {
  const rand = seededRandom(levelId * 7919);
  const configs = [
    { gridSize: 2, name: '初章·乾坤', desc: '天地初开，乾坤始定', energyCost: 8, maxEnergy: 100, regenRate: 5 },
    { gridSize: 3, name: '贰章·坎离', desc: '水火相济，阴阳调和', energyCost: 10, maxEnergy: 120, regenRate: 4 },
    { gridSize: 3, name: '叁章·震巽', desc: '风雷激荡，万象更新', energyCost: 12, maxEnergy: 140, regenRate: 4 },
    { gridSize: 4, name: '肆章·艮兑', desc: '山泽通气，万物化生', energyCost: 15, maxEnergy: 160, regenRate: 3 },
    { gridSize: 4, name: '终章·太极', desc: '阴阳交替，太极归一', energyCost: 18, maxEnergy: 180, regenRate: 3 },
  ];

  const cfg = configs[Math.min(levelId - 1, configs.length - 1)];
  const gs = cfg.gridSize;
  const fragSize = Math.max(80, Math.floor(360 / gs));
  const fragments: FragmentData[] = [];

  for (let gy = 0; gy < gs; gy++) {
    for (let gx = 0; gx < gs; gx++) {
      const idx = gy * gs + gx;
      const edges = generateEdges(gs, gx, gy, rand);
      const correctRot = Math.floor(rand() * 4) * 90;
      const initRot = correctRot + (1 + Math.floor(rand() * 3)) * 90;

      fragments.push({
        id: idx,
        gridX: gx,
        gridY: gy,
        rotation: initRot,
        correctRotation: correctRot,
        isLocked: false,
        edges,
        runePaths: generateRunePaths(gs, gx, gy, levelId * 1000 + idx),
        glowColor: RUNE_COLORS[Math.floor(rand() * RUNE_COLORS.length)],
        pulsePhase: rand() * Math.PI * 2,
      });
    }
  }

  return {
    id: levelId,
    name: cfg.name,
    gridSize: gs,
    fragmentSize: fragSize,
    energyCost: cfg.energyCost,
    maxEnergy: cfg.maxEnergy,
    energyRegenRate: cfg.regenRate,
    bgPattern: BAGUA_NAMES[(levelId - 1) % BAGUA_NAMES.length],
    fragments,
    description: cfg.desc,
  };
}

export function getLevelConfig(levelId: number): LevelConfig {
  return generateLevel(levelId);
}

export function isFragmentCorrect(fragment: FragmentData): boolean {
  const normalizedRot = ((fragment.rotation % 360) + 360) % 360;
  const normalizedCorrect = ((fragment.correctRotation % 360) + 360) % 360;
  return normalizedRot === normalizedCorrect;
}

export function checkAllFragmentsCorrect(fragments: FragmentData[]): boolean {
  return fragments.every(f => f.isLocked || isFragmentCorrect(f));
}

export function rotateFragment(fragment: FragmentData, degrees: number): FragmentData {
  if (fragment.isLocked) return fragment;
  return {
    ...fragment,
    rotation: (fragment.rotation + degrees) % 360,
  };
}

export function lockFragment(fragment: FragmentData): FragmentData {
  return { ...fragment, isLocked: true };
}

export function findHintFragment(fragments: FragmentData[]): number | null {
  for (let i = 0; i < fragments.length; i++) {
    if (!fragments[i].isLocked && !isFragmentCorrect(fragments[i])) {
      return i;
    }
  }
  for (let i = 0; i < fragments.length; i++) {
    if (!fragments[i].isLocked) {
      return i;
    }
  }
  return null;
}

export function getAdjacentLockedFragments(
  fragment: FragmentData,
  fragments: FragmentData[],
  gridSize: number
): FragmentData[] {
  const adj: FragmentData[] = [];
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = fragment.gridX + dx;
    const ny = fragment.gridY + dy;
    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
      const neighbor = fragments.find(f => f.gridX === nx && f.gridY === ny);
      if (neighbor && neighbor.isLocked) {
        adj.push(neighbor);
      }
    }
  }
  return adj;
}

export function createGoldParticles(cx: number, cy: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#ffd700' : '#e6c36a',
      alpha: 1,
    });
  }
  return particles;
}

export function createPulseLine(
  x1: number, y1: number,
  x2: number, y2: number
): PulseLine {
  return {
    x1, y1, x2, y2,
    life: 1,
    maxLife: 0.8,
    color: '#ffd700',
  };
}

export function createCompletionParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 3,
      life: 1,
      maxLife: 1 + Math.random() * 1.5,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.3 ? '#ffd700' : '#ff8c00',
      alpha: 1,
    });
  }
  return particles;
}

export const TOTAL_LEVELS = 5;
