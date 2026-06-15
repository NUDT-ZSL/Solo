import {
  RenderData,
  TreeNode,
  TreeBranch,
  MemoryCrystal,
  Particle,
  PlayerState,
  GameState,
} from './types';

const BG_TOP = '#1A0B2E';
const BG_BOTTOM = '#0B1A2E';
const TREE_COLOR = '#FFB347';
const TREE_GLOW = 'rgba(255, 179, 71, 0.3)';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dreamscapeClickAnim: number = 0;
  private lastDreamscapeClicks: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(data: RenderData): void {
    const { canvasWidth, canvasHeight, cameraY, time, gameState } = data;

    if (gameState.phase === 'dreamscape') {
      this.renderDreamscape(canvasWidth, canvasHeight, time, gameState);
      return;
    }

    this.drawBackground(canvasWidth, canvasHeight, cameraY, time);

    this.ctx.save();
    this.ctx.translate(0, -cameraY);

    this.drawBranches(data.branches, time, cameraY, canvasHeight);
    this.drawNodes(data.nodes, time, cameraY, canvasHeight);
    this.drawCrystals(data.crystals, time);
    this.drawTrail(data.player);
    this.drawPlayer(data.player, time);
    this.drawParticles(data.particles);

    this.ctx.restore();

    this.drawUI(gameState, canvasWidth);
    this.drawRedFlash(gameState, canvasWidth, canvasHeight);
    this.drawStormOverlay(data.particles, time, canvasWidth, canvasHeight, gameState);
    this.drawTransitionOverlay(gameState, canvasWidth, canvasHeight);
  }

  private drawBackground(w: number, h: number, cameraY: number, time: number): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h * 0.5, Math.max(w, h));
    grad.addColorStop(0, BG_TOP);
    grad.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 97 + time * 8) % (w + 100)) - 50;
      const y = ((i * 53 - cameraY * 0.1) % (h + 100)) - 50;
      const r = 2 + (i % 4);
      ctx.fillStyle = TREE_COLOR;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBranches(
    branches: TreeBranch[],
    time: number,
    cameraY: number,
    screenH: number
  ): void {
    const ctx = this.ctx;
    const topY = cameraY - 50;
    const bottomY = cameraY + screenH + 50;

    const visible = branches.filter((b) => {
      const from = b.curvePoints[0];
      const to = b.curvePoints[b.curvePoints.length - 1];
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      return maxY >= topY && minY <= bottomY;
    });

    for (const branch of visible) {
      const pulse = 0.65 + Math.sin(time * 2 + branch.id.charCodeAt(0)) * 0.15;
      const alpha = pulse * branch.shrinkFactor;

      ctx.save();
      ctx.strokeStyle = TREE_COLOR;
      ctx.globalAlpha = alpha * 0.35;
      ctx.lineWidth = branch.thickness * 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = TREE_GLOW;
      ctx.shadowBlur = 15;

      this.drawCurvePath(branch.curvePoints);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.lineWidth = branch.thickness;
      ctx.shadowBlur = 0;
      this.drawCurvePath(branch.curvePoints);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCurvePath(points: { x: number; y: number }[]): void {
    const ctx = this.ctx;
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
  }

  private drawNodes(
    nodes: TreeNode[],
    time: number,
    cameraY: number,
    screenH: number
  ): void {
    const ctx = this.ctx;
    const topY = cameraY - 50;
    const bottomY = cameraY + screenH + 50;

    const visible = nodes.filter((n) => n.position.y >= topY && n.position.y <= bottomY);

    for (const node of visible) {
      const pulse = 0.6 + Math.sin(time * 3 + node.depth) * 0.2;
      const size = node.isRoot ? 12 : (node.explored ? 5 : 7);

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = TREE_GLOW;
      ctx.shadowBlur = node.explored ? 8 : 15;
      ctx.fillStyle = TREE_COLOR;
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (!node.explored) {
        ctx.globalAlpha = 0.4 * pulse;
        ctx.strokeStyle = TREE_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, size + 4 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCrystals(crystals: MemoryCrystal[], time: number): void {
    const ctx = this.ctx;

    for (const c of crystals) {
      if (c.collected) {
        const t = c.collectProgress;
        const scale = 1 + t * 0.5;
        const alpha = 1 - t;
        const r = c.radius * scale;

        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 30 * scale;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.position.x, c.position.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      const pulse = 0.7 + Math.sin(time * 3 + c.rotation) * 0.3;
      const floatY = Math.sin(time * 2 + c.rotation * 2) * 3;

      ctx.save();
      ctx.translate(c.position.x, c.position.y + floatY);
      ctx.rotate(c.rotation);

      ctx.globalAlpha = 0.4 * pulse;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius + 5 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.radius);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * pulse})`);
      grad.addColorStop(0.5, `${c.color}cc`);
      grad.addColorStop(1, `${c.color}55`);
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = 25;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 * pulse;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(-c.radius * 0.3, -c.radius * 0.3, c.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawTrail(player: PlayerState): void {
    const ctx = this.ctx;

    for (let i = 0; i < player.trail.length - 1; i++) {
      const curr = player.trail[i];
      const next = player.trail[i + 1];
      const t = curr.life / 1.5;
      const alpha = t * 0.6;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3 * t + 1;
      ctx.lineCap = 'round';
      ctx.shadowColor = TREE_COLOR;
      ctx.shadowBlur = 10 * t;

      ctx.beginPath();
      ctx.moveTo(curr.position.x, curr.position.y);
      ctx.lineTo(next.position.x, next.position.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPlayer(player: PlayerState, time: number): void {
    const ctx = this.ctx;
    const { x, y } = player.position;

    ctx.save();
    ctx.translate(x, y);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 2;
      const r = 12 + Math.sin(time * 3 + i) * 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;

      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = TREE_COLOR;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      if (p.type === 'storm') continue;

      const t = p.life / p.maxLife;
      const alpha = t;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawUI(gameState: GameState, w: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#FFB347';
    ctx.shadowColor = '#FFB347';
    ctx.shadowBlur = 15;
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillText(`◆ ${gameState.totalCrystalsCollected}`, 24, 24);

    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#9B59B6';
    ctx.shadowColor = '#9B59B6';
    ctx.shadowBlur = 10;
    ctx.fillText(`记忆水晶`, 24, 60);

    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#3498DB';
    ctx.shadowColor = '#3498DB';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'right';
    ctx.fillText(`✦ ${gameState.nodesExplored}`, w - 24, 24);

    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#3498DB';
    ctx.shadowBlur = 10;
    ctx.fillText(`探索节点`, w - 24, 60);

    ctx.restore();
  }

  private drawRedFlash(gameState: GameState, w: number, h: number): void {
    if (gameState.redFlashTimer <= 0) return;
    const ctx = this.ctx;
    const alpha = Math.min(0.4, gameState.redFlashTimer / 0.2 * 0.4);

    ctx.save();
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 8;
    ctx.globalAlpha = alpha;
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  private drawStormOverlay(
    particles: Particle[],
    time: number,
    w: number,
    h: number,
    gameState: GameState
  ): void {
    const stormParticles = particles.filter((p) => p.type === 'storm');
    if (stormParticles.length === 0) return;

    const ctx = this.ctx;

    if (gameState.phase === 'storm') {
      const stormProgress = 1 - gameState.stormTimer / 3;
      ctx.save();
      ctx.globalAlpha = 0.15 * Math.sin(stormProgress * Math.PI);
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, '#FFB347');
      grad.addColorStop(0.5, '#9B59B6');
      grad.addColorStop(1, '#3498DB');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    for (const p of stormParticles) {
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawTransitionOverlay(gameState: GameState, w: number, h: number): void {
    if (gameState.phase !== 'transition') return;
    const alpha = Math.min(1, Math.sin(gameState.transitionTimer / 1.5 * Math.PI));

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0B1A2E';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private renderDreamscape(w: number, h: number, time: number, gameState: GameState): void {
    const ctx = this.ctx;

    const grad = ctx.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.5, Math.max(w, h));
    grad.addColorStop(0, '#2D1B4E');
    grad.addColorStop(0.5, '#1A0B2E');
    grad.addColorStop(1, '#0A1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (gameState.dreamscapeTreeClicks !== this.lastDreamscapeClicks) {
      this.dreamscapeClickAnim = 1;
      this.lastDreamscapeClicks = gameState.dreamscapeTreeClicks;
    }
    this.dreamscapeClickAnim = Math.max(0, this.dreamscapeClickAnim - 0.016);

    for (let i = 0; i < 60; i++) {
      const x = ((i * 137 + time * 15) % (w + 60)) - 30;
      const y = ((i * 71) % (h + 60)) - 30 + Math.sin(time + i) * 20;
      const r = 1 + (i % 3);
      const hue = (time * 30 + i * 12) % 360;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
      ctx.shadowColor = `hsl(${hue}, 80%, 70%)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.drawDreamTree(w, h, time);

    ctx.save();
    const timer = 3 - gameState.dreamscapeTimer;
    const floatOffset = Math.sin(timer * 2) * 5;
    ctx.globalAlpha = 0.9 + Math.sin(time * 3) * 0.1;
    ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#FFB347';
    ctx.shadowColor = '#FFB347';
    ctx.shadowBlur = 25;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ 树灵幻境 ✦', w / 2, 80 + floatOffset);

    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#B8A4FF';
    ctx.fillText('点击大树唤醒树灵', w / 2, 125 + floatOffset);

    ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFB347';
    ctx.globalAlpha = 0.6 + Math.sin(time * 2) * 0.3;
    const remaining = Math.ceil(gameState.dreamscapeTimer);
    ctx.fillText(`${remaining}秒后返回...`, w / 2, h - 60);
    ctx.restore();
  }

  private drawDreamTree(w: number, h: number, time: number): void {
    const ctx = this.ctx;
    const baseX = w / 2;
    const baseY = h * 0.85;
    const treeHeight = h * 0.55;
    const clickPulse = 1 + this.dreamscapeClickAnim * 0.3;

    if (this.dreamscapeClickAnim > 0) {
      for (let i = 0; i < 12; i++) {
        const t = (1 - this.dreamscapeClickAnim) + i * 0.02;
        const y = baseY - treeHeight * 0.4 - t * treeHeight * 0.6;
        const x = baseX + Math.sin(t * 8 + i + time * 2) * 80 * (1 - t);
        const r = 4 * (1 - t) + 1;
        const hue = (time * 50 + i * 30) % 360;
        ctx.save();
        ctx.globalAlpha = (1 - t) * this.dreamscapeClickAnim;
        ctx.fillStyle = `hsl(${hue}, 80%, 75%)`;
        ctx.shadowColor = `hsl(${hue}, 80%, 75%)`;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.strokeStyle = '#FFB347';
    ctx.shadowColor = '#FFB347';
    ctx.shadowBlur = 30 * clickPulse;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    const trunkPulse = 1 + Math.sin(time * 2) * 0.05;
    ctx.beginPath();
    ctx.moveTo(baseX - 20 * trunkPulse, baseY);
    ctx.bezierCurveTo(
      baseX - 8, baseY - treeHeight * 0.4,
      baseX + 8, baseY - treeHeight * 0.6,
      baseX, baseY - treeHeight * 0.7
    );
    ctx.lineTo(baseX, baseY - treeHeight * 0.7);
    ctx.bezierCurveTo(
      baseX + 8, baseY - treeHeight * 0.6,
      baseX + 20 * trunkPulse, baseY - treeHeight * 0.4,
      baseX + 20 * trunkPulse, baseY
    );
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFB34755';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();

    ctx.lineWidth = 4;
    const crownPulse = 1 + Math.sin(time * 1.5 + 1) * 0.08 * clickPulse;
    const branches: Array<[number, number, number, number]> = [
      [0, -0.7, -50, -0.95],
      [0, -0.7, 50, -0.95],
      [0, -0.6, -80, -0.8],
      [0, -0.6, 80, -0.8],
      [0, -0.5, -90, -0.65],
      [0, -0.5, 90, -0.65],
      [0, -0.75, 0, -1.0],
    ];

    for (let i = 0; i < branches.length; i++) {
      const [sx, sy, ex, ey] = branches[i];
      const startX = baseX + sx * crownPulse;
      const startY = baseY + treeHeight * sy;
      const endX = baseX + ex * crownPulse;
      const endY = baseY + treeHeight * ey;

      ctx.globalAlpha = 0.8 + Math.sin(time * 2 + i) * 0.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        (startX + endX) / 2 + Math.sin(time + i) * 10,
        (startY + endY) / 2 - 20,
        endX, endY
      );
      ctx.stroke();

      const glowColors = ['#FFB347', '#9B59B6', '#3498DB'];
      const glowColor = glowColors[i % 3];
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 25 * clickPulse;
      ctx.globalAlpha = 0.6 + Math.sin(time * 2.5 + i * 0.7) * 0.4;
      ctx.beginPath();
      ctx.arc(endX, endY, 10 * crownPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let layer = 0; layer < 3; layer++) {
      const radius = (40 + layer * 40) * crownPulse;
      const cy = baseY - treeHeight * 0.85;
      const hueShift = time * 40 + layer * 60;
      ctx.save();
      ctx.globalAlpha = 0.12 * (clickPulse);
      const g = ctx.createRadialGradient(baseX, cy, 0, baseX, cy, radius);
      g.addColorStop(0, `hsl(${(40 + hueShift) % 360}, 80%, 70%)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(baseX, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  isDreamTreeClicked(clickX: number, clickY: number, w: number, h: number): boolean {
    const baseX = w / 2;
    const baseY = h * 0.85;
    const treeHeight = h * 0.55;
    const cx = baseX;
    const cy = baseY - treeHeight * 0.7;
    const dx = clickX - cx;
    const dy = clickY - cy;
    return (dx * dx + dy * dy) < (treeHeight * 0.45) ** 2;
  }
}
