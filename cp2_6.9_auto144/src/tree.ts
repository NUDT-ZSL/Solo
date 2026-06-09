export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TreeConfig {
  maxDepth: number;
  branchAngle: number;
  growthSpeed: number;
  initialLength: number;
  lengthRatio: number;
}

export interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  angle: number;
  depth: number;
  thickness: number;
  growthProgress: number;
  fadeProgress: number;
  hasLeaves: boolean;
  children: Branch[];
}

export interface Leaf {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  attached: boolean;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  angle: number;
}

export class FractalTree {
  public rootX: number;
  public rootY: number;
  public config: TreeConfig;
  public season: Season;
  public branches: Branch[] = [];
  public leaves: Leaf[] = [];
  public age: number = 0;
  public dying: boolean = false;
  public deathProgress: number = 0;
  public scale: number = 1;
  public alpha: number = 1;
  public hovered: boolean = false;
  public hoverProgress: number = 0;
  public hoverTextProgress: number = 0;
  public crownRadius: number = 0;
  public currentAngle: number;
  public targetAngle: number;
  public angleTransitionProgress: number = 1;
  private leafColorMap: Record<Season, string> = {
    spring: '#27AE60',
    summer: '#1E8449',
    autumn: '#E74C3C',
    winter: 'transparent'
  };
  private branchColorMap: Record<Season, { start: string; end: string }> = {
    spring: { start: '#6D4C41', end: '#8D6E63' },
    summer: { start: '#5D4037', end: '#795548' },
    autumn: { start: '#6D4C41', end: '#8D6E63' },
    winter: { start: '#7F8C8D', end: '#95A5A6' }
  };
  private seasonColorMap: Record<Season, string> = {
    spring: '#2ECC71',
    summer: '#3498DB',
    autumn: '#E67E22',
    winter: '#ECF0F1'
  };

  constructor(
    rootX: number,
    rootY: number,
    config: TreeConfig,
    season: Season
  ) {
    this.rootX = rootX;
    this.rootY = rootY;
    this.config = { ...config };
    this.season = season;
    this.currentAngle = config.branchAngle;
    this.targetAngle = config.branchAngle;
    this.generateBranches();
  }

  private generateBranches(): void {
    this.branches = [];
    this.leaves = [];
    this.crownRadius = 0;
    const trunk: Branch = {
      startX: this.rootX,
      startY: this.rootY,
      endX: this.rootX,
      endY: this.rootY - this.config.initialLength,
      length: this.config.initialLength,
      angle: -Math.PI / 2,
      depth: 0,
      thickness: 8,
      growthProgress: 0,
      fadeProgress: 0,
      hasLeaves: false,
      children: []
    };
    this.branches.push(trunk);
    this.generateChildren(trunk, 0);
  }

  private generateChildren(parent: Branch, depth: number): void {
    if (depth >= this.config.maxDepth) {
      parent.hasLeaves = depth >= Math.floor(this.config.maxDepth * 0.6);
      return;
    }
    const childLength = parent.length * this.config.lengthRatio;
    const angleRad = (this.config.branchAngle * Math.PI) / 180;
    for (const sign of [-1, 1]) {
      const angleOffset = angleRad * sign * (0.8 + Math.random() * 0.4);
      const childAngle = parent.angle + angleOffset;
      const thickness = Math.max(1, parent.thickness * 0.7);
      const child: Branch = {
        startX: parent.endX,
        startY: parent.endY,
        endX: parent.endX + Math.cos(childAngle) * childLength,
        endY: parent.endY + Math.sin(childAngle) * childLength,
        length: childLength,
        angle: childAngle,
        depth: depth + 1,
        thickness,
        growthProgress: 0,
        fadeProgress: 0,
        hasLeaves: false,
        children: []
      };
      this.branches.push(child);
      parent.children.push(child);
      const distFromRoot = Math.sqrt(
        Math.pow(child.endX - this.rootX, 2) + Math.pow(child.endY - this.rootY, 2)
      );
      if (distFromRoot > this.crownRadius) {
        this.crownRadius = distFromRoot;
      }
      this.generateChildren(child, depth + 1);
    }
  }

