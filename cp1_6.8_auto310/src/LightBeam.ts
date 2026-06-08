import Phaser from 'phaser';

export interface LightSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: number;
  refractions: number;
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MirrorData {
  x: number;
  y: number;
  angle: number;
  length: number;
  isRefractive: boolean;
}

export interface MechanismData {
  x: number;
  y: number;
  color: 'blue' | 'purple' | 'white';
  activated: boolean;
  radius: number;
  shape: 'circle' | 'triangle' | 'hexagon';
}

const COLOR_PALETTE = [
  0xfff5e6,
  0xccddff,
  0x6496ff,
  0x9b6dfe,
  0xb450ff,
];

const COLOR_NAMES: ('white' | 'blue' | 'purple')[] = [
  'white',
  'white',
  'blue',
  'purple',
  'purple',
];

export function getLightColorName(refractions: number): 'white' | 'blue' | 'purple' {
  return COLOR_NAMES[Math.min(refractions, COLOR_NAMES.length - 1)];
}

export function getLightColor(refractions: number): number {
  return COLOR_PALETTE[Math.min(refractions, COLOR_PALETTE.length - 1)];
}

export class LightBeam {
  private scene: Phaser.Scene;
  private beamGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private particles: Phaser.GameObjects.Image[] = [];
  private segments: LightSegment[] = [];
  private maxBounces = 12;
  private glowSprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.beamGraphics = scene.add.graphics();
    this.glowGraphics = scene.add.graphics();

    for (let i = 0; i < 60; i++) {
      const p = scene.add.image(0, 0, 'particle');
      p.setDepth(5);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.setVisible(false);
      p.setScale(0.3);
      this.particles.push(p);
    }

