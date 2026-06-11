import { Atom, Fragment, Bond, Vec2, generateMolecularStructure } from './atom';

export interface Ray {
  id: number;
  start: Vec2;
  end: Vec2;
  target: Vec2;
  progress: number;
  duration: number;
  active: boolean;
  trail: Vec2[];
}

export interface ReactionState {
  atoms: Atom[];
  bonds: Bond[];
  fragments: Fragment[];
  rays: Ray[];
  energy: number;
  maxChainLevel: number;
  bondActivation: number;
}

const MAX_CHAIN_LEVEL = 10;
const MAX_FRAGMENTS = 300;
const RADIUS_INCREMENT_PER_LEVEL = 5;
let rayIdCounter = 0;

export class ReactionManager {
  private state: ReactionState;
  private canvasWidth: number;
  private canvasHeight: number;
  private energyCallback: ((energy: number, maxLevel: number) => void) | null = null;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    const { atoms, bonds } = generateMolecularStructure(width, height);
    this.state = {
      atoms,
      bonds,
      fragments: [],
      rays: [],
      energy: 0,
      maxChainLevel: 0,
      bondActivation: 0
    };
  }

  public onEnergyUpdate(callback: (energy: number, maxLevel: number) => void): void {
    this.energyCallback = callback;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public reset(): void {
    const { atoms, bonds } = generateMolecularStructure(this.canvasWidth, this.canvasHeight);
    this.state = {
      atoms,
      bonds,
      fragments: [],
      rays: [],
      energy: 0,
      maxChainLevel: 0,
      bondActivation: 0
    };
    if (this.energyCallback) {
      this.energyCallback(0, 0);
    }
  }

  public getState(): ReactionState {
    return this.state;
  }

  public fireRay(targetX: number, targetY: number): void {
    const fromLeft = Math.random() > 0.5;
    let start: Vec2;
    if (fromLeft) {
      start = { x: -20, y: targetY + (Math.random() - 0.5) * 100 };
    } else {
      start = { x: targetX + (Math.random() - 0.5) * 100, y: -20 };
    }

    const ray: Ray = {
      id: rayIdCounter++,
      start,
      end: { ...start },
      target: { x: targetX, y: targetY },
      progress: 0,
      duration: 0.5,
      active: true,
      trail: [{ ...start }]
    };
    this.state.rays.push(ray);
  }

  private checkRayCollision(ray: Ray): Atom | null {
    let closestAtom: Atom | null = null;
    let closestDist = Infinity;

    for (const atom of this.state.atoms) {
      if (!atom.isAlive()) continue;

      const dist = this.pointToSegmentDistance(
        atom.pos,
        ray.start,
        ray.end
      );
      if (dist < atom.radius && dist < closestDist) {
        closestDist = dist;
        closestAtom = atom;
      }
    }
    return closestAtom;
  }

  private pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
    }
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
  }

  private triggerAtomSplit(atom: Atom, chainLevel: number): void {
    if (chainLevel > MAX_CHAIN_LEVEL) return;
    if (atom.state !== 'idle') return;

    const extraRadius = (chainLevel - 1) * RADIUS_INCREMENT_PER_LEVEL;
    const newFragments = atom.triggerSplit(chainLevel, extraRadius);

    this.state.fragments.push(...newFragments);
    this.trimFragments();

    this.state.energy += 1;
    if (chainLevel > this.state.maxChainLevel) {
      this.state.maxChainLevel = chainLevel;
    }
    this.state.bondActivation = Math.min(1, this.state.bondActivation + 0.03);

    if (this.energyCallback) {
      this.energyCallback(this.state.energy, this.state.maxChainLevel);
    }
  }

  private trimFragments(): void {
    if (this.state.fragments.length > MAX_FRAGMENTS) {
      const excess = this.state.fragments.length - MAX_FRAGMENTS;
      this.state.fragments.splice(0, excess);
    }
  }

  private checkFragmentCollisions(): void {
    for (const fragment of this.state.fragments) {
      if (fragment.life <= 0) continue;
      for (const atom of this.state.atoms) {
        if (!atom.isAlive() || atom.state === 'splitting') continue;
        const dx = fragment.pos.x - atom.pos.x;
        const dy = fragment.pos.y - atom.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < fragment.radius + atom.radius) {
          this.triggerAtomSplit(atom, fragment.chainLevel + 1);
        }
      }
    }
  }

  public update(dt: number): void {
    const time = performance.now() / 1000;

    for (const atom of this.state.atoms) {
      atom.update(dt, time);
    }

    for (const ray of this.state.rays) {
      if (!ray.active) continue;
      ray.progress += dt;
      const t = Math.min(ray.progress / ray.duration, 1);
      ray.end.x = ray.start.x + (ray.target.x - ray.start.x) * t;
      ray.end.y = ray.start.y + (ray.target.y - ray.start.y) * t;

      if (ray.trail.length === 0 ||
          Math.abs(ray.trail[ray.trail.length - 1].x - ray.end.x) > 2 ||
          Math.abs(ray.trail[ray.trail.length - 1].y - ray.end.y) > 2) {
        ray.trail.push({ ...ray.end });
        if (ray.trail.length > 20) ray.trail.shift();
      }

      const hitAtom = this.checkRayCollision(ray);
      if (hitAtom) {
        this.triggerAtomSplit(hitAtom, 1);
        ray.active = false;
      } else if (t >= 1) {
        ray.active = false;
      }
    }

    this.state.rays = this.state.rays.filter(r => r.active || r.progress < r.duration + 0.2);

    for (const fragment of this.state.fragments) {
      if (fragment.life <= 0) continue;
      fragment.pos.x += fragment.vel.x * dt;
      fragment.pos.y += fragment.vel.y * dt;
      fragment.vel.x *= 0.99;
      fragment.vel.y *= 0.99;
      fragment.life -= dt;
    }
    this.state.fragments = this.state.fragments.filter(f => f.life > 0);

    this.checkFragmentCollisions();

    this.state.bondActivation = Math.max(0, this.state.bondActivation - dt * 0.02);
  }
}
