import {
  TreeData, TreeType, Season, LeafParticle,
  SEASON_COLORS, LEAF_COLORS,
} from './types';

export class TreeSystem {
  trees: TreeData[] = [];
  private nextId = 0;

  addTree(x: number, y: number, type: TreeType): TreeData {
    const tree: TreeData = {
      id: this.nextId++,
      type,
      x,
      y,
      growth: 0.05,
      maxHeight: type === 'pine' ? 120 : type === 'oak' ? 100 : 90,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.8 + Math.random() * 0.6,
      age: 0,
      leafParticles: [],
      leafSpawnTimer: 0,
    };
    this.trees.push(tree);
    return tree;
  }

  removeTree(id: number) {
    this.trees = this.trees.filter(t => t.id !== id);
  }

  clear() {
    this.trees = [];
    this.nextId = 0;
  }

  update(dt: number, season: Season, windStrength: number) {
    const growthRate = season === 'spring' ? 0.012 : season === 'summer' ? 0.008 : season === 'autumn' ? 0.004 : 0.002;

    for (const tree of this.trees) {
      tree.age += dt;
      if (tree.growth < 1) {
        tree.growth = Math.min(1, tree.growth + growthRate * dt);
      }
      tree.swayPhase += tree.swaySpeed * dt * (1 + windStrength * 0.5);

      this.updateLeafParticles(tree, dt, season, windStrength);
    }
  }

