import type {
  Tree,
  ForestResult,
  TreeParticle
} from './ForestGenerator';

const EXPLOSION_DURATION = 0.8;
const GOLD_SPARK_DURATION = 1.0;
const MAX_EXPLOSION_SPEED = 30;

export class ForestRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private forest: ForestResult;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private elapsed: number = 0;
  private paused: boolean = false;
  private running: boolean = false;
  private hoveredTreeId: number | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private dpr: number = 1;
  private onHoverChange?: (dayIndex: number | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    forest: ForestResult,
    onHoverChange?: (dayIndex: number | null) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.forest = forest;
    this.dpr = window.devicePixelRatio || 1;
    this.onHoverChange = onHoverChange;
    this.bindEvents();
    this.resize();
  }

  private bindEvents() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    window.addEventListener('resize', this.resize);
  }

  private unbindEvents() {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.resize);
  }

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.detectHover();
  };

  private handleMouseLeave = () => {
    this.hoveredTreeId = null;
    this.forest.trees.forEach(t => {
      t.hovered = false;
    });
    if (this.onHoverChange) this.onHoverChange(null);
  };

  private detectHover() {
    let found: number | null = null;
    for (let i = this.forest.trees.length - 1; i >= 0; i--) {
      const tree = this.forest.trees[i];
      const crownCX = tree.x;
      const crownCY = tree.baseY - tree.trunkHeight - tree.crownRadiusY * 0.4;
      const dx = this.mouseX - crownCX;
      const dy = this.mouseY - crownCY;
      const rx = tree.crownRadiusX * 1.1;
      const ry = tree.crownRadiusY * 1.1;
      if (rx > 0 && ry > 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        found = i;
        break;
      }
    }
    const newTreeId = found !== null ? this.forest.trees[found].id : null;
    if (newTreeId !== this.hoveredTreeId) {
      this.forest.trees.forEach(t => {
        const wasHovered = t.hovered;
        t.hovered = t.id === newTreeId;
        if (!wasHovered && t.hovered) {
          t.explosionPhase = 0;
          t.ripplePaused = true;
          const cx = t.x;
          const cy = t.baseY - t.trunkHeight - t.crownRadiusY * 0.4;
          t.goldSparks = [];
          for (let s = 0; s < 3; s++) {
            t.goldSparks.push({
              x: cx,
              y: cy,
              vx: 0,
              vy: 0,
              size: 6,
              alpha: 1,
              progress: 0,
              targetX: 20 + s * 30,
              targetY: 20 + s * 20
            });
          }
        }
      });
      this.hoveredTreeId = newTreeId;
      if (this.onHoverChange) {
        this.onHoverChange(found !== null ? this.forest.trees[found].dayIndex : null);
      }
    }
  }

  resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  updateForest(forest: ForestResult) {
    const oldMap = new Map<number, Tree>();
    this.forest.trees.forEach(t => oldMap.set(t.id, t));

    forest.trees.forEach(newTree => {
      const old = oldMap.get(newTree.id);
      if (old) {
        newTree.hovered = old.hovered;
        newTree.explosionPhase = old.explosionPhase;
        newTree.ripplePaused = old.ripplePaused;
        newTree.goldSparks = old.goldSparks;
      }
    });

    this.forest = forest;
    this.detectHover();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.unbindEvents();
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = now;

    if (!this.paused) {
      this.elapsed += dt;
      this.update(dt);
    }
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.forest.trees.forEach(tree => {
      if (!tree.ripplePaused && tree.trunkHeight > 0) {
        tree.ripples.forEach(r => {
          r.y += r.speed * 30 * dt;
          if (r.y > tree.trunkHeight) {
            r.y = 0;
          }
        });
      }

      if (tree.hovered) {
        tree.explosionPhase = Math.min(GOLD_SPARK_DURATION, tree.explosionPhase + dt);

        tree.particles.forEach(p => {
          const tNorm = Math.min(1, tree.explosionPhase / EXPLOSION_DURATION);
          const speedFactor = tNorm < 0.5 ? tNorm * 2 : (1 - tNorm) * 2;
          const speed = speedFactor * MAX_EXPLOSION_SPEED;
          const angle = Math.atan2(p.baseY, p.baseX);
          p.x = p.baseX + Math.cos(angle) * speedFactor * 60 * tNorm;
          p.y = p.baseY + Math.sin(angle) * speedFactor * 60 * tNorm;
          void speed;
        });

        tree.goldSparks.forEach(g => {
          g.progress = Math.min(1, tree.explosionPhase / GOLD_SPARK_DURATION);
          const t = g.progress;
          const easeT = t * t * (3 - 2 * t);
          const originX = tree.x;
          const originY = tree.baseY - tree.trunkHeight - tree.crownRadiusY * 0.4;
          g.x = originX + (g.targetX - originX) * easeT;
          g.y = originY + (g.targetY - originY) * easeT;
          g.alpha = 1 - t;
        });

        if (tree.explosionPhase >= EXPLOSION_DURATION) {
          tree.hovered = false;
          tree.ripplePaused = false;
          tree.goldSparks = [];
          tree.particles.forEach(p => {
            p.x = p.baseX;
            p.y = p.baseY;
            p.vx = 0;
            p.vy = 0;
          });
        }
      } else {
        tree.particles.forEach(p => {
          p.breathePhase += dt * 1.5;
          const breathe = Math.sin(p.breathePhase) * 0.15;
          p.x = p.baseX * (1 + breathe);
          p.y = p.baseY * (1 + breathe);
        });
        tree.goldSparks = [];
      }
    });
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(w, h);
    this.drawGround(w, h);
    this.forest.trees.forEach(tree => this.drawTree(tree));
  }

  private drawBackground(w: number, h: number) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  private drawGround(w: number, h: number) {
    const ctx = this.ctx;
    const groundY = h * 0.85;

    this.forest.trees.forEach(tree => {
      const glow = ctx.createRadialGradient(
        tree.x, groundY, 5, tree.x, groundY, 200
      );
      glow.addColorStop(0, 'rgba(255, 220, 120, 0.18)');
      glow.addColorStop(1, 'rgba(30, 80, 30, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, Math.max(0, groundY - 200), w, 300);
    });

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, this.forest.groundColorStart);
    groundGrad.addColorStop(1, this.forest.groundColorEnd);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    const farGrad = ctx.createLinearGradient(0, groundY - 100, 0, groundY);
    farGrad.addColorStop(0, 'rgba(20, 50, 30, 0)');
    farGrad.addColorStop(1, this.hexToRgba(this.forest.groundColorStart, 0.2));
    ctx.fillStyle = farGrad;
    ctx.fillRect(0, Math.max(0, groundY - 100), w, 100);
  }

  private drawTree(tree: Tree) {
    const ctx = this.ctx;
    const crownCX = tree.x;
    const crownCY = tree.baseY - tree.trunkHeight - tree.crownRadiusY * 0.4;

    const shadow = ctx.createRadialGradient(
      tree.x, tree.baseY, 0, tree.x, tree.baseY, Math.max(1, tree.crownRadiusX * 1.5)
    );
    shadow.addColorStop(0, 'rgba(0,0,0,0.35)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(
      tree.x, tree.baseY + 2,
      Math.max(1, tree.crownRadiusX * 1.3),
      Math.max(1, tree.crownRadiusY * 0.25),
      0, 0, Math.PI * 2
    );
    ctx.fill();

    this.drawTrunk(tree);
    this.drawCrown(tree, crownCX, crownCY);
  }

  private drawTrunk(tree: Tree) {
    const ctx = this.ctx;
    const leftX = tree.x - tree.trunkWidth / 2;
    const rightX = tree.x + tree.trunkWidth / 2;
    const topY = tree.baseY - tree.trunkHeight;
    const topW = tree.trunkWidth * 0.5;

    const grad = ctx.createLinearGradient(0, tree.baseY, 0, topY);
    grad.addColorStop(0, tree.trunkBottomColor);
    grad.addColorStop(1, tree.trunkTopColor);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(leftX, tree.baseY);
    ctx.lineTo(rightX, tree.baseY);
    ctx.lineTo(tree.x + topW / 2, topY);
    ctx.lineTo(tree.x - topW / 2, topY);
    ctx.closePath();
    ctx.fill();

    tree.ripples.forEach(r => {
      const rippleY = tree.baseY - r.y;
      const rippleW = tree.trunkWidth * 0.8 * (0.6 + ((tree.trunkHeight > 0 ? r.y / tree.trunkHeight : 0) * 0.4));
      const color = tree.ripplePaused ? '#FFFFFF' : tree.mainColor;
      const alpha = tree.ripplePaused ? 0.95 : r.alpha;

      const glowGrad = ctx.createRadialGradient(
        tree.x, rippleY, 0, tree.x, rippleY, Math.max(1, rippleW)
      );
      glowGrad.addColorStop(0, this.hexToRgba(color, alpha));
      glowGrad.addColorStop(1, this.hexToRgba(color, 0));
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(tree.x, rippleY, Math.max(1, rippleW), r.size * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.ellipse(tree.x, rippleY, Math.max(1, rippleW * 0.4), r.size, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawCrown(tree: Tree, cx: number, cy: number) {
    const ctx = this.ctx;
    const maxRadius = Math.max(tree.crownRadiusX, tree.crownRadiusY, 1);

    if (!tree.hovered) {
      const crownGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      crownGrad.addColorStop(0, this.hexToRgba(tree.mainColor, 0.35));
      crownGrad.addColorStop(0.7, this.hexToRgba(tree.mainColor, 0.12));
      crownGrad.addColorStop(1, this.hexToRgba(tree.mainColor, 0));
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.ellipse(
        cx, cy,
        Math.max(1, tree.crownRadiusX * 1.15),
        Math.max(1, tree.crownRadiusY * 1.15),
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }

    tree.particles.forEach((p: TreeParticle) => {
      const px = cx + p.x;
      const py = cy + p.y;
      const size = p.size;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, size * 2);
      pg.addColorStop(0, this.hexToRgba(p.color, p.alpha));
      pg.addColorStop(1, this.hexToRgba(p.color, 0));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hexToRgba(p.color, Math.min(1, p.alpha * 1.2));
      ctx.beginPath();
      ctx.arc(px, py, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    tree.goldSparks.forEach(g => {
      const gx = g.x;
      const gy = g.y;
      const size = g.size;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 3);
      gg.addColorStop(0, 'rgba(255, 230, 120, ' + g.alpha + ')');
      gg.addColorStop(0.5, 'rgba(255, 200, 80, ' + (g.alpha * 0.5) + ')');
      gg.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(gx, gy, size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 200, ' + g.alpha + ')';
      ctx.beginPath();
      ctx.arc(gx, gy, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
