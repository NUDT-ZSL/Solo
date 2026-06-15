export interface Vec2 {
  x: number;
  y: number;
}

export interface Fragment {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  bornAt: number;
  chainLevel: number;
}

export interface Bond {
  from: number;
  to: number;
}

export type AtomState = 'idle' | 'splitting' | 'split';

export class Atom {
  public id: number;
  public pos: Vec2;
  public basePos: Vec2;
  public radius: number;
  public color: string;
  public state: AtomState;
  public splitProgress: number;
  public splitScale: number;
  public chainLevel: number;
  public floatPhase: number;
  public energySymbol: string | null;
  public energySymbolTime: number;
  public shockwaveRadius: number;
  public shockwaveMaxRadius: number;
  public shockwaveActive: boolean;

  private static idCounter = 0;
  private static readonly ENERGY_SYMBOLS = ['⚡', '🔥', '✧', '✦', '★'];

  constructor(pos: Vec2, radius: number, color: string) {
    this.id = Atom.idCounter++;
    this.pos = { ...pos };
    this.basePos = { ...pos };
    this.radius = radius;
    this.color = color;
    this.state = 'idle';
    this.splitProgress = 0;
    this.splitScale = 1;
    this.chainLevel = 0;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.energySymbol = null;
    this.energySymbolTime = 0;
    this.shockwaveRadius = 0;
    this.shockwaveMaxRadius = 0;
    this.shockwaveActive = false;
  }

  public update(dt: number, _time: number): void {
    if (this.state === 'idle') {
      const amp = 3;
      const period = 2;
      this.floatPhase += dt;
      this.pos.x = this.basePos.x + Math.sin(this.floatPhase / period) * amp;
      this.pos.y = this.basePos.y + Math.cos(this.floatPhase / period * 0.7) * amp;
    } else if (this.state === 'splitting') {
      this.splitProgress += dt;
      const duration = 0.4;
      const t = Math.min(this.splitProgress / duration, 1);
      if (t < 0.3) {
        this.splitScale = 1 + (t / 0.3) * 0.5;
      } else {
        this.splitScale = 1.5 * (1 - (t - 0.3) / 0.7);
      }
      if (this.shockwaveActive) {
        this.shockwaveRadius += dt * (this.shockwaveMaxRadius / 0.3);
      }
      if (this.energySymbol) {
        this.energySymbolTime += dt;
      }
      if (t >= 1) {
        this.state = 'split';
      }
    }
  }

  public triggerSplit(chainLevel: number, extraRadius: number = 0): Fragment[] {
    if (this.state !== 'idle') return [];
    this.state = 'splitting';
    this.splitProgress = 0;
    this.chainLevel = chainLevel;
    this.shockwaveActive = true;
    this.shockwaveRadius = this.radius;
    this.shockwaveMaxRadius = this.radius * 4 + extraRadius;
    this.energySymbol = Atom.ENERGY_SYMBOLS[Math.floor(Math.random() * Atom.ENERGY_SYMBOLS.length)];
    this.energySymbolTime = 0;

    const fragmentCount = 4 + Math.floor(Math.random() * 3);
    const fragments: Fragment[] = [];
    const baseSpeed = 50 + Math.random() * 50;

    for (let i = 0; i < fragmentCount; i++) {
      const angle = (i / fragmentCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = baseSpeed * (0.7 + Math.random() * 0.6);
      fragments.push({
        id: Atom.idCounter++,
        pos: { x: this.pos.x, y: this.pos.y },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        radius: this.radius * 0.25,
        color: this.color,
        life: 0.5,
        maxLife: 0.5,
        bornAt: performance.now(),
        chainLevel: chainLevel
      });
    }
    return fragments;
  }

  public isAlive(): boolean {
    return this.state !== 'split';
  }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function generateMolecularStructure(width: number, height: number): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const totalAtoms = 80 + Math.floor(Math.random() * 71);

  const clusterCount = 5 + Math.floor(Math.random() * 4);
  const atomsPerCluster = Math.floor(totalAtoms / clusterCount);

  const margin = 80;
  const warmColor = '#FF4500';
  const coolColor = '#1E90FF';

  for (let c = 0; c < clusterCount; c++) {
    const cx = margin + Math.random() * (width - margin * 2);
    const cy = margin + Math.random() * (height - margin * 2);
    const clusterAtoms = atomsPerCluster + (c === clusterCount - 1 ? totalAtoms - atomsPerCluster * clusterCount : 0);

    const hexSpacing = 45 + Math.random() * 20;
    const rows = Math.ceil(Math.sqrt(clusterAtoms));
    let placed = 0;
    const clusterAtomIds: number[] = [];

    for (let row = 0; row < rows && placed < clusterAtoms; row++) {
      const cols = Math.ceil((clusterAtoms - placed) / rows) + 1;
      for (let col = 0; col < cols && placed < clusterAtoms; col++) {
        const offsetX = (row % 2 === 0 ? 0 : hexSpacing * 0.5);
        const jitterX = (Math.random() - 0.5) * 15;
        const jitterY = (Math.random() - 0.5) * 15;
        const x = cx + (col - cols / 2) * hexSpacing + offsetX + jitterX;
        const y = cy + (row - rows / 2) * hexSpacing * 0.866 + jitterY;

        if (x < 20 || x > width - 20 || y < 20 || y > height - 20) continue;

        const radius = 8 + Math.random() * 12;
        const colorT = Math.random();
        const color = lerpColor(warmColor, coolColor, colorT);

        const atom = new Atom({ x, y }, radius, color);
        atoms.push(atom);
        clusterAtomIds.push(atom.id);
        placed++;
      }
    }

    const connectionDistance = hexSpacing * 1.6;
    for (let i = 0; i < clusterAtomIds.length; i++) {
      const a = atoms.find(atom => atom.id === clusterAtomIds[i]);
      if (!a) continue;
      for (let j = i + 1; j < clusterAtomIds.length; j++) {
        const b = atoms.find(atom => atom.id === clusterAtomIds[j]);
        if (!b) continue;
        const dx = a.basePos.x - b.basePos.x;
        const dy = a.basePos.y - b.basePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDistance && Math.random() < 0.6) {
          bonds.push({ from: a.id, to: b.id });
        }
      }
    }
  }

  return { atoms, bonds };
}

export { lerpColor };