  public regrowWithNewAngle(newAngle: number): void {
    this.targetAngle = newAngle;
    this.config.branchAngle = newAngle;
    this.angleTransitionProgress = 0;
  }

  public update(deltaTime: number): void {
    if (this.dying) {
      this.deathProgress = Math.min(1, this.deathProgress + deltaTime / 0.5);
      this.scale = 1 - this.deathProgress;
      this.alpha = 1 - this.deathProgress;
      return;
    }
    this.age += deltaTime;
    if (this.angleTransitionProgress < 1) {
      this.angleTransitionProgress = Math.min(1, this.angleTransitionProgress + deltaTime / 0.5);
      const t = this.easeInOutCubic(this.angleTransitionProgress);
      const oldAngle = this.currentAngle;
      const newAngle = this.lerp(this.currentAngle, this.targetAngle, t);
      if (Math.abs(newAngle - oldAngle) > 0.1) {
        this.config.branchAngle = newAngle;
        this.currentAngle = newAngle;
        this.recomputeBranchAngles();
      }
    }
    const growthDelay = 0.1 / this.config.growthSpeed;
    const growthDuration = 0.2 / this.config.growthSpeed;
    const fadeDuration = 0.3;
    for (const branch of this.branches) {
      const startTime = branch.depth * growthDelay;
      const effectiveAge = this.age - startTime;
      if (effectiveAge > 0) {
        branch.growthProgress = Math.min(1, effectiveAge / growthDuration);
        branch.fadeProgress = Math.min(1, effectiveAge / fadeDuration);
      }
    }
    this.updateHover(deltaTime);
    this.updateLeaves(deltaTime);
    if (this.season === 'autumn' && this.age > this.config.maxDepth * growthDelay + growthDuration + fadeDuration) {
      this.spawnFallingLeaves();
    }
  }

  private recomputeBranchAngles(): void {
    if (this.branches.length === 0) return;
    const trunk = this.branches[0];
    this.recomputeChildrenAngles(trunk);
    this.crownRadius = 0;
    for (const branch of this.branches) {
      const distFromRoot = Math.sqrt(
        Math.pow(branch.endX - this.rootX, 2) + Math.pow(branch.endY - this.rootY, 2)
      );
      if (distFromRoot > this.crownRadius) {
        this.crownRadius = distFromRoot;
      }
    }
  }