    for (let i = 0; i < 8; i++) {
      const glow = scene.add.image(0, 0, 'glow_white');
      glow.setDepth(3);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setVisible(false);
      glow.setAlpha(0.5);
      glow.setScale(0.8);
      this.glowSprites.push(glow);
    }
  }

  getSegments(): LightSegment[] {
    return this.segments;
  }

  castBeam(
    originX: number,
    originY: number,
    direction: number,
    walls: WallSegment[],
    mirrors: MirrorData[],
    mechanisms: MechanismData[]
  ): void {
    this.segments = [];
    let curX = originX;
    let curY = originY;
    let curDir = direction;
    let refCount = 0;
    const hitMechanisms: Set<number> = new Set();

    for (let bounce = 0; bounce < this.maxBounces; bounce++) {
      const rayLen = 2000;
      const endX = curX + Math.cos(curDir) * rayLen;
      const endY = curY + Math.sin(curDir) * rayLen;

      let closestT = Infinity;
      let hitType: 'wall' | 'mirror' | 'mechanism' | null = null;
      let hitNormal = 0;
      let hitMirror: MirrorData | null = null;
      let hitMechIdx = -1;

      for (const wall of walls) {
        const t = this.segIntersect(curX, curY, endX, endY, wall.x1, wall.y1, wall.x2, wall.y2);
        if (t !== null && t > 0.002 && t < closestT) {
          closestT = t;
          hitType = 'wall';
          hitNormal = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) + Math.PI / 2;
        }
      }

      for (let mi = 0; mi < mirrors.length; mi++) {
        const m = mirrors[mi];
        const cos = Math.cos(m.angle);
        const sin = Math.sin(m.angle);
        const halfLen = m.length / 2;
        const mx1 = m.x + cos * halfLen;
        const my1 = m.y + sin * halfLen;
        const mx2 = m.x - cos * halfLen;
        const my2 = m.y - sin * halfLen;

        const t = this.segIntersect(curX, curY, endX, endY, mx1, my1, mx2, my2);
        if (t !== null && t > 0.002 && t < closestT) {
          closestT = t;
          hitType = 'mirror';
          hitMirror = m;
          hitNormal = m.angle + Math.PI / 2;
        }
      }

      for (let mi = 0; mi < mechanisms.length; mi++) {
        const mech = mechanisms[mi];
        const t = this.circleIntersect(curX, curY, endX, endY, mech.x, mech.y, mech.radius + 4);
        if (t !== null && t > 0.002 && t < closestT) {
          closestT = t;
          hitType = 'mechanism';
          hitMechIdx = mi;
        }
      }

      const hitX = curX + (endX - curX) * closestT;
      const hitY = curY + (endY - curY) * closestT;

      const colorIdx = Math.min(refCount, COLOR_PALETTE.length - 1);

      this.segments.push({
        startX: curX,
        startY: curY,
        endX: hitX,
        endY: hitY,
        color: COLOR_PALETTE[colorIdx],
        refractions: refCount,
      });

      if (hitType === 'wall') {
        break;
      } else if (hitType === 'mirror' && hitMirror) {
        if (hitMirror.isRefractive) {
          refCount++;
          curDir = this.refractDir(curDir, hitNormal);
        } else {
          curDir = this.reflectDir(curDir, hitNormal);
        }
        curX = hitX + Math.cos(curDir) * 1.5;
        curY = hitY + Math.sin(curDir) * 1.5;
      } else if (hitType === 'mechanism') {
        const mech = mechanisms[hitMechIdx];
        if (!hitMechanisms.has(hitMechIdx)) {
          hitMechanisms.add(hitMechIdx);
          const lightColorName = getLightColorName(refCount);
          if (lightColorName === mech.color) {
            mech.activated = true;
          }
        }
        curX = hitX + Math.cos(curDir) * 3;
        curY = hitY + Math.sin(curDir) * 3;
      } else {
        break;
      }
    }

    this.render();
  }

  private reflectDir(dir: number, normal: number): number {
    const dx = Math.cos(dir);
    const dy = Math.sin(dir);
    const nx = Math.cos(normal);
    const ny = Math.sin(normal);
    const dot = dx * nx + dy * ny;
    const rx = dx - 2 * dot * nx;
    const ry = dy - 2 * dot * ny;
    return Math.atan2(ry, rx);
  }

  private refractDir(dir: number, normal: number): number {
    const deviation = (Math.random() - 0.5) * 0.6 + 0.3;
    return dir + deviation;
  }

  private segIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): number | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return t;
    return null;
  }

  private circleIntersect(
    x1: number, y1: number, x2: number, y2: number,
    cx: number, cy: number, r: number
  ): number | null {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    if (t1 >= 0.002 && t1 <= 1) return t1;
    if (t2 >= 0.002 && t2 <= 1) return t2;
    return null;
  }

  private render(): void {
    this.beamGraphics.clear();
    this.glowGraphics.clear();

    let pIdx = 0;
    let gIdx = 0;

    for (const seg of this.segments) {
      const colorObj = Phaser.Display.Color.IntegerToColor(seg.color);
      const r = colorObj.red;
      const g = colorObj.green;
      const b = colorObj.blue;

      this.glowGraphics.lineStyle(12, seg.color, 0.08);
      this.glowGraphics.beginPath();
      this.glowGraphics.moveTo(seg.startX, seg.startY);
      this.glowGraphics.lineTo(seg.endX, seg.endY);
      this.glowGraphics.strokePath();

      this.glowGraphics.lineStyle(6, seg.color, 0.15);
      this.glowGraphics.beginPath();
      this.glowGraphics.moveTo(seg.startX, seg.startY);
      this.glowGraphics.lineTo(seg.endX, seg.endY);
      this.glowGraphics.strokePath();

      this.beamGraphics.lineStyle(2, seg.color, 0.95);
      this.beamGraphics.beginPath();
      this.beamGraphics.moveTo(seg.startX, seg.startY);
      this.beamGraphics.lineTo(seg.endX, seg.endY);
      this.beamGraphics.strokePath();

      this.beamGraphics.lineStyle(1, 0xffffff, 0.6);
      this.beamGraphics.beginPath();
      this.beamGraphics.moveTo(seg.startX, seg.startY);
      this.beamGraphics.lineTo(seg.endX, seg.endY);
      this.beamGraphics.strokePath();

      const dx = seg.endX - seg.startX;
      const dy = seg.endY - seg.startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(len / 25);

      for (let i = 0; i < steps && pIdx < this.particles.length; i++) {
        const t = i / Math.max(steps, 1);
        const px = seg.startX + dx * t;
        const py = seg.startY + dy * t;
        const p = this.particles[pIdx++];
        p.setPosition(px, py);
        p.setVisible(true);
        p.setTint(seg.color);
        p.setAlpha(0.4 + Math.random() * 0.3);
        p.setScale(0.15 + Math.random() * 0.2);
      }

      if (gIdx < this.glowSprites.length) {
        const glowKey = seg.refractions < 2 ? 'glow_white' : seg.refractions < 3 ? 'glow_blue' : 'glow_purple';
        const glow = this.glowSprites[gIdx++];
        glow.setPosition(seg.endX, seg.endY);
        glow.setTexture(glowKey);
        glow.setVisible(true);
        glow.setAlpha(0.3);
        glow.setScale(0.5);
      }
    }

    for (let i = pIdx; i < this.particles.length; i++) {
      this.particles[i].setVisible(false);
    }
    for (let i = gIdx; i < this.glowSprites.length; i++) {
      this.glowSprites[i].setVisible(false);
    }
  }

  setDepth(depth: number): void {
    this.beamGraphics.setDepth(depth);
    this.glowGraphics.setDepth(depth - 1);
    for (const p of this.particles) p.setDepth(depth + 1);
    for (const g of this.glowSprites) g.setDepth(depth - 1);
  }

  destroy(): void {
    this.beamGraphics.destroy();
    this.glowGraphics.destroy();
    for (const p of this.particles) p.destroy();
    for (const g of this.glowSprites) g.destroy();
  }
}
