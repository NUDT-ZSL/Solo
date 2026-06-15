export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'floating' | 'wall';
  hasSpikes: boolean;
}

export interface Trap {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'fire' | 'void';
  damage: number;
  active: boolean;
  timer: number;
  interval: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: 'crawler' | 'flyer' | 'brute';
  facingRight: boolean;
  attackCooldown: number;
  hitFlash: number;
  patrolLeft: number;
  patrolRight: number;
  animFrame: number;
  animTimer: number;
  alive: boolean;
  fragmentValue: number;
}

export interface FragmentDrop {
  x: number;
  y: number;
  vy: number;
  value: number;
  lifetime: number;
  collected: boolean;
  glowPhase: number;
}

export interface ExitPortal {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  phase: number;
}

export interface DungeonLevel {
  platforms: Platform[];
  traps: Trap[];
  enemies: Enemy[];
  fragments: FragmentDrop[];
  exitPortal: ExitPortal;
  levelWidth: number;
  levelHeight: number;
  backgroundLayers: BackgroundLayer[];
}

export interface BackgroundLayer {
  speed: number;
  elements: BackgroundElement[];
}

export interface BackgroundElement {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'pillar' | 'arch' | 'chain' | 'skull' | 'rune';
  opacity: number;
  glowColor: string;
}

const LEVEL_WIDTH = 3200;
const LEVEL_HEIGHT = 800;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

export class DungeonGenerator {
  private seed: number;
  private level: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.level = 1;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  private randRange(min: number, max: number): number {
    return min + this.seededRandom() * (max - min);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.randRange(min, max + 1));
  }

  setLevel(level: number): void {
    this.level = level;
    this.seed = (Date.now() * level + 7919) % 2147483647;
  }

  generate(): DungeonLevel {
    const platforms: Platform[] = [];
    const traps: Trap[] = [];
    const enemies: Enemy[] = [];
    const backgroundLayers: BackgroundLayer[] = [];

    platforms.push({
      x: 0,
      y: LEVEL_HEIGHT - 40,
      width: LEVEL_WIDTH,
      height: 40,
      type: 'ground',
      hasSpikes: false,
    });

    const platformCount = 12 + this.level * 3;
    for (let i = 0; i < platformCount; i++) {
      const pw = this.randRange(120, 320);
      const px = this.randRange(100, LEVEL_WIDTH - pw - 100);
      const py = this.randRange(250, LEVEL_HEIGHT - 120);
      const hasSpikes = this.seededRandom() < 0.15;
      platforms.push({
        x: px,
        y: py,
        width: pw,
        height: 20,
        type: 'floating',
        hasSpikes,
      });
    }

    for (let x = 0; x < LEVEL_WIDTH; x += this.randRange(600, 1200)) {
      if (this.seededRandom() < 0.4) {
        const wallH = this.randRange(150, 400);
        platforms.push({
          x,
          y: LEVEL_HEIGHT - 40 - wallH,
          width: 30,
          height: wallH,
          type: 'wall',
          hasSpikes: false,
        });
      }
    }

    const trapCount = 4 + this.level * 2;
    for (let i = 0; i < trapCount; i++) {
      const tx = this.randRange(200, LEVEL_WIDTH - 200);
      const trapType = (['spike', 'fire', 'void'] as const)[this.randInt(0, 2)];
      const tw = trapType === 'spike' ? 60 : trapType === 'fire' ? 40 : 80;
      const th = trapType === 'spike' ? 20 : 30;
      traps.push({
        x: tx,
        y: LEVEL_HEIGHT - 40 - th,
        width: tw,
        height: th,
        type: trapType,
        damage: trapType === 'spike' ? 10 : trapType === 'fire' ? 15 : 20,
        active: true,
        timer: this.seededRandom() * 3,
        interval: trapType === 'fire' ? 2.5 : 3.5,
      });
    }

    const enemyCount = 5 + this.level * 2;
    for (let i = 0; i < enemyCount; i++) {
      const et = (['crawler', 'flyer', 'brute'] as const)[this.randInt(0, 2)];
      const ex = this.randRange(300, LEVEL_WIDTH - 200);
      const ey = et === 'flyer' ? this.randRange(150, LEVEL_HEIGHT - 250) : LEVEL_HEIGHT - 40 - (et === 'brute' ? 70 : 50);
      const ew = et === 'brute' ? 50 : 36;
      const eh = et === 'brute' ? 70 : et === 'flyer' ? 36 : 50;
      const hpMul = 1 + (this.level - 1) * 0.3;
      const baseHp = et === 'brute' ? 80 : et === 'flyer' ? 30 : 40;
      enemies.push({
        x: ex,
        y: ey,
        width: ew,
        height: eh,
        vx: et === 'crawler' ? this.randRange(-60, -30) : 0,
        vy: 0,
        hp: Math.round(baseHp * hpMul),
        maxHp: Math.round(baseHp * hpMul),
        type: et,
        facingRight: this.seededRandom() > 0.5,
        attackCooldown: this.randRange(1, 3),
        hitFlash: 0,
        patrolLeft: ex - this.randRange(80, 200),
        patrolRight: ex + this.randRange(80, 200),
        animFrame: 0,
        animTimer: 0,
        alive: true,
        fragmentValue: et === 'brute' ? 5 : et === 'flyer' ? 2 : 3,
      });
    }

    const bgLayer: BackgroundLayer = { speed: 0.3, elements: [] };
    for (let x = 0; x < LEVEL_WIDTH; x += this.randRange(200, 500)) {
      const elType = (['pillar', 'arch', 'chain', 'skull', 'rune'] as const)[this.randInt(0, 4)];
      bgLayer.elements.push({
        x,
        y: this.randRange(50, LEVEL_HEIGHT - 200),
        width: elType === 'pillar' ? 60 : elType === 'arch' ? 120 : 40,
        height: elType === 'pillar' ? 300 : elType === 'arch' ? 180 : 40,
        type: elType,
        opacity: this.randRange(0.05, 0.2),
        glowColor: this.seededRandom() > 0.5 ? 'rgba(120,40,180,0.3)' : 'rgba(160,30,50,0.3)',
      });
    }
    backgroundLayers.push(bgLayer);

    const exitPortal: ExitPortal = {
      x: LEVEL_WIDTH - 150,
      y: LEVEL_HEIGHT - 40 - 80,
      width: 60,
      height: 80,
      active: true,
      phase: 0,
    };

    return {
      platforms,
      traps,
      enemies,
      fragments: [],
      exitPortal,
      levelWidth: LEVEL_WIDTH,
      levelHeight: LEVEL_HEIGHT,
      backgroundLayers,
    };
  }
}