  private recomputeChildrenAngles(parent: Branch): void {
    if (parent.children.length === 0) return;
    const angleRad = (this.config.branchAngle * Math.PI) / 180;
    const childLength = parent.length * this.config.lengthRatio;
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      const sign = i === 0 ? -1 : 1;
      const angleOffset = angleRad * sign * (0.8 + Math.random() * 0.4);
      child.length = childLength;
      child.angle = parent.angle + angleOffset;
      child.startX = parent.endX;
      child.startY = parent.endY;
      child.endX = parent.endX + Math.cos(child.angle) * childLength;
      child.endY = parent.endY + Math.sin(child.angle) * childLength;
      this.recomputeChildrenAngles(child);
    }
  }

  private updateHover(deltaTime: number): void {
    const target = this.hovered ? 1 : 0;
    this.hoverProgress += (target - this.hoverProgress) * Math.min(1, deltaTime * 5);
    if (this.hovered && this.hoverTextProgress < 1) {
      this.hoverTextProgress = Math.min(1, this.hoverTextProgress + deltaTime / 0.5);
    } else if (!this.hovered) {
      this.hoverTextProgress = Math.max(0, this.hoverTextProgress - deltaTime * 2);
    }
  }

  private updateLeaves(deltaTime: number): void {
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      leaf.life += deltaTime;
      if (leaf.life >= leaf.maxLife) {
        this.leaves.splice(i, 1);
        continue;
      }
      leaf.alpha = 1 - leaf.life / leaf.maxLife;
      leaf.x += leaf.vx * deltaTime;
      leaf.y += leaf.vy * deltaTime;
      leaf.vy += 30 * deltaTime;
      leaf.vx += Math.sin(this.age * 3 + i) * 20 * deltaTime;
      leaf.angle += deltaTime * 2;
    }
  }

  private spawnFallingLeaves(): void {
    const leafBranches = this.branches.filter(b => b.hasLeaves && b.growthProgress >= 1);
    if (leafBranches.length === 0) return;
    for (let i = 0; i < 2; i++) {
      const branch = leafBranches[Math.floor(Math.random() * leafBranches.length)];
      this.leaves.push({
        x: branch.endX + (Math.random() - 0.5) * 8,
        y: branch.endY + (Math.random() - 0.5) * 8,
        radius: 3,
        color: this.leafColorMap.autumn,
        alpha: 1,
        attached: false,
        vx: (Math.random() - 0.5) * 30,
        vy: Math.random() * 20 + 10,
        life: 0,
        maxLife: 1.5,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  public isPointNearRoot(x: number, y: number, radius: number = 20): boolean {
    const dist = Math.sqrt(Math.pow(x - this.rootX, 2) + Math.pow(y - this.rootY, 2));
    return dist <= radius;
  }

  public isPointInTree(x: number, y: number): boolean {
    for (const branch of this.branches) {
      if (branch.growthProgress < 0.5) continue;
      const px = branch.startX + (branch.endX - branch.startX) * branch.growthProgress;
      const py = branch.startY + (branch.endY - branch.startY) * branch.growthProgress;
      const dist = this.pointToSegmentDistance(x, y, branch.startX, branch.startY, px, py);
      if (dist <= branch.thickness + 10) return true;
    }
    const crownDist = Math.sqrt(Math.pow(x - this.rootX, 2) + Math.pow(y - (this.rootY - this.crownRadius * 0.6), 2));
    return crownDist <= this.crownRadius * 0.8;
  }

  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.rootX, this.rootY);
    ctx.scale(this.scale, this.scale);
    ctx.globalAlpha = this.alpha;
    ctx.translate(-this.rootX, -this.rootY);
    this.drawGround(ctx);
    for (const branch of this.branches) {
      this.drawBranch(ctx, branch);
    }
    if (this.season !== 'winter') {
      for (const branch of this.branches) {
        if (branch.hasLeaves) {
          this.drawLeavesOnBranch(ctx, branch);
        }
      }
    }
    if (this.season === 'winter') {
      for (const branch of this.branches) {
        if (branch.growthProgress >= 1 && (branch.hasLeaves || branch.depth >= this.config.maxDepth - 1)) {
          this.drawSnow(ctx, branch);
        }
      }
    }
    for (const leaf of this.leaves) {
      this.drawFallingLeaf(ctx, leaf);
    }
    ctx.restore();
    if (this.hoverProgress > 0.01 && !this.dying) {
      this.drawHoverGlow(ctx);
      this.drawHoverText(ctx);
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.rootX, this.rootY, 0,
      this.rootX, this.rootY, 25
    );
    gradient.addColorStop(0, '#5D4037');
    gradient.addColorStop(1, '#3E2723');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.rootX, this.rootY, 25, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
  }

  private drawBranch(ctx: CanvasRenderingContext2D, branch: Branch): void {
    if (branch.growthProgress <= 0) return;
    const currentEndX = branch.startX + (branch.endX - branch.startX) * branch.growthProgress;
    const currentEndY = branch.startY + (branch.endY - branch.startY) * branch.growthProgress;
    const colors = this.branchColorMap[this.season];
    const progress = branch.depth / this.config.maxDepth;
    const r1 = parseInt(colors.start.slice(1, 3), 16);
    const g1 = parseInt(colors.start.slice(3, 5), 16);
    const b1 = parseInt(colors.start.slice(5, 7), 16);
    const r2 = parseInt(colors.end.slice(1, 3), 16);
    const g2 = parseInt(colors.end.slice(3, 5), 16);
    const b2 = parseInt(colors.end.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);
    ctx.save();
    ctx.globalAlpha = branch.fadeProgress;
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = branch.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(branch.startX, branch.startY);
    ctx.lineTo(currentEndX, currentEndY);
    ctx.stroke();
    ctx.restore();
  }

  private drawLeavesOnBranch(ctx: CanvasRenderingContext2D, branch: Branch): void {
    if (branch.growthProgress < 0.9) return;
    const leavesCount = 3 + Math.floor(Math.random() * 3);
    const leafColor = this.leafColorMap[this.season];
    for (let i = 0; i < leavesCount; i++) {
      const t = 0.7 + Math.random() * 0.3;
      const lx = branch.startX + (branch.endX - branch.startX) * t + (Math.random() - 0.5) * 6;
      const ly = branch.startY + (branch.endY - branch.startY) * t + (Math.random() - 0.5) * 6;
      const leafRadius = 3 + Math.random() * 3;
      ctx.save();
      ctx.globalAlpha = branch.fadeProgress * 0.8;
      ctx.fillStyle = leafColor;
      ctx.beginPath();
      ctx.arc(lx, ly, leafRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSnow(ctx: CanvasRenderingContext2D, branch: Branch): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.ellipse(branch.endX, branch.endY, 5, 3, branch.angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    if (branch.depth >= 1) {
      const midX = branch.startX + (branch.endX - branch.startX) * 0.5;
      const midY = branch.startY + (branch.endY - branch.startY) * 0.5;
      ctx.beginPath();
      ctx.ellipse(midX, midY, 3, 2, branch.angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFallingLeaf(ctx: CanvasRenderingContext2D, leaf: Leaf): void {
    ctx.save();
    ctx.globalAlpha = leaf.alpha;
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.angle);
    ctx.fillStyle = leaf.color;
    ctx.beginPath();
    ctx.arc(0, 0, leaf.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHoverGlow(ctx: CanvasRenderingContext2D): void {
    const centerY = this.rootY - this.crownRadius * 0.5;
    const radius = this.crownRadius + 10;
    const color = this.seasonColorMap[this.season];
    const gradient = ctx.createRadialGradient(
      this.rootX, centerY, 0,
      this.rootX, centerY, radius
    );
    const alpha = 0.2 * this.hoverProgress;
    gradient.addColorStop(0, this.hexToRgba(color, alpha));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.rootX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHoverText(ctx: CanvasRenderingContext2D): void {
    if (this.hoverTextProgress <= 0) return;
    const text = '点击树干可移除该树';
    const fontSize = 14;
    ctx.save();
    ctx.font = `${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const padding = 6;
    const boxX = this.rootX - textWidth / 2 - padding;
    const baseY = this.rootY + 30;
    const offsetY = (1 - this.hoverTextProgress) * 10;
    const boxY = baseY + offsetY - fontSize - padding * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, boxX, boxY, textWidth + padding * 2, fontSize + padding * 2, 6);
    ctx.fill();
    ctx.globalAlpha = this.hoverTextProgress;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.rootX, baseY + offsetY - fontSize / 2);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public isDead(): boolean {
    return this.dying && this.deathProgress >= 1;
  }

  public setSeason(season: Season): void {
    this.season = season;
    if (season === 'winter') {
      this.leaves = [];
    }
  }

  public updateConfig(config: Partial<TreeConfig>): void {
    const needsRegrow =
      config.maxDepth !== undefined && config.maxDepth !== this.config.maxDepth ||
      config.lengthRatio !== undefined ||
      config.initialLength !== undefined;
    Object.assign(this.config, config);
    if (needsRegrow) {
      this.age = 0;
      this.generateBranches();
    }
  }
}
