let atomIdCounter = 0;
let fragmentIdCounter = 0;

export interface FragmentData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  createdAt: number;
  chainLevel: number;
}

export interface Bond {
  from: number;
  to: number;
  distance: number;
}

type AtomState = 'idle' | 'splitting' | 'split';

export class Atom {
  id: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  state: AtomState;
  floatOffset: number;
  floatSpeed: number;
  splitScale: number;
  splitProgress: number;
  chainLevel: number;

  constructor(x: number, y: number, radius: number, color: string) {
    this.id = ++atomIdCounter;
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.state = 'idle';
    this.floatOffset = Math.random() * Math.PI * 2;
    this.floatSpeed = 0.5 + Math.random() * 0.5;
    this.splitScale = 1;
    this.splitProgress = 0;
    this.chainLevel = 0;
  }

  update(dt: number, time: number): void {
    if (this.state === 'idle') {
      const float = Math.sin(time * this.floatSpeed + this.floatOffset) * 3;
      this.x = this.baseX + float;
      this.y = this.baseY + float * 0.7;
    } else if (this.state === 'splitting') {
      this.splitProgress += dt * 5;
      if (this.splitProgress < 0.3) {
        this.splitScale = 1 + this.splitProgress * 1.67;
      } else {
        this.splitScale = Math.max(0, 1.5 - (this.splitProgress - 0.3) * 2.14);
      }
      if (this.splitProgress >= 1) {
        this.state = 'split';
      }
    }
  }

  startSplit(chainLevel: number): void {
    if (this.state !== 'idle') return;
    this.state = 'splitting';
    this.chainLevel = chainLevel;
    this.splitProgress = 0;
    this.splitScale = 1;
  }

  split(hitPoint: { x: number; y: number }, chainLevel: number): FragmentData[] {
    const fragmentCount = 4 + Math.floor(Math.random() * 3);
    const fragments: FragmentData[] = [];
    const now = performance.now();

    for (let i = 0; i < fragmentCount; i++) {
      const angleBase = (i / fragmentCount) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 0.5;
      const angle = angleBase + spread;

      const dx = this.x - hitPoint.x;
      const dy = this.y - hitPoint.y;
      const awayAngle = Math.atan2(dy, dx);

      const finalAngle = angle * 0.3 + awayAngle * 0.7;
      const speed = 50 + Math.random() * 50;

      fragments.push({
        id: ++fragmentIdCounter,
        x: this.x,
        y: this.y,
        vx: Math.cos(finalAngle) * speed,
        vy: Math.sin(finalAngle) * speed,
        radius: 2 + Math.random() * 2,
        color: this.color,
        life: 0.5,
        createdAt: now,
        chainLevel
      });
    }

    return fragments;
  }
}

export class Fragment {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  createdAt: number;
  chainLevel: number;

  constructor(data: FragmentData) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.vx = data.vx;
    this.vy = data.vy;
    this.radius = data.radius;
    this.color = data.color;
    this.life = data.life;
    this.maxLife = data.life;
    this.createdAt = data.createdAt;
    this.chainLevel = data.chainLevel;
  }

  update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life -= dt;
    return this.life > 0;
  }

  get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 69, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getGradientColor(t: number): string {
  const start = hexToRgb('#FF4500');
  const end = hexToRgb('#1E90FF');
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return rgbToHex(r, g, b);
}

export function createAtoms(count: number, width: number, height: number): Atom[] {
  const atoms: Atom[] = [];
  const margin = 80;
  const availableWidth = width - margin * 2;
  const availableHeight = height - margin * 2;

  const useHexGrid = Math.random() > 0.5;

  if (useHexGrid) {
    const cols = Math.ceil(Math.sqrt(count * (availableWidth / availableHeight)));
    const rows = Math.ceil(count / cols);
    const spacingX = availableWidth / (cols + 1);
    const spacingY = availableHeight / (rows + 1);

    let placed = 0;
    for (let row = 0; row < rows && placed < count; row++) {
      for (let col = 0; col < cols && placed < count; col++) {
        const offsetX = row % 2 === 0 ? 0 : spacingX / 2;
        const jitterX = (Math.random() - 0.5) * 30;
        const jitterY = (Math.random() - 0.5) * 30;
        const x = margin + spacingX * (col + 1) + offsetX + jitterX;
        const y = margin + spacingY * (row + 1) + jitterY;
        const radius = 8 + Math.random() * 12;
        const color = getGradientColor(Math.random());
        atoms.push(new Atom(x, y, radius, color));
        placed++;
      }
    }
  } else {
    const clusters = 5 + Math.floor(Math.random() * 4);
    const perCluster = Math.ceil(count / clusters);

    for (let c = 0; c < clusters; c++) {
      const centerX = margin + Math.random() * availableWidth;
      const centerY = margin + Math.random() * availableHeight;
      const clusterRadius = 60 + Math.random() * 100;

      for (let i = 0; i < perCluster && atoms.length < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * clusterRadius;
        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist;
        const radius = 8 + Math.random() * 12;
        const color = getGradientColor(Math.random());
        atoms.push(new Atom(x, y, radius, color));
      }
    }
  }

  return atoms;
}

export function createMolecularBonds(atoms: Atom[]): Bond[] {
  const bonds: Bond[] = [];
  const maxDistance = 120;

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dx = atoms[i].baseX - atoms[j].baseX;
      const dy = atoms[i].baseY - atoms[j].baseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance) {
        bonds.push({
          from: atoms[i].id,
          to: atoms[j].id,
          distance
        });
      }
    }
  }

  return bonds;
}

export function resetCounters(): void {
  atomIdCounter = 0;
  fragmentIdCounter = 0;
}
