import { Atom, Fragment, Bond, createAtoms, createMolecularBonds, resetCounters } from './atom';

interface RayTrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Ray {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  currentX: number;
  currentY: number;
  progress: number;
  duration: number;
  trail: RayTrailPoint[];
  hit: boolean;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  progress: number;
}

type EnergySymbolType = '⚡' | '🔥' | '✧';

export interface EnergySymbol {
  x: number;
  y: number;
  symbol: EnergySymbolType;
  rotation: number;
  scale: number;
  alpha: number;
  duration: number;
  progress: number;
}

export interface ReactionState {
  atoms: Atom[];
  bonds: Bond[];
  fragments: Fragment[];
  rays: Ray[];
  shockwaves: Shockwave[];
  energySymbols: EnergySymbol[];
  energy: number;
  currentMaxLevel: number;
  reactionProgress: number;
}

const MAX_CHAIN_LEVEL = 10;
const MAX_FRAGMENTS = 300;
const LEVEL_RADIUS_BONUS = 5;
const ENERGY_SYMBOLS: EnergySymbolType[] = ['⚡', '🔥', '✧'];

export class ReactionManager {
  private atoms: Atom[] = [];
  private bonds: Bond[] = [];
  private fragments: Fragment[] = [];
  private rays: Ray[] = [];
  private shockwaves: Shockwave[] = [];
  private energySymbols: EnergySymbol[] = [];
  private energy: number = 0;
  private currentMaxLevel: number = 0;
  private reactionProgress: number = 0;
  private lastFlashEnergy: number = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initializeAtoms();
  }

  private initializeAtoms(): void {
    resetCounters();
    const count = 80 + Math.floor(Math.random() * 71);
    this.atoms = createAtoms(count, this.width, this.height);
    this.bonds = createMolecularBonds(this.atoms);
  }

  launchRay(targetX: number, targetY: number): void {
    const fromLeft = Math.random() > 0.5;
    let startX: number, startY: number;

    if (fromLeft) {
      startX = -20;
      startY = Math.random() * this.height;
    } else {
      startX = Math.random() * this.width;
      startY = -20;
    }

    const ray: Ray = {
      startX,
      startY,
      endX: targetX,
      endY: targetY,
      currentX: startX,
      currentY: startY,
      progress: 0,
      duration: 0.5,
      trail: [],
      hit: false
    };

    this.rays.push(ray);
  }

  private checkRayAtomCollision(ray: Ray): Atom | null {
    const rx = ray.currentX;
    const ry = ray.currentY;
    let closestAtom: Atom | null = null;
    let closestDist = Infinity;

    for (const atom of this.atoms) {
      if (atom.state !== 'idle') continue;

      const dx = rx - atom.x;
      const dy = ry - atom.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < atom.radius && dist < closestDist) {
        closestDist = dist;
        closestAtom = atom;
      }
    }

    return closestAtom;
  }

  private createShockwave(x: number, y: number, baseRadius: number, level: number): void {
    const maxRadius = (baseRadius + level * LEVEL_RADIUS_BONUS) * 3;
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius,
      alpha: 0.8,
      duration: 0.3,
      progress: 0
    });
  }

  private createEnergySymbol(x: number, y: number): void {
    const symbol = ENERGY_SYMBOLS[Math.floor(Math.random() * ENERGY_SYMBOLS.length)];
    this.energySymbols.push({
      x,
      y,
      symbol,
      rotation: 0,
      scale: 1,
      alpha: 1,
      duration: 0.4,
      progress: 0
    });
  }

  triggerSplit(atom: Atom, hitPoint: { x: number; y: number }, level: number): void {
    if (level > MAX_CHAIN_LEVEL) return;
    if (atom.state !== 'idle') return;

    atom.startSplit(level);

    this.energy++;
    this.currentMaxLevel = Math.max(this.currentMaxLevel, level);
    this.reactionProgress = Math.min(1, this.reactionProgress + 0.02);

    this.createShockwave(atom.x, atom.y, atom.radius, level);
    this.createEnergySymbol(atom.x, atom.y);

    setTimeout(() => {
      if (atom.state === 'splitting') {
        const fragmentData = atom.split(hitPoint, level);
        for (const data of fragmentData) {
          this.fragments.push(new Fragment(data));
        }

        if (this.fragments.length > MAX_FRAGMENTS) {
          this.fragments = this.fragments.slice(-MAX_FRAGMENTS);
        }
      }
    }, 200);
  }

  private checkFragmentCollisions(): void {
    const idleAtoms = this.atoms.filter(a => a.state === 'idle');

    for (const fragment of this.fragments) {
      if (fragment.life <= 0) continue;

      for (const atom of idleAtoms) {
        if (atom.state !== 'idle') continue;

        const dx = fragment.x - atom.x;
        const dy = fragment.y - atom.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = atom.radius + fragment.radius + fragment.chainLevel * LEVEL_RADIUS_BONUS * 0.3;

        if (dist < hitRadius) {
          const nextLevel = fragment.chainLevel + 1;
          this.triggerSplit(atom, { x: fragment.x, y: fragment.y }, nextLevel);
          fragment.life = 0;
          break;
        }
      }
    }
  }

  private updateRays(dt: number): void {
    for (let i = this.rays.length - 1; i >= 0; i--) {
      const ray = this.rays[i];
      ray.progress += dt / ray.duration;

      if (ray.progress >= 1) {
        this.rays.splice(i, 1);
        continue;
      }

      const t = Math.min(1, ray.progress);
      ray.currentX = ray.startX + (ray.endX - ray.startX) * t;
      ray.currentY = ray.startY + (ray.endY - ray.startY) * t;

      ray.trail.push({ x: ray.currentX, y: ray.currentY, alpha: 1 });
      if (ray.trail.length > 15) {
        ray.trail.shift();
      }
      for (let j = 0; j < ray.trail.length; j++) {
        ray.trail[j].alpha = (j + 1) / ray.trail.length;
      }

      if (!ray.hit) {
        const hitAtom = this.checkRayAtomCollision(ray);
        if (hitAtom) {
          ray.hit = true;
          this.triggerSplit(hitAtom, { x: ray.currentX, y: ray.currentY }, 1);
          ray.progress = 1;
        }
      }
    }
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.progress += dt / sw.duration;

      if (sw.progress >= 1) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      sw.radius = sw.maxRadius * sw.progress;
      sw.alpha = 0.8 * (1 - sw.progress);
    }
  }

  private updateEnergySymbols(dt: number): void {
    for (let i = this.energySymbols.length - 1; i >= 0; i--) {
      const es = this.energySymbols[i];
      es.progress += dt / es.duration;

      if (es.progress >= 1) {
        this.energySymbols.splice(i, 1);
        continue;
      }

      es.rotation = es.progress * Math.PI * 2;
      es.scale = 1 - es.progress * 0.8;
      es.alpha = 1 - es.progress;
    }
  }

  private updateFragments(dt: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const alive = this.fragments[i].update(dt);
      if (!alive) {
        this.fragments.splice(i, 1);
      }
    }
  }

  private updateAtoms(dt: number, time: number): void {
    for (const atom of this.atoms) {
      atom.update(dt, time);
    }
  }

  update(dt: number, time: number): void {
    this.updateAtoms(dt, time);
    this.updateRays(dt);
    this.updateFragments(dt);
    this.updateShockwaves(dt);
    this.updateEnergySymbols(dt);
    this.checkFragmentCollisions();

    if (this.fragments.length === 0 && this.rays.length === 0) {
      this.reactionProgress *= 0.98;
    }
  }

  shouldTriggerFlash(): boolean {
    if (this.energy >= 20 && this.energy !== this.lastFlashEnergy && this.energy % 20 === 0) {
      this.lastFlashEnergy = this.energy;
      return true;
    }
    return false;
  }

  reset(width?: number, height?: number): void {
    if (width !== undefined) this.width = width;
    if (height !== undefined) this.height = height;

    this.fragments = [];
    this.rays = [];
    this.shockwaves = [];
    this.energySymbols = [];
    this.energy = 0;
    this.currentMaxLevel = 0;
    this.reactionProgress = 0;
    this.lastFlashEnergy = 0;
    this.initializeAtoms();
  }

  getState(): ReactionState {
    return {
      atoms: this.atoms,
      bonds: this.bonds,
      fragments: this.fragments,
      rays: this.rays,
      shockwaves: this.shockwaves,
      energySymbols: this.energySymbols,
      energy: this.energy,
      currentMaxLevel: this.currentMaxLevel,
      reactionProgress: this.reactionProgress
    };
  }
}