  private updateLeafParticles(tree: TreeData, dt: number, season: Season, windStrength: number) {
    const leafFallRate = season === 'autumn' ? 0.06 : season === 'winter' ? 0.02 : season === 'spring' ? 0.015 : 0.008;
    tree.leafSpawnTimer += dt;

    const spawnInterval = 1 / (leafFallRate * (1 + windStrength));
    if (tree.leafSpawnTimer >= spawnInterval && tree.growth > 0.3) {
      tree.leafSpawnTimer = 0;
      this.spawnLeaf(tree, season, windStrength);
    }

    for (let i = tree.leafParticles.length - 1; i >= 0; i--) {
      const p = tree.leafParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 8 * dt;
      p.vx += Math.sin(p.rotation) * 2 * dt;
      p.rotation += p.rotationSpeed * dt;
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        tree.leafParticles.splice(i, 1);
      }
    }
  }

  private spawnLeaf(tree: TreeData, season: Season, windStrength: number) {
    const height = tree.maxHeight * tree.growth;
    const colors = LEAF_COLORS[season][tree.type];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle: LeafParticle = {
      x: tree.x + (Math.random() - 0.5) * 30 * tree.growth,
      y: tree.y - height * (0.5 + Math.random() * 0.4),
      vx: (Math.random() - 0.3) * 20 * (1 + windStrength),
      vy: -5 + Math.random() * 10,
      alpha: 0.9,
      color,
      size: 3 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 3,
      life: 0,
      maxLife: 3 + Math.random() * 3,
    };
    tree.leafParticles.push(particle);
  }

  getTreeById(id: number): TreeData | undefined {
    return this.trees.find(t => t.id === id);
  }

  getTreePosition(treeId: number): { x: number; y: number } | null {
    const tree = this.getTreeById(treeId);
    if (!tree) return null;
    return { x: tree.x, y: tree.y };
  }

  draw(ctx: CanvasRenderingContext2D, season: Season, time: number) {
    const sorted = [...this.trees].sort((a, b) => a.y - b.y);
    for (const tree of sorted) {
      this.drawTree(ctx, tree, season, time);
      this.drawLeafParticles(ctx, tree);
    }
  }

  private drawTree(ctx: CanvasRenderingContext2D, tree: TreeData, season: Season, time: number) {
    const height = tree.maxHeight * tree.growth;
    const sway = Math.sin(tree.swayPhase + time * 0.001) * 3 * tree.growth;
    const colors = SEASON_COLORS[season][tree.type];

    ctx.save();
    ctx.translate(tree.x, tree.y);

    this.drawTrunk(ctx, tree, height, sway, colors.trunk);

    switch (tree.type) {
      case 'pine': this.drawPine(ctx, tree, height, sway, colors.foliage); break;
      case 'oak': this.drawOak(ctx, tree, height, sway, colors.foliage); break;
      case 'cherry': this.drawCherry(ctx, tree, height, sway, colors.foliage, season); break;
    }

    this.drawGlow(ctx, tree, height, sway, colors.foliage[0]);

    ctx.restore();
  }

  private drawTrunk(ctx: CanvasRenderingContext2D, tree: TreeData, height: number, sway: number, color: string) {
    const trunkW = 6 + tree.growth * 8;
    ctx.beginPath();
    ctx.moveTo(-trunkW / 2, 0);
    ctx.lineTo(-trunkW / 3 + sway * 0.3, -height * 0.6);
    ctx.lineTo(trunkW / 3 + sway * 0.3, -height * 0.6);
    ctx.lineTo(trunkW / 2, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawPine(ctx: CanvasRenderingContext2D, tree: TreeData, height: number, sway: number, foliageColors: string[]) {
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const layerY = -height * (0.3 + i * 0.25);
      const layerW = (35 - i * 8) * tree.growth;
      const layerH = 35 * tree.growth;
      const offset = sway * (0.5 + i * 0.2);

      ctx.beginPath();
      ctx.moveTo(offset, layerY - layerH);
      ctx.lineTo(-layerW + offset * 0.8, layerY);
      ctx.lineTo(layerW + offset * 0.8, layerY);
      ctx.closePath();
      ctx.fillStyle = foliageColors[i % foliageColors.length];
      ctx.fill();
    }
  }

  private drawOak(ctx: CanvasRenderingContext2D, tree: TreeData, height: number, sway: number, foliageColors: string[]) {
    const cx = sway * 0.6;
    const cy = -height * 0.7;
    const r = 28 * tree.growth;

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + tree.swayPhase * 0.1;
      const bx = cx + Math.cos(angle) * r * 0.5;
      const by = cy + Math.sin(angle) * r * 0.3;
      const br = r * (0.6 + Math.random() * 0.15);

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = foliageColors[i % foliageColors.length];
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = foliageColors[0];
    ctx.fill();
  }

  private drawCherry(ctx: CanvasRenderingContext2D, tree: TreeData, height: number, sway: number, foliageColors: string[], season: Season) {
    const cx = sway * 0.5;
    const cy = -height * 0.75;
    const r = 30 * tree.growth;

    const branches = 4;
    for (let i = 0; i < branches; i++) {
      const angle = -Math.PI * 0.8 + (i / (branches - 1)) * Math.PI * 0.6;
      const bLen = r * 1.2;
      const endX = cx + Math.cos(angle) * bLen;
      const endY = cy + Math.sin(angle) * bLen * 0.5;

      ctx.beginPath();
      ctx.moveTo(sway * 0.3, -height * 0.55);
      ctx.quadraticCurveTo(
        cx + Math.cos(angle) * bLen * 0.5,
        cy + Math.sin(angle) * bLen * 0.25,
        endX, endY
      );
      ctx.lineWidth = 2 * tree.growth;
      ctx.strokeStyle = SEASON_COLORS[season].cherry.trunk;
      ctx.stroke();

      for (let j = 0; j < 3; j++) {
        const fa = angle + (j - 1) * 0.5;
        const fr = r * (0.3 + j * 0.1);
        ctx.beginPath();
        ctx.arc(
          endX + Math.cos(fa) * fr * 0.3,
          endY + Math.sin(fa) * fr * 0.3,
          fr, 0, Math.PI * 2
        );
        ctx.fillStyle = foliageColors[(i + j) % foliageColors.length];
        ctx.fill();
      }
    }
  }

  private drawGlow(ctx: CanvasRenderingContext2D, tree: TreeData, height: number, sway: number, color: string) {
    if (tree.growth < 0.2) return;
    const cx = sway * 0.5;
    const cy = -height * 0.7;
    const r = 25 * tree.growth;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private drawLeafParticles(ctx: CanvasRenderingContext2D, tree: TreeData) {
    for (const p of tree.leafParticles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha * 0.8;

      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      if (p.alpha > 0.3) {
        const trailGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
        trailGrad.addColorStop(0, p.color + '20');
        trailGrad.addColorStop(1, p.color + '00');
        ctx.beginPath();
        ctx.arc(-p.vx * 0.02, -p.vy * 0.02, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = trailGrad;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}
